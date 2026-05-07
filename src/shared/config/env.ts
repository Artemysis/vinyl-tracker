type Env = {
  discogsToken?: string
  userAgent: string
}

export const env: Env = {
  discogsToken: import.meta.env.VITE_DISCOGS_TOKEN as string | undefined,
  userAgent: (import.meta.env.VITE_DISCOGS_USER_AGENT as string | undefined) ?? 'vinyl-tracker/0.0.0',
}

