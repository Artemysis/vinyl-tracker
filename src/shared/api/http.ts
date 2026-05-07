export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type HttpRequestOptions = {
  method: HttpMethod
  path: string
  query?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string | undefined>
  body?: unknown
  signal?: AbortSignal
}

export class HttpError extends Error {
  public readonly status: number
  public readonly url: string
  public readonly bodyText?: string

  constructor(args: { message: string; status: number; url: string; bodyText?: string }) {
    super(args.message)
    this.name = 'HttpError'
    this.status = args.status
    this.url = args.url
    this.bodyText = args.bodyText
  }
}

function buildUrl(baseUrl: string, path: string, query?: HttpRequestOptions['query']): string {
  const url = new URL(path, baseUrl)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

export class HttpClient {
  private readonly baseUrl: string
  private readonly defaultHeaders: Record<string, string>

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = defaultHeaders
  }

  public async requestJson<T>(opts: HttpRequestOptions): Promise<T> {
    const url = buildUrl(this.baseUrl, opts.path, opts.query)

    const res = await fetch(url, {
      method: opts.method,
      headers: {
        Accept: 'application/json',
        ...(opts.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...this.defaultHeaders,
        ...Object.fromEntries(Object.entries(opts.headers ?? {}).filter(([, v]) => v !== undefined)) as Record<
          string,
          string
        >,
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    })

    if (!res.ok) {
      let bodyText: string | undefined
      try {
        bodyText = await res.text()
      } catch {
        bodyText = undefined
      }
      throw new HttpError({
        message: `HTTP ${res.status} for ${url}`,
        status: res.status,
        url,
        bodyText,
      })
    }

    // 204 / empty body
    if (res.status === 204) return undefined as T

    const text = await res.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  }
}

