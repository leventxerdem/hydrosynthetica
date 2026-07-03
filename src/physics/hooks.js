import { useSyncExternalStore } from 'react'
import { controller } from './controller.js'
import { dataStore } from './dataStore.js'

export function useController() {
  return useSyncExternalStore(
    (cb) => controller.subscribe(cb),
    () => controller
  )
}

export function useDataStore() {
  return useSyncExternalStore(
    (cb) => dataStore.subscribe(cb),
    () => dataStore
  )
}
