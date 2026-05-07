import { useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type {
  DiscogsCollectionItemsByReleaseResponse,
  DiscogsCollectionNoteField,
  DiscogsRelease,
} from '../shared/api/discogs'
import { Alert, Badge, Button, Card, Spinner } from '../shared/ui'
import styles from './AlbumDetailPage.module.css'

type PageState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; release: DiscogsRelease; collection?: DiscogsCollectionItemsByReleaseResponse }

export default function AlbumDetailPage() {
  const { id } = useParams({ from: '/album/$id' })
  const releaseId = useMemo(() => Number(id), [id])
  const { client, username, isAuthed } = useAuth()

  const [state, setState] = useState<PageState>({ kind: 'idle' })
  const [busy, setBusy] = useState<null | string>(null)

  const [noteFields, setNoteFields] = useState<DiscogsCollectionNoteField[]>([])

  useEffect(() => {
    if (!Number.isFinite(releaseId)) {
      setState({ kind: 'error', message: 'Некорректный release id' })
      return
    }
    const ac = new AbortController()
    setState({ kind: 'loading' })

    Promise.all([
      client.getRelease(releaseId, ac.signal),
      isAuthed && username ? client.getCollectionItemsByRelease({ username, releaseId }, ac.signal) : Promise.resolve(undefined),
      isAuthed && username ? client.getCollectionNoteFields(username, ac.signal) : Promise.resolve(undefined),
    ])
      .then(([release, collection, fields]) => {
        setState({ kind: 'ok', release, collection })
        if (fields?.fields?.length) {
          setNoteFields(fields.fields)
        }
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setState({ kind: 'error', message: msg })
      })

    return () => ac.abort()
  }, [client, isAuthed, releaseId, username])

  async function refreshCollection() {
    if (!isAuthed || !username) return
    const ac = new AbortController()
    const collection = await client.getCollectionItemsByRelease({ username, releaseId }, ac.signal)
    setState((prev) => (prev.kind === 'ok' ? { ...prev, collection } : prev))
  }

  async function handleAddToCollection() {
    if (!isAuthed || !username) return
    setBusy('add')
    try {
      await client.addReleaseToCollection({ username, folderId: 1, releaseId })
      await refreshCollection()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setState({ kind: 'error', message: msg })
    } finally {
      setBusy(null)
    }
  }

  async function handleDeleteInstance(instanceId: number, folderId: number) {
    if (!isAuthed || !username) return
    setBusy(`del-${instanceId}`)
    try {
      await client.deleteCollectionInstance({ username, folderId, releaseId, instanceId })
      await refreshCollection()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setState({ kind: 'error', message: msg })
    } finally {
      setBusy(null)
    }
  }

  if (state.kind === 'loading' || state.kind === 'idle') {
    return (
      <Card title="Загрузка релиза" right={<Spinner />}>
        <div style={{ fontSize: 14, color: 'var(--color-text)' }}>Получаем данные из Discogs…</div>
      </Card>
    )
  }

  if (state.kind === 'error') {
    return (
      <Alert title="Ошибка" variant="danger">
        {state.message}
      </Alert>
    )
  }

  const cover =
    state.release.images?.find((i) => i.type === 'primary')?.uri ??
    state.release.thumb ??
    '/favicon.svg'
  const artist = state.release.artists?.[0]?.name
  const year = state.release.year
  const inCollection = Boolean(state.collection?.releases?.length)
  const copies = state.collection?.releases?.length ?? 0

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <img className={styles.cover} alt="" src={cover} />
        <div>
          <h2 className={styles.h1}>{state.release.title}</h2>
          <div className={styles.sub}>
            {artist ? `${artist}` : null}
            {year ? ` • ${year}` : null}
            <span className={styles.mono}> • release #{state.release.id}</span>
          </div>
          <div className={styles.row} style={{ marginTop: 10 }}>
            {state.release.genres?.[0] ? <Badge variant="accent">{state.release.genres[0]}</Badge> : null}
            {state.release.styles?.[0] ? <Badge>{state.release.styles[0]}</Badge> : null}
            {state.release.formats?.[0]?.name ? <Badge>{state.release.formats[0].name}</Badge> : null}
          </div>
        </div>
      </div>

      <Card
        title="Коллекция"
        subtitle={
          inCollection
            ? `Релиз уже есть в твоей коллекции. Экземпляров: ${copies}.`
            : 'Релиза нет в коллекции (можно добавить).'
        }
        right={
          <Button
            variant="primary"
            type="button"
            disabled={!isAuthed || busy === 'add' || inCollection}
            onClick={handleAddToCollection}
          >
            {busy === 'add' ? 'Добавляем…' : inCollection ? 'Уже в коллекции' : 'Добавить в коллекцию'}
          </Button>
        }
      >
        {!isAuthed ? (
          <Alert title="Нет доступа" variant="danger">
            Нужен `VITE_DISCOGS_TOKEN` и успешный identity.
          </Alert>
        ) : null}

        {state.collection?.releases?.length ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {noteFields.length ? <Badge>Notes fields: {noteFields.length}</Badge> : null}
            <Button
              type="button"
              variant="danger"
              disabled={busy !== null}
              onClick={() => void handleDeleteInstance(state.collection!.releases[0]!.instance_id, state.collection!.releases[0]!.folder_id)}
            >
              {busy ? 'Удаляем…' : 'Удалить из коллекции'}
            </Button>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>
            Экземпляров не найдено. Если ты только что добавил релиз — обнови страницу или нажми “Добавить”.
          </div>
        )}
      </Card>

      <Card title="Треклист">
        {state.release.tracklist?.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {state.release.tracklist.slice(0, 25).map((t) => (
              <div
                key={`${t.position}-${t.title}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 14,
                  background: 'var(--color-bg)',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--color-heading)' }}>
                  {t.position || '—'} {t.title}
                </span>
                <span className={styles.mono}>{t.duration || ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--color-text)' }}>Нет данных по треклисту.</div>
        )}
      </Card>
    </div>
  )
}