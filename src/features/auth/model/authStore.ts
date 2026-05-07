import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AuthState = {
  username?: string
  setUsername: (username?: string) => void
  tokenFingerprint?: string
  setTokenFingerprint: (fingerprint?: string) => void
  resetForTokenChange: (fingerprint?: string) => void
  identityStatus: 'idle' | 'loading' | 'ok' | 'error'
  identityError?: string
  setIdentityStatus: (status: AuthState['identityStatus'], error?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      username: undefined,
      setUsername: (username) => set({ username: username?.trim() || undefined }),
      tokenFingerprint: undefined,
      setTokenFingerprint: (tokenFingerprint) => set({ tokenFingerprint: tokenFingerprint?.trim() || undefined }),
      resetForTokenChange: (tokenFingerprint) =>
        set({
          username: undefined,
          tokenFingerprint: tokenFingerprint?.trim() || undefined,
          identityStatus: 'idle',
          identityError: undefined,
        }),
      identityStatus: 'idle',
      identityError: undefined,
      setIdentityStatus: (identityStatus, identityError) => set({ identityStatus, identityError }),
      logout: () =>
        set({ username: undefined, tokenFingerprint: undefined, identityStatus: 'idle', identityError: undefined }),
    }),
    { name: 'vinyl-tracker/auth' },
  ),
)

