import type { EmailSort } from '../pages/inbox/types'

const SORT_STORAGE_KEY = 'ontrack-inbox-sort'

const isEmailSort = (value: string): value is EmailSort =>
  value === 'priority' || value === 'category' || value === 'date'

/** Loads the saved Inbox sort, defaulting to category order for a new browser. */
export function getInboxSortPreference(): EmailSort {
  const savedSort = localStorage.getItem(SORT_STORAGE_KEY)
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

  localStorage.setItem(SORT_STORAGE_KEY, sort)
}
