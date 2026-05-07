import { Link, Outlet } from '@tanstack/react-router'
import { useIdentity } from '../hooks/useIdentity'
import { Alert } from '../shared/ui'
import styles from './App.module.css'

const App = () => {
  const { identityStatus, identityError, username } = useIdentity()

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <Link to="/" className={styles.brand}>
            <div className={styles.brandTitle}>Vinyl Tracker</div>
            <div className={styles.brandSub}>
              Простой учёт коллекции винила на базе Discogs. Быстрый поиск + коллекция + экземпляры.
            </div>
          </Link>

          <nav className={styles.nav}>
            <Link to="/" className={styles.navLink} activeProps={{ className: styles.navLinkActive }}>
              <span>Поиск</span>
              <span className={styles.chip}>/</span>
            </Link>
            <Link
              to="/collection"
              className={styles.navLink}
              activeProps={{ className: styles.navLinkActive }}
            >
              <span>Коллекция</span>
              <span className={styles.chip}>C</span>
            </Link>
          </nav>

          {identityStatus === 'ok' ? (
            <div className={styles.chip}>Discogs: {username}</div>
          ) : identityStatus === 'loading' ? (
            <div className={styles.chip}>Discogs: connecting…</div>
          ) : (
            <div className={styles.chip}>Discogs: not connected</div>
          )}
        </div>
      </aside>

      <div className={styles.content}>
        <main className={styles.main}>
          {identityStatus === 'error' ? (
            <Alert title="Discogs не подключён" variant="danger">
              {identityError ?? 'Ошибка авторизации.'} Проверь `VITE_DISCOGS_TOKEN` в `.env` и перезапусти dev
              сервер.
            </Alert>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default App