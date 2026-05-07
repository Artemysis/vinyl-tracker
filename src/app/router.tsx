import App from './App'
import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import SearchPage from '../pages/SearchPage'
import CollectionPage from '../pages/CollectionPage'
import AlbumDetailPage from '../pages/AlbumDetailPage'
import { useAuthStore } from '../features/auth'

const rootRoute = createRootRoute({
  component: App,
})

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: SearchPage,
})

const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collection',
  component: CollectionPage,
  beforeLoad: () => {
    const { username, identityStatus } = useAuthStore.getState()
    if (identityStatus !== 'ok' || !username) {
      throw redirect({ to: '/' })
    }
  },
})

const albumDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/album/$id',
  component: AlbumDetailPage,
  beforeLoad: () => {
    const { username, identityStatus } = useAuthStore.getState()
    if (identityStatus !== 'ok' || !username) {
      throw redirect({ to: '/' })
    }
  },
})

const routeTree = rootRoute.addChildren([
  searchRoute,
  collectionRoute,
  albumDetailRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}