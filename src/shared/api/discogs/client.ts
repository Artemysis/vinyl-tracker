import { HttpClient } from '../http'
import { env } from '../../config/env'
import type {
  DiscogsCollectionFoldersResponse,
  DiscogsCollectionItemsByReleaseResponse,
  DiscogsCollectionNoteFieldsResponse,
  DiscogsCollectionReleasesResponse,
  DiscogsDatabaseSearchResponse,
  DiscogsIdentity,
  DiscogsRelease,
} from './types'

const DISCOGS_API_BASE_URL = 'https://api.discogs.com/'

export type DiscogsClientOptions = {
  token?: string
  userAgent?: string
}

export class DiscogsClient {
  private readonly http: HttpClient

  constructor(opts: DiscogsClientOptions = {}) {
    const token = opts.token ?? env.discogsToken
    const userAgent = opts.userAgent ?? env.userAgent

    this.http = new HttpClient(DISCOGS_API_BASE_URL, {
      'User-Agent': userAgent,
      ...(token ? { Authorization: `Discogs token=${token}` } : {}),
    })
  }

  public identity(signal?: AbortSignal): Promise<DiscogsIdentity> {
    return this.http.requestJson({ method: 'GET', path: '/oauth/identity', signal })
  }

  public searchDatabase(
    args: {
      q: string
      type?: 'release' | 'master' | 'artist' | 'label'
      page?: number
      perPage?: number
      format?: string
    },
    signal?: AbortSignal,
  ): Promise<DiscogsDatabaseSearchResponse> {
    return this.http.requestJson({
      method: 'GET',
      path: '/database/search',
      query: {
        q: args.q,
        type: args.type,
        format: args.format,
        page: args.page ?? 1,
        per_page: args.perPage ?? 25,
      },
      signal,
    })
  }

  public getRelease(releaseId: number, signal?: AbortSignal): Promise<DiscogsRelease> {
    return this.http.requestJson({ method: 'GET', path: `/releases/${releaseId}`, signal })
  }

  public getCollectionFolders(username: string, signal?: AbortSignal): Promise<DiscogsCollectionFoldersResponse> {
    return this.http.requestJson({ method: 'GET', path: `/users/${username}/collection/folders`, signal })
  }

  public getCollectionNoteFields(username: string, signal?: AbortSignal): Promise<DiscogsCollectionNoteFieldsResponse> {
    return this.http.requestJson({ method: 'GET', path: `/users/${username}/collection/fields`, signal })
  }

  public getCollectionReleases(
    args: { username: string; folderId: number; page?: number; perPage?: number; sort?: string; sortOrder?: 'asc' | 'desc' },
    signal?: AbortSignal,
  ): Promise<DiscogsCollectionReleasesResponse> {
    return this.http.requestJson({
      method: 'GET',
      path: `/users/${args.username}/collection/folders/${args.folderId}/releases`,
      query: {
        page: args.page ?? 1,
        per_page: args.perPage ?? 50,
        sort: args.sort,
        sort_order: args.sortOrder,
      },
      signal,
    })
  }

  public getCollectionItemsByRelease(
    args: { username: string; releaseId: number; page?: number; perPage?: number },
    signal?: AbortSignal,
  ): Promise<DiscogsCollectionItemsByReleaseResponse> {
    return this.http.requestJson({
      method: 'GET',
      path: `/users/${args.username}/collection/releases/${args.releaseId}`,
      query: { page: args.page ?? 1, per_page: args.perPage ?? 50 },
      signal,
    })
  }

  public addReleaseToCollection(
    args: { username: string; folderId: number; releaseId: number },
    signal?: AbortSignal,
  ): Promise<unknown> {
    return this.ensureUniqueAndAdd(args, signal)
  }

  private async ensureUniqueAndAdd(
    args: { username: string; folderId: number; releaseId: number },
    signal?: AbortSignal,
  ): Promise<unknown> {
    const existsInFolder = await this.hasReleaseInFolder(args, signal)
    if (existsInFolder) {
      throw new Error('Этот релиз уже есть в выбранной папке.')
    }

    return this.http.requestJson({
      method: 'POST',
      path: `/users/${args.username}/collection/folders/${args.folderId}/releases/${args.releaseId}`,
      signal,
    })
  }

  private async hasReleaseInFolder(
    args: { username: string; folderId: number; releaseId: number },
    signal?: AbortSignal,
  ): Promise<boolean> {
    let page = 1
    const perPage = 50

    while (true) {
      const collection = await this.getCollectionItemsByRelease(
        { username: args.username, releaseId: args.releaseId, page, perPage },
        signal,
      )
      const hasMatch = collection.releases.some((item) => item.folder_id === args.folderId)
      if (hasMatch) return true

      const totalPages = collection.pagination?.pages ?? 1
      if (page >= totalPages) return false
      page += 1
    }
  }

  public editCollectionInstance(
    args: {
      username: string
      folderId: number
      releaseId: number
      instanceId: number
      rating?: number
      notes?: Array<{ field_id: number; value: string }>
      newFolderId?: number
    },
    signal?: AbortSignal,
  ): Promise<unknown> {
    return this.http.requestJson({
      method: 'POST',
      path: `/users/${args.username}/collection/folders/${args.folderId}/releases/${args.releaseId}/instances/${args.instanceId}`,
      body: {
        ...(args.rating === undefined ? {} : { rating: args.rating }),
        ...(args.notes === undefined ? {} : { notes: args.notes }),
        ...(args.newFolderId === undefined ? {} : { folder_id: args.newFolderId }),
      },
      signal,
    })
  }

  public createCollectionFolder(
    args: { username: string; name: string },
    signal?: AbortSignal,
  ): Promise<unknown> {
    return this.http.requestJson({
      method: 'POST',
      path: `/users/${args.username}/collection/folders`,
      body: { name: args.name },
      signal,
    })
  }

  public renameCollectionFolder(
    args: { username: string; folderId: number; name: string },
    signal?: AbortSignal,
  ): Promise<unknown> {
    return this.http.requestJson({
      method: 'POST',
      path: `/users/${args.username}/collection/folders/${args.folderId}`,
      body: { name: args.name },
      signal,
    })
  }

  public deleteCollectionFolder(
    args: { username: string; folderId: number },
    signal?: AbortSignal,
  ): Promise<void> {
    return this.http.requestJson({
      method: 'DELETE',
      path: `/users/${args.username}/collection/folders/${args.folderId}`,
      signal,
    })
  }

  public deleteCollectionInstance(
    args: { username: string; folderId: number; releaseId: number; instanceId: number },
    signal?: AbortSignal,
  ): Promise<void> {
    return this.deleteCollectionInstanceWithFallback(args, signal)
  }

  private async deleteCollectionInstanceWithFallback(
    args: { username: string; folderId: number; releaseId: number; instanceId: number },
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      await this.http.requestJson({
        method: 'DELETE',
        path: `/users/${args.username}/collection/folders/${args.folderId}/releases/${args.releaseId}/instances/${args.instanceId}`,
        signal,
      })
      return
    } catch {
      const resolved = await this.findInstanceByIdInRelease(args, signal)
      const fallbackResolved = resolved ?? (await this.findInstanceAcrossFolders(args.username, args.instanceId, signal))
      if (!resolved) {
        if (!fallbackResolved) {
          throw new Error('Экземпляр уже удален или не найден в коллекции.')
        }
      }

      await this.http.requestJson({
        method: 'DELETE',
        path: `/users/${args.username}/collection/folders/${(fallbackResolved ?? resolved)!.folderId}/releases/${(fallbackResolved ?? resolved)!.releaseId}/instances/${args.instanceId}`,
        signal,
      })
    }
  }

  private async findInstanceByIdInRelease(
    args: { username: string; releaseId: number; instanceId: number },
    signal?: AbortSignal,
  ): Promise<{ folderId: number; releaseId: number } | null> {
    let page = 1
    const perPage = 50

    while (true) {
      const collection = await this.getCollectionItemsByRelease(
        { username: args.username, releaseId: args.releaseId, page, perPage },
        signal,
      )

      const found = collection.releases.find((item) => item.instance_id === args.instanceId)
      if (found) {
        return {
          folderId: found.folder_id,
          releaseId: found.basic_information.id,
        }
      }

      const totalPages = collection.pagination?.pages ?? 1
      if (page >= totalPages) return null
      page += 1
    }
  }

  private async findInstanceAcrossFolders(
    username: string,
    instanceId: number,
    signal?: AbortSignal,
  ): Promise<{ folderId: number; releaseId: number } | null> {
    const folders = await this.getCollectionFolders(username, signal)

    for (const folder of folders.folders) {
      let page = 1
      const perPage = 50

      while (true) {
        const collection = await this.getCollectionReleases(
          { username, folderId: folder.id, page, perPage, sort: 'added', sortOrder: 'desc' },
          signal,
        )
        const found = collection.releases.find((item) => item.instance_id === instanceId)
        if (found) {
          return { folderId: found.folder_id, releaseId: found.id }
        }

        const totalPages = collection.pagination?.pages ?? 1
        if (page >= totalPages) break
        page += 1
      }
    }

    return null
  }
}

