import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { useAuthStore } from '../features/auth'

function toTokenFingerprint(token?: string): string | undefined {
  if (!token) return undefined
  const clean = token.trim()
  if (!clean) return undefined
  if (clean.length <= 10) return clean
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`
}

export function useIdentity() {
  const { token, client } = useAuth()
  const username = useAuthStore((s) => s.username)
  const tokenFingerprint = useAuthStore((s) => s.tokenFingerprint)
  const setTokenFingerprint = useAuthStore((s) => s.setTokenFingerprint)
  const resetForTokenChange = useAuthStore((s) => s.resetForTokenChange)
  const identityStatus = useAuthStore((s) => s.identityStatus)
  const identityError = useAuthStore((s) => s.identityError)
  const setIdentityStatus = useAuthStore((s) => s.setIdentityStatus)
  const setUsername = useAuthStore((s) => s.setUsername)

  useEffect(() => {
    const currentTokenFingerprint = toTokenFingerprint(token)

    if (!token) {
      setIdentityStatus('error', 'Не найден VITE_DISCOGS_TOKEN в .env')
      return
    }

    if (tokenFingerprint !== currentTokenFingerprint) {
      resetForTokenChange(currentTokenFingerprint)
      return
    }

    if (identityStatus === 'loading' || identityStatus === 'ok') return

    const ac = new AbortController()
    setIdentityStatus('loading')

    client
      .identity(ac.signal)
      .then((id) => {
        setUsername(id.username)
        setTokenFingerprint(currentTokenFingerprint)
        setIdentityStatus('ok')
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setIdentityStatus('error', msg)
      })

    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, client, resetForTokenChange, setIdentityStatus, setTokenFingerprint, setUsername, tokenFingerprint])

  return { username, identityStatus, identityError }
}

