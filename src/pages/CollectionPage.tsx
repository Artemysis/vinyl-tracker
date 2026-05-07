import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { DiscogsCollectionFolder, DiscogsCollectionRelease } from '../shared/api/discogs'
import { Alert, Badge, Button, Card, InputField, Spinner } from '../shared/ui'
import styles from './CollectionPage.module.css'
import { useMyRecordStore } from '../entities/myRecord'

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ok' }

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

function isSystemFolder(folder: DiscogsCollectionFolder): boolean {
  const name = normalize(folder.name)
  return folder.id <= 0 || name === 'all' || name === 'uncategorized'
}

export default function CollectionPage() {
  const { client, username, isAuthed } = useAuth()
  const myRecords = useMyRecordStore((s) => s.records)
  const addMyRecord = useMyRecordStore((s) => s.add)
  const updateMyRecord = useMyRecordStore((s) => s.update)
  const removeMyRecord = useMyRecordStore((s) => s.remove)

  const [folders, setFolders] = useState<DiscogsCollectionFolder[]>([])
  const [folderId, setFolderId] = useState<number | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderBusy, setFolderBusy] = useState(false)
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [folderActionBusyId, setFolderActionBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [myDraft, setMyDraft] = useState<{
    title: string
    artist: string
    year: string
    description: string
    folderId: number
    coverDataUrl?: string
  }>({
    title: '',
    artist: '',
    year: '',
    description: '',
    folderId: 0,
    coverDataUrl: undefined,
  })

  const [filter, setFilter] = useState('')
  const filterN = useMemo(() => normalize(filter), [filter])

  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [items, setItems] = useState<DiscogsCollectionRelease[]>([])
  const [state, setState] = useState<LoadState>({ kind: 'idle' })

  // Cache pages in-memory to enable "smart search" without loading whole collection at once
  const [pageCache] = useState(() => new Map<number, DiscogsCollectionRelease[]>())
  const [deep, setDeep] = useState<{
    status: 'idle' | 'running' | 'done' | 'cancelled' | 'error'
    scannedPages: number
    totalPages: number
    matches: DiscogsCollectionRelease[]
    error?: string
  }>({ status: 'idle', scannedPages: 0, totalPages: 0, matches: [] })

  const deepAbortRef = useRef<AbortController | null>(null)

  const userFolders = useMemo(() => folders.filter((f) => !isSystemFolder(f)), [folders])

  const refreshFolders = useCallback(
    async (signal?: AbortSignal): Promise<DiscogsCollectionFolder[]> => {
      if (!isAuthed || !username) return []
      const res = await client.getCollectionFolders(username, signal)
      setFolders(res.folders)
      return res.folders
    },
    [client, isAuthed, username],
  )

  useEffect(() => {
    if (!isAuthed || !username) return
    const ac = new AbortController()
    refreshFolders(ac.signal)
      .then((res) => {
        const visible = res.filter((f) => !isSystemFolder(f))
        setFolderId(visible[0]?.id ?? null)
        setMyDraft((prev) => {
          const hasDraftFolder = visible.some((f) => f.id === prev.folderId)
          return { ...prev, folderId: hasDraftFolder ? prev.folderId : (visible[0]?.id ?? 0) }
        })
      })
      .catch(() => {
        // ignore folder load failure; releases endpoint still works for folderId=1 if available
      })
    return () => ac.abort()
  }, [isAuthed, username, refreshFolders])

  async function handleCreateFolder() {
    if (!isAuthed || !username) return
    const name = newFolderName.trim()
    if (name.length < 2) {
      setToast('Имя папки должно быть минимум 2 символа')
      window.setTimeout(() => setToast(null), 2500)
      return
    }
    setFolderBusy(true)
    try {
      await client.createCollectionFolder({ username, name })
      const res = await refreshFolders()
      const created = res.find((f) => f.name.toLowerCase() === name.toLowerCase())
      if (created) setFolderId(created.id)
      setNewFolderName('')
      setToast('Папка создана')
      window.setTimeout(() => setToast(null), 2200)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setToast(`Ошибка: ${msg}`)
      window.setTimeout(() => setToast(null), 3500)
    } finally {
      setFolderBusy(false)
    }
  }

  function startRenameFolder(folder: DiscogsCollectionFolder) {
    setEditingFolderId(folder.id)
    setEditingFolderName(folder.name)
  }

  async function handleRenameFolder(folderIdToRename: number) {
    if (!isAuthed || !username) return
    if (folderIdToRename <= 0) return
    const name = editingFolderName.trim()
    if (name.length < 2) {
      setToast('Имя папки должно быть минимум 2 символа')
      window.setTimeout(() => setToast(null), 2500)
      return
    }
    setFolderActionBusyId(folderIdToRename)
    try {
      await client.renameCollectionFolder({ username, folderId: folderIdToRename, name })
      await refreshFolders()
      setEditingFolderId(null)
      setEditingFolderName('')
      setToast('Название папки обновлено')
      window.setTimeout(() => setToast(null), 2200)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setToast(`Ошибка: ${msg}`)
      window.setTimeout(() => setToast(null), 3500)
    } finally {
      setFolderActionBusyId(null)
    }
  }

  async function handleDeleteFolder(folderIdToDelete: number) {
    if (!isAuthed || !username) return
    if (folderIdToDelete <= 0) {
      setToast('Папку All удалять нельзя')
      window.setTimeout(() => setToast(null), 2500)
      return
    }
    setFolderActionBusyId(folderIdToDelete)
    try {
      await client.deleteCollectionFolder({ username, folderId: folderIdToDelete })
      const nextFolders = await refreshFolders()
      if (folderId === folderIdToDelete) {
        const visible = nextFolders.filter((f) => !isSystemFolder(f))
        setFolderId(visible[0]?.id ?? null)
      }
      setToast('Папка удалена')
      window.setTimeout(() => setToast(null), 2200)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setToast(`Ошибка удаления: ${msg}`)
      window.setTimeout(() => setToast(null), 3500)
    } finally {
      setFolderActionBusyId(null)
    }
  }

  async function handleMoveToFolder(item: DiscogsCollectionRelease, nextFolderId: number) {
    if (!isAuthed || !username) return
    try {
      await client.editCollectionInstance({
        username,
        folderId: item.folder_id,
        releaseId: item.id,
        instanceId: item.instance_id,
        newFolderId: nextFolderId,
      })
      // refresh current page
      pageCache.delete(page)
      const res = await client.getCollectionReleases({
        username,
        folderId: folderId ?? item.folder_id,
        page,
        perPage: 50,
        sort: 'added',
        sortOrder: 'desc',
      })
      setPages(res.pagination.pages)
      pageCache.set(page, res.releases)
      setItems(res.releases)
      setToast('Перемещено')
      window.setTimeout(() => setToast(null), 1800)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setToast(`Ошибка: ${msg}`)
      window.setTimeout(() => setToast(null), 3500)
    }
  }

  async function handleRemoveFromCollection(item: DiscogsCollectionRelease) {
    if (!isAuthed || !username) return
    try {
      await client.deleteCollectionInstance({
        username,
        folderId: item.folder_id,
        releaseId: item.id,
        instanceId: item.instance_id,
      })
      pageCache.delete(page)
      const res = await client.getCollectionReleases({
        username,
        folderId: folderId ?? item.folder_id,
        page,
        perPage: 50,
        sort: 'added',
        sortOrder: 'desc',
      })
      setPages(res.pagination.pages)
      pageCache.set(page, res.releases)
      setItems(res.releases)
      setToast('Удалено из коллекции')
      window.setTimeout(() => setToast(null), 1800)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setToast(`Ошибка: ${msg}`)
      window.setTimeout(() => setToast(null), 3500)
    }
  }

  useEffect(() => {
    setPage(1)
    pageCache.clear()
    setItems([])
    setDeep({ status: 'idle', scannedPages: 0, totalPages: 0, matches: [] })
    deepAbortRef.current?.abort()
    deepAbortRef.current = null
  }, [folderId, pageCache])

  useEffect(() => {
    if (!isAuthed || !username || !folderId) return
    const ac = new AbortController()
    setState({ kind: 'loading' })

    const cached = pageCache.get(page)
    if (cached) {
      setItems(cached)
      setState({ kind: 'ok' })
      return () => ac.abort()
    }

    client
      .getCollectionReleases(
        { username, folderId, page, perPage: 50, sort: 'added', sortOrder: 'desc' },
        ac.signal,
      )
      .then((res) => {
        setPages(res.pagination.pages)
        pageCache.set(page, res.releases)
        setItems(res.releases)
        setState({ kind: 'ok' })
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setState({ kind: 'error', message: msg })
      })

    return () => ac.abort()
  }, [client, folderId, isAuthed, page, pageCache, username])

  const filtered = useMemo(() => {
    if (!filterN) return items
    return items.filter((r) => {
      const title = r.basic_information.title ?? ''
      const artists = r.basic_information.artists?.map((a) => a.name).join(' ') ?? ''
      const labels = r.basic_information.labels?.map((l) => l.name).join(' ') ?? ''
      return normalize(`${artists} ${title} ${labels}`).includes(filterN)
    })
  }, [filterN, items])

  const deepMatches = useMemo(() => {
    if (!filterN) return []
    return deep.matches
  }, [deep.matches, filterN])

  const filteredMyRecords = useMemo(() => {
    if (!folderId) return []
    return myRecords.filter((r) => {
      const byFolder = (r.folderId ?? 0) === folderId
      if (!byFolder) return false
      if (!filterN) return true
      return normalize(`${r.artist} ${r.title} ${r.description ?? ''}`).includes(filterN)
    })
  }, [filterN, folderId, myRecords])

  async function runDeepSearch() {
    if (!isAuthed || !username || !folderId) return
    const query = filter.trim()
    if (query.length < 2) {
      setDeep({
        status: 'error',
        scannedPages: 0,
        totalPages: pages,
        matches: [],
        error: 'Минимум 2 символа для поиска по всей папке.',
      })
      return
    }

    deepAbortRef.current?.abort()
    const ac = new AbortController()
    deepAbortRef.current = ac
    setDeep({ status: 'running', scannedPages: 0, totalPages: pages, matches: [] })

    const maxMatches = 120
    const collected: DiscogsCollectionRelease[] = []

    try {
      for (let p = 1; p <= pages; p++) {
        if (ac.signal.aborted) {
          setDeep({ status: 'cancelled', scannedPages: p - 1, totalPages: pages, matches: collected })
          return
        }

        let list = pageCache.get(p)
        if (!list) {
          const res = await client.getCollectionReleases(
            { username, folderId, page: p, perPage: 50, sort: 'added', sortOrder: 'desc' },
            ac.signal,
          )
          list = res.releases
          pageCache.set(p, list)
        }

        for (const r of list) {
          const title = r.basic_information.title ?? ''
          const artists = r.basic_information.artists?.map((a) => a.name).join(' ') ?? ''
          const labels = r.basic_information.labels?.map((l) => l.name).join(' ') ?? ''
          if (normalize(`${artists} ${title} ${labels}`).includes(filterN)) {
            collected.push(r)
            if (collected.length >= maxMatches) break
          }
        }

        setDeep({ status: 'running', scannedPages: p, totalPages: pages, matches: [...collected] })
        if (collected.length >= maxMatches) break
      }

      setDeep({ status: 'done', scannedPages: pages, totalPages: pages, matches: collected })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setDeep({ status: 'error', scannedPages: deep.scannedPages, totalPages: pages, matches: collected, error: msg })
    } finally {
      deepAbortRef.current = null
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Коллекция</h2>
          <p className={styles.sub}>Discogs и свои пластинки отображаются вместе в выбранной папке.</p>
        </div>
        <div className={styles.filters}>
          <div className={styles.grow}>
            <InputField
              label="Фильтр"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Artist / Title / Label"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            disabled={!isAuthed || !filterN || deep.status === 'running' || !folderId}
            onClick={() => void runDeepSearch()}
          >
            {deep.status === 'running' ? 'Ищем…' : 'Искать по всей папке'}
          </Button>
          {deep.status === 'running' ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                deepAbortRef.current?.abort()
              }}
            >
              Отмена
            </Button>
          ) : null}
        </div>
      </div>

      {!isAuthed ? (
        <Alert title="Нет доступа к коллекции" variant="danger">
          Нужен `VITE_DISCOGS_TOKEN` в `.env` и успешный `/oauth/identity`.
        </Alert>
      ) : null}

      <Card title="Добавить свою пластинку">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InputField
            label="Исполнитель"
            value={myDraft.artist}
            onChange={(e) => setMyDraft((d) => ({ ...d, artist: e.target.value }))}
            placeholder="Например: Miles Davis"
          />
          <InputField
            label="Название"
            value={myDraft.title}
            onChange={(e) => setMyDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Например: Kind of Blue"
          />
          <InputField
            label="Год"
            value={myDraft.year}
            onChange={(e) => setMyDraft((d) => ({ ...d, year: e.target.value }))}
            placeholder="1959"
          />
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Куда добавить</span>
            <div className={styles.folderPicker}>
              {userFolders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`${styles.folderChip} ${myDraft.folderId === f.id ? styles.folderChipActive : ''}`}
                  onClick={() => setMyDraft((d) => ({ ...d, folderId: f.id }))}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Обложка</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  const v = typeof reader.result === 'string' ? reader.result : undefined
                  setMyDraft((d) => ({ ...d, coverDataUrl: v }))
                }
                reader.readAsDataURL(file)
              }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField
              label="Описание"
              value={myDraft.description}
              onChange={(e) => setMyDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Состояние, примечания, где купил и т.д."
            />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button
              type="button"
              variant="primary"
              disabled={!myDraft.title.trim() || !myDraft.artist.trim() || !myDraft.folderId}
              onClick={() => {
                const yearNum = Number(myDraft.year)
                addMyRecord({
                  folderId: myDraft.folderId,
                  title: myDraft.title,
                  artist: myDraft.artist,
                  year: Number.isFinite(yearNum) ? yearNum : undefined,
                  description: myDraft.description,
                  coverDataUrl: myDraft.coverDataUrl,
                })
                setMyDraft((draft) => ({
                  title: '',
                  artist: '',
                  year: '',
                  description: '',
                  folderId: draft.folderId,
                  coverDataUrl: undefined,
                }))
                setToast('Своя пластинка добавлена')
                window.setTimeout(() => setToast(null), 2200)
              }}
            >
              Добавить свою пластинку
            </Button>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Хранится локально, но отображается в общей папке коллекции.
            </span>
          </div>
        </div>
      </Card>

      <Card title="Папки коллекции" subtitle={username ? `Пользователь: ${username}` : undefined}>
        <div className={styles.folderCreateRow}>
          <div className={styles.grow}>
            <InputField
              label="Новая папка"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Например: Wishlist / Jazz / To sell"
            />
          </div>
          <Button type="button" variant="primary" disabled={folderBusy || !newFolderName.trim()} onClick={() => void handleCreateFolder()}>
            {folderBusy ? 'Создаём…' : 'Создать папку'}
          </Button>
        </div>
        <div className={styles.folderGrid}>
          {userFolders.map((folder) => (
            <div
              key={folder.id}
              className={`${styles.folderCard} ${folderId === folder.id ? styles.folderCardActive : ''}`}
              onClick={() => setFolderId(folder.id)}
            >
              {editingFolderId === folder.id ? (
                <div className={styles.folderEditRow} onClick={(e) => e.stopPropagation()}>
                  <input
                    className={styles.folderNameInput}
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    placeholder="Новое название"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    disabled={folderActionBusyId === folder.id}
                    onClick={() => void handleRenameFolder(folder.id)}
                  >
                    Сохранить
                  </Button>
                  <Button type="button" onClick={() => setEditingFolderId(null)}>
                    Отмена
                  </Button>
                </div>
              ) : (
                <>
                  <div className={styles.folderTop}>
                    <div className={styles.folderTitle}>{folder.name}</div>
                    <Badge>{folder.count}</Badge>
                  </div>
                  <div className={styles.folderActions} onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      disabled={folder.id <= 0 || folderActionBusyId === folder.id}
                      onClick={() => startRenameFolder(folder)}
                    >
                      Переименовать
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={folder.id <= 0 || folderActionBusyId === folder.id}
                      onClick={() => void handleDeleteFolder(folder.id)}
                    >
                      Удалить
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Пластинки в выбранной папке">
        {toast ? <Alert title="Статус">{toast}</Alert> : null}
        {!userFolders.length ? (
          <Alert title="Нет пользовательских папок">
            Создай первую папку. Системная папка All скрыта и больше не используется в интерфейсе.
          </Alert>
        ) : null}
        {deep.status === 'error' ? (
          <Alert title="Поиск по папке" variant="danger">
            {deep.error}
          </Alert>
        ) : null}

        {deep.status === 'running' ? (
          <Alert title="Поиск по папке">
            Сканируем страницы: <b>{deep.scannedPages}</b> / {deep.totalPages}. Найдено: <b>{deep.matches.length}</b>.
          </Alert>
        ) : deep.status === 'done' && filterN ? (
          <Alert title="Поиск по папке">
            Готово. Найдено: <b>{deep.matches.length}</b>. (Ограничение показа: 120)
          </Alert>
        ) : deep.status === 'cancelled' ? (
          <Alert title="Поиск по папке">Отменено. Найдено: {deep.matches.length}.</Alert>
        ) : null}

        {state.kind === 'error' ? (
          <Alert title="Ошибка загрузки" variant="danger">
            {state.message}
          </Alert>
        ) : null}

        {state.kind === 'loading' ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Spinner />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Загружаем страницу {page}…</span>
          </div>
        ) : null}

        <div className={styles.grid}>
          {filteredMyRecords.map((r) => (
            <div key={r.id} className={styles.item}>
              <img className={styles.thumb} alt="" src={r.coverDataUrl || '/favicon.svg'} />
              <div className={styles.meta}>
                <div className={styles.name}>{r.title}</div>
                <div className={styles.line}>
                  {r.artist}
                  {r.year ? ` • ${r.year}` : null}
                </div>
                {r.description ? <div className={styles.line}>{r.description}</div> : null}
                <div className={styles.actions}>
                  <Badge variant="accent">Локальная</Badge>
                </div>
              </div>
              <div className={styles.controls}>
                <select
                  className={styles.folderSelect}
                  value={r.folderId ?? 0}
                  onChange={(e) => updateMyRecord(r.id, { folderId: Number(e.target.value) })}
                  title="Переместить в папку"
                >
                  {userFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="danger" onClick={() => removeMyRecord(r.id)}>
                  Удалить
                </Button>
              </div>
            </div>
          ))}
          {(filterN && deep.status !== 'idle' && deep.status !== 'running' ? deepMatches : filtered).map((r) => {
            const bi = r.basic_information
            const artist = bi.artists?.[0]?.name
            const thumb = bi.cover_image || bi.thumb || '/favicon.svg'
            const year = bi.year
            return (
              <div key={`${r.id}-${r.instance_id}`} className={styles.item}>
                <img className={styles.thumb} alt="" src={thumb} />
                <div className={styles.meta}>
                  <Link className={styles.name} to="/album/$id" params={{ id: String(bi.id) }}>
                    {bi.title}
                  </Link>
                  <div className={styles.line}>
                    {artist ? `${artist}` : null}
                    {year ? ` • ${year}` : null}
                  </div>
                  <div className={styles.actions}>
                    {bi.formats?.[0]?.name ? <Badge>{bi.formats[0].name}</Badge> : null}
                    {bi.labels?.[0]?.name ? <Badge variant="accent">{bi.labels[0].name}</Badge> : null}
                  </div>
                </div>
                <div className={styles.controls}>
                  <select
                    className={styles.folderSelect}
                    value={r.folder_id}
                    onChange={(e) => void handleMoveToFolder(r, Number(e.target.value))}
                    title="Переместить в папку"
                  >
                    {userFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="danger" onClick={() => void handleRemoveFromCollection(r)}>
                    Удалить
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.footer}>
          <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
            <Button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Назад
            </Button>
            <Button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Вперёд
            </Button>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Страница <b style={{ color: 'var(--heading)' }}>{page}</b> из {pages}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Показано: <b style={{ color: 'var(--heading)' }}>{filtered.length + filteredMyRecords.length}</b> (Discogs:{' '}
            {items.length}, локальных: {filteredMyRecords.length})
          </div>
        </div>
      </Card>
    </div>
  )
}