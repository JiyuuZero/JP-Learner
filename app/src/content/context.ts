// Lightweight React context exposing the boot-loaded ContentStore to all views.
import { createContext, useContext } from 'react'
import type { ContentStore } from './store'

export interface ContentState {
  store: ContentStore | null
  loading: boolean
  error: string | null
  reload: () => void
}

export const ContentContext = createContext<ContentState>({
  store: null,
  loading: true,
  error: null,
  reload: () => {},
})

export function useContent(): ContentState {
  return useContext(ContentContext)
}
