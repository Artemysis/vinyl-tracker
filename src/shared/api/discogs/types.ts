export type DiscogsPagination = {
  page: number
  pages: number
  per_page: number
  items: number
  urls?: Partial<Record<'first' | 'prev' | 'next' | 'last', string>>
}

export type DiscogsPaginated<TItem, TKey extends string> = {
  pagination: DiscogsPagination
} & Record<TKey, TItem[]>

export type DiscogsIdentity = {
  id: number
  username: string
  resource_url: string
}

export type DiscogsSearchResult = {
  id: number
  type: string
  title: string
  year?: string | number
  country?: string
  genre?: string[]
  style?: string[]
  format?: string[]
  label?: string[]
  catno?: string
  barcode?: string[]
  uri?: string
  resource_url?: string
  thumb?: string
  cover_image?: string
}

export type DiscogsDatabaseSearchResponse = DiscogsPaginated<DiscogsSearchResult, 'results'>

export type DiscogsReleaseArtist = {
  id: number
  name: string
  anv?: string
  join?: string
  role?: string
  tracks?: string
  resource_url?: string
}

export type DiscogsReleaseFormat = {
  name: string
  qty: string
  descriptions?: string[]
}

export type DiscogsReleaseImage = {
  type: 'primary' | 'secondary'
  uri: string
  resource_url: string
  uri150: string
  width: number
  height: number
}

export type DiscogsRelease = {
  id: number
  title: string
  year?: number
  released?: string
  thumb?: string
  artists?: DiscogsReleaseArtist[]
  genres?: string[]
  styles?: string[]
  formats?: DiscogsReleaseFormat[]
  images?: DiscogsReleaseImage[]
  tracklist?: Array<{
    position: string
    type_: string
    title: string
    duration?: string
  }>
}

export type DiscogsCollectionFolder = {
  id: number
  name: string
  count: number
  resource_url: string
}

export type DiscogsCollectionFoldersResponse = {
  folders: DiscogsCollectionFolder[]
}

export type DiscogsCollectionNoteField = {
  id: number
  name: string
  type: string
  position: number
  lines?: number
}

export type DiscogsCollectionNoteFieldsResponse = {
  fields: DiscogsCollectionNoteField[]
}

export type DiscogsCollectionReleaseBasicInformation = {
  id: number
  title: string
  year?: number
  thumb?: string
  cover_image?: string
  artists?: Array<{ name: string; id: number; resource_url?: string }>
  formats?: DiscogsReleaseFormat[]
  labels?: Array<{ name: string; id: number; catno?: string; resource_url?: string }>
}

export type DiscogsCollectionReleaseInstance = {
  instance_id: number
  date_added?: string
  rating?: number
  notes?: Array<{ field_id: number; value: string }>
}

export type DiscogsCollectionRelease = {
  id: number
  instance_id: number
  folder_id: number
  rating?: number
  notes?: Array<{ field_id: number; value: string }>
  basic_information: DiscogsCollectionReleaseBasicInformation
}

export type DiscogsCollectionReleasesResponse = DiscogsPaginated<DiscogsCollectionRelease, 'releases'>

export type DiscogsCollectionItemsByReleaseResponse = DiscogsPaginated<
  {
    id: number
    instance_id: number
    folder_id: number
    rating?: number
    notes?: Array<{ field_id: number; value: string }>
    basic_information: DiscogsCollectionReleaseBasicInformation
  },
  'releases'
>

