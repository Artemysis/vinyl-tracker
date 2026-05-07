import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MyRecord } from './types'

function now() {
  return Date.now()
}

function uuid(): string {
  return `${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`
}

export type MyRecordDraft = {
  folderId?: number
  title: string
  artist: string
  year?: number
  description?: string
  coverDataUrl?: string
}

type MyRecordState = {
  records: MyRecord[]
  add: (draft: MyRecordDraft) => void
  update: (id: string, patch: Partial<MyRecordDraft>) => void
  remove: (id: string) => void
}

export const useMyRecordStore = create<MyRecordState>()(
  persist(
    (set, get) => ({
      records: [],
      add: (draft) => {
        const t = now()
        const rec: MyRecord = {
          id: uuid(),
          folderId: draft.folderId ?? 1,
          title: draft.title.trim(),
          artist: draft.artist.trim(),
          year: draft.year,
          description: draft.description?.trim() || undefined,
          coverDataUrl: draft.coverDataUrl,
          createdAt: t,
          updatedAt: t,
        }
        set({ records: [rec, ...get().records] })
      },
      update: (id, patch) => {
        const t = now()
        set({
          records: get().records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  folderId: patch.folderId !== undefined ? patch.folderId : r.folderId,
                  title: patch.title !== undefined ? patch.title.trim() : r.title,
                  artist: patch.artist !== undefined ? patch.artist.trim() : r.artist,
                  year: patch.year !== undefined ? patch.year : r.year,
                  description: patch.description !== undefined ? patch.description.trim() || undefined : r.description,
                  coverDataUrl: patch.coverDataUrl !== undefined ? patch.coverDataUrl : r.coverDataUrl,
                  updatedAt: t,
                }
              : r,
          ),
        })
      },
      remove: (id) => set({ records: get().records.filter((r) => r.id !== id) }),
    }),
    { name: 'vinyl-tracker/my-records' },
  ),
)

