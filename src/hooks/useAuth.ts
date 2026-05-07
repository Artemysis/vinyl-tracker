import { useMemo } from 'react'
import { DiscogsClient } from '../shared/api/discogs'
import { useAuthStore } from '../features/auth'
import { env } from '../shared/config/env'

export function useAuth() {
  const token = env.discogsToken
  const username = useAuthStore((s) => s.username)
  const setUsername = useAuthStore((s) => s.setUsername)
  const logout = useAuthStore((s) => s.logout)

  const client = useMemo(() => new DiscogsClient({ token }), [token])

  return {
    token,
    username,
    client,
    setUsername,
    logout,
    isAuthed: Boolean(token && username),
  }
}

