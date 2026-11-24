import type { EmailSort } from '../pages/inbox/types'
import { getUserDataItem, setUserDataItem } from './userData'

const SORT_STORAGE_KEY = 'ontrack-inbox-sort'

const isEmailSort = (value: string): value is EmailSort =>
  value === 'priority' || value === 'category' || value === 'date'

/** Loads the saved Inbox sort, defaulting to category order for a new browser. */
export function getInboxSortPreference(): EmailSort {
  const savedSort = getUserDataItem(SORT_STORAGE_KEY)
  if (savedSort === null) {
    return 'category'
  }

  if (!isEmailSort(savedSort)) {
    throw new Error('Saved Inbox sort preference has an invalid value.')
  }

  return savedSort
}

/** Persists one of the supported Inbox sort options. */
export function saveInboxSortPreference(sort: EmailSort): void {
  if (!isEmailSort(sort)) {
    throw new Error('Invalid Inbox sort preference.')
  }

  setUserDataItem(SORT_STORAGE_KEY, sort)
}
