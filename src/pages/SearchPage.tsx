import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { DiscogsCollectionFolder, DiscogsDatabaseSearchResponse, DiscogsSearchResult } from '../shared/api/discogs'
import { Button, InputField, Alert, Spinner, Badge } from '../shared/ui'
import styles from './SearchPage.module.css'

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; data: DiscogsDatabaseSearchResponse }

function toReleaseId(result: DiscogsSearchResult): number | null {
  if (result.type === 'release') return result.id
  return null
}

function isSystemFolder(folder: DiscogsCollectionFolder): boolean {
  const name = folder.name.trim().toLowerCase()
  return folder.id <= 0 || name === 'all' || name === 'uncategorized'
}

const SearchPage = () => {
  const { client, username, isAuthed } = useAuth()
  const [q, setQ] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [page, setPage] = useState(1)
  const [busyReleaseId, setBusyReleaseId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [folders, setFolders] = useState<DiscogsCollectionFolder[]>([])
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null)
  const [pendingAdd, setPendingAdd] = useState<{ releaseId: number; title: string } | null>(null)
  const userFolders = useMemo(() => folders.filter((f) => !isSystemFolder(f)), [folders])

  const canSearch = useMemo(() => q.trim().length >= 2, [q])

  useEffect(() => {
    setPage(1)
  }, [q])

  useEffect(() => {
    if (!isAuthed || !username) return
    const ac = new AbortController()
    client
      .getCollectionFolders(username, ac.signal)
      .then((res) => {
        setFolders(res.folders)
        setTargetFolderId((prev) => {
          const visible = res.folders.filter((f) => !isSystemFolder(f))
          const exists = visible.some((f) => f.id === prev)
          return exists ? prev : (visible[0]?.id ?? null)
        })
      })
      .catch(() => {
        // ignore
      })
    return () => ac.abort()
  }, [client, isAuthed, username])

  async function runSearch(nextPage: number) {
    const query = q.trim()
    if (query.length < 2) return
    const ac = new AbortController()
    setState({ kind: 'loading' })
    try {
      const data = await client.searchDatabase(
        { q: query, type: 'release', format: 'Vinyl', page: nextPage, perPage: 20 },
        ac.signal,
      )
      // extra safety: sometimes API returns mixed formats
      const vinylOnly = {
        ...data,
        results: data.results.filter((r) => (r.format ?? []).some((f) => f.toLowerCase() === 'vinyl')),
      }
      setState({ kind: 'ok', data: vinylOnly })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setState({ kind: 'error', message: msg })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    await runSearch(1)
  }

  async function handleAddToCollection(releaseId: number, folderId: number) {
    if (!isAuthed || !username) return
    setBusyReleaseId(releaseId)
    try {
      await client.addReleaseToCollection({ username, folderId, releaseId })
      const folderName = folders.find((f) => f.id === folderId)?.name ?? 'Folder'
      setToast(`Добавлено в коллекцию (папка: ${folderName})`)
      window.setTimeout(() => setToast(null), 2200)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setToast(`Ошибка: ${msg}`)
      window.setTimeout(() => setToast(null), 3500)
    } finally {
      setBusyReleaseId(null)
      setPendingAdd(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>Поиск релизов в Discogs</h2>

      {!isAuthed ? (
        <Alert title="Нужно подключить Discogs" variant="danger">
          Без `VITE_DISCOGS_TOKEN` приложение не сможет искать и работать с коллекцией.
        </Alert>
      ) : null}

      {toast ? (
        <Alert title="Статус">{toast}</Alert>
      ) : null}

      <form className={styles.bar} onSubmit={handleSubmit}>
        <div className={styles.grow}>
          <InputField
            label="Запрос"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Например: "Nirvana Nevermind"'
          />
        </div>
        <Button variant="primary" type="submit" disabled={!canSearch || state.kind === 'loading'}>
          {state.kind === 'loading' ? 'Ищем…' : 'Искать'}
        </Button>
      </form>

      {state.kind === 'error' ? (
        <Alert title="Ошибка поиска" variant="danger">
          {state.message}
        </Alert>
      ) : null}

      {state.kind === 'ok' ? (
        <div className={styles.results}>
          {state.data.results.map((r) => {
            const releaseId = toReleaseId(r)
            return (
              <div key={`${r.type}-${r.id}`} className={styles.card}>
                <img className={styles.thumb} alt="" src={r.thumb || r.cover_image || '/favicon.svg'} />
                <div className={styles.meta}>
                  {releaseId ? (
                    <Link className={styles.name} to="/album/$id" params={{ id: String(releaseId) }}>
                      {r.title}
                    </Link>
                  ) : (
                    <span className={styles.name}>{r.title}</span>
                  )}
                  <div className={styles.sub}>
                    {r.year ? `${r.year}` : null}
                    {r.country ? ` • ${r.country}` : null}
                    {r.format?.length ? ` • ${r.format.slice(0, 2).join(', ')}` : null}
                  </div>
                  {username ? <div className={styles.sub}>Пользователь: {username}</div> : null}
                  <div className={styles.actions}>
                    {r.genre?.length ? <Badge variant="accent">{r.genre[0]}</Badge> : <span />}
                    {releaseId ? (
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          setTargetFolderId((prev) => {
                            const exists = userFolders.some((f) => f.id === prev)
                            return exists ? prev : (userFolders[0]?.id ?? null)
                          })
                          setPendingAdd({ releaseId, title: r.title })
                        }}
                        disabled={!isAuthed || busyReleaseId === releaseId || !userFolders.length}
                      >
                        {busyReleaseId === releaseId ? 'Добавляем…' : 'В коллекцию'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}

          <div className={styles.actions} style={{ gridColumn: '1 / -1', justifyContent: 'center' }}>
            <Button
              type="button"
              disabled={page <= 1 || state.kind !== 'ok'}
              onClick={async () => {
                const next = Math.max(1, page - 1)
                setPage(next)
                await runSearch(next)
              }}
            >
              Назад
            </Button>
            <Button
              type="button"
              disabled={state.kind !== 'ok' || page >= state.data.pagination.pages}
              onClick={async () => {
                const next = page + 1
                setPage(next)
                await runSearch(next)
              }}
            >
              Вперёд
            </Button>
          </div>
        </div>
      ) : null}

      {state.kind === 'loading' ? <Spinner /> : null}

      {!userFolders.length && isAuthed ? (
        <Alert title="Нет папок для добавления" variant="danger">
          Сначала создай пользовательскую папку в коллекции. Системная папка All скрыта.
        </Alert>
      ) : null}

      {pendingAdd ? (
        <div className={styles.modalOverlay} onClick={() => setPendingAdd(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Добавить в папку</h3>
            <div className={styles.sub}>{pendingAdd.title}</div>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Папка</span>
              <select
                className={styles.folderSelect}
                value={targetFolderId ?? ''}
                onChange={(e) => setTargetFolderId(Number(e.target.value))}
                disabled={!userFolders.length}
              >
                {userFolders.length ? (
                  userFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))
                ) : (
                  <option value="">Нет папок</option>
                )}
              </select>
            </div>
            <div className={styles.modalActions}>
              <Button type="button" onClick={() => setPendingAdd(null)}>
                Отмена
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={busyReleaseId === pendingAdd.releaseId || !targetFolderId}
                onClick={() => {
                  if (!targetFolderId) return
                  void handleAddToCollection(pendingAdd.releaseId, targetFolderId)
                }}
              >
                {busyReleaseId === pendingAdd.releaseId ? 'Добавляем…' : 'Добавить'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SearchPage