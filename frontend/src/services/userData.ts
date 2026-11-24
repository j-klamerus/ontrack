import { getSupabaseClient } from './supabase'

const TABLE_NAME = 'user_app_data'
const CACHE_PREFIX = 'ontrack-user-data:'
const PENDING_PREFIX = 'ontrack-user-data-pending:'
const LEGACY_IMPORT_STATUS_KEY = 'ontrack-legacy-data-import-status'

const legacyDataKeys = [
  'ontrack-demo-settings',
  'ontrack-event-categories',
  'ontrack-category-overrides',
  'ontrack-custom-commitments',
  'ontrack-custom-calendar-events',
  'ontrack-calendar-event-overrides',
  'ontrack-deleted-calendar-events',
  'ontrack-commitment-overrides',
  'ontrack-deleted-commitments',
  'ontrack-email-read-states',
  'ontrack-email-rules',
  'ontrack-email-priority-rules',
  'ontrack-email-spam-settings',
  'ontrack-inbox-sort',
  'ontrack-inbox-view',
  'ontrack-inbox-scan',
  'ontrack-planner-page-changes',
  'ontrack-reviewed-suggestions',
  'ontrack-suggested-replies',
  'ontrack-reviewed-suggested-replies'
]

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'>

type UserDataRow = {
  data_key: string
  value: string | null
}

type PendingWrite = {
  userId: string
  key: string
  value: string | null
  version: number
}

export type UserDataSyncEvent = {
  status: 'saving' | 'saved' | 'error'
  error?: string
}

export const USER_DATA_SYNC_EVENT = 'ontrack:user-data-sync'

let activeUserId: string | null = null
let activeStorage: ReturnType<typeof createUserScopedStorage> | null = null
let activationPromise: Promise<{ needsLegacyImport: boolean }> | null = null
let writeQueue: Promise<void> = Promise.resolve()
let isDrainingWrites = false
let nextWriteVersion = 0
let lastSyncError: string | null = null
const failedWrites = new Map<string, PendingWrite>()
const queuedWrites = new Map<string, PendingWrite>()

/** Provides browser-backed storage whose keys are isolated by signed-in user. */
export function createUserScopedStorage(
  userId: string,
  storage: StorageLike = localStorage
) {
  const prefix = `${CACHE_PREFIX}${encodeURIComponent(userId)}:`
  const pendingPrefix = `${PENDING_PREFIX}${encodeURIComponent(userId)}:`
  const toStorageKey = (key: string) => `${prefix}${encodeURIComponent(key)}`
  const toPendingKey = (key: string) => `${pendingPrefix}${encodeURIComponent(key)}`

  return {
    getItem(key: string) {
      return storage.getItem(toStorageKey(key))
    },
    setItem(key: string, value: string) {
      storage.setItem(toStorageKey(key), value)
    },
    removeItem(key: string) {
      storage.removeItem(toStorageKey(key))
    },
    getPending(key: string): PendingWrite | null {
      const saved = storage.getItem(toPendingKey(key))
      if (saved === null) return null
      let parsed: unknown
      try {
        parsed = JSON.parse(saved)
      } catch {
        throw new Error('A pending Supabase data change has an invalid format.')
      }
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('version' in parsed) ||
        typeof parsed.version !== 'number' ||
        !('value' in parsed) ||
        (typeof parsed.value !== 'string' && parsed.value !== null)
      ) {
        throw new Error('A pending Supabase data change has an invalid format.')
      }
      return { userId, key, version: parsed.version, value: parsed.value }
    },
    setPending(key: string, value: string | null, version: number) {
      storage.setItem(toPendingKey(key), JSON.stringify({ value, version }))
    },
    removePending(key: string) {
      storage.removeItem(toPendingKey(key))
    },
    keys() {
      const keys: string[] = []
      for (let index = 0; index < storage.length; index += 1) {
        const storageKey = storage.key(index)
        if (!storageKey?.startsWith(prefix)) continue
        try {
          keys.push(decodeURIComponent(storageKey.slice(prefix.length)))
        } catch {
          throw new Error('A cached Supabase data key has an invalid format.')
        }
      }
      return keys
    },
    pendingKeys() {
      const keys: string[] = []
      for (let index = 0; index < storage.length; index += 1) {
        const storageKey = storage.key(index)
        if (!storageKey?.startsWith(pendingPrefix)) continue
        try {
          keys.push(decodeURIComponent(storageKey.slice(pendingPrefix.length)))
        } catch {
          throw new Error('A pending Supabase data key has an invalid format.')
        }
      }
      return keys
    }
  }
}

/** Loads this account's cloud data before any app page reads its browser cache. */
export function activateUserData(userId: string): Promise<{ needsLegacyImport: boolean }> {
  if (activeUserId === userId && activationPromise) {
    return activationPromise
  }

  activeUserId = userId
  activeStorage = createUserScopedStorage(userId)
  activationPromise = loadUserData(userId, activeStorage).catch((error: unknown) => {
    activationPromise = null
    throw error
  })
  return activationPromise
}

async function loadUserData(
  userId: string,
  storage: ReturnType<typeof createUserScopedStorage>
): Promise<{ needsLegacyImport: boolean }> {
  const { data, error } = await getSupabaseClient()
    .from(TABLE_NAME)
    .select('data_key, value')
    .eq('user_id', userId)

  if (error) {
    const message = `Unable to load your saved data from Supabase: ${error.message}`
    reportSyncError(message)
    throw new Error(message)
  }

  if (!Array.isArray(data)) {
    throw new Error('Supabase returned saved user data in an invalid format.')
  }

  const rows: UserDataRow[] = data.map((row: unknown) => {
    if (
      typeof row !== 'object' ||
      row === null ||
      !('data_key' in row) ||
      typeof row.data_key !== 'string' ||
      row.data_key.length === 0 ||
      row.data_key.length > 200 ||
      !('value' in row) ||
      (typeof row.value !== 'string' && row.value !== null)
    ) {
      throw new Error('Supabase returned saved user data in an invalid format.')
    }
    return { data_key: row.data_key, value: row.value }
  })

  const remoteKeys = new Set(rows.map(({ data_key }) => data_key))
  for (const { data_key, value } of rows) {
    const pending = storage.getPending(data_key)
    if (pending) {
      if (pending.value === null) {
        storage.removeItem(data_key)
      } else {
        storage.setItem(data_key, pending.value)
      }
      queueWrite({ userId, key: data_key, value: pending.value })
      continue
    }

    if (value === null) {
      storage.removeItem(data_key)
    } else {
      storage.setItem(data_key, value)
    }
  }

  for (const key of storage.keys()) {
    if (remoteKeys.has(key)) continue
    const value = storage.getItem(key)
    if (value !== null) {
      queueWrite({ userId, key, value })
    }
  }
  for (const key of storage.pendingKeys()) {
    if (remoteKeys.has(key) || storage.keys().includes(key)) continue
    const pending = storage.getPending(key)
    if (pending) {
      queueWrite({ userId, key, value: pending.value })
    }
  }

  const hasCachedData = storage.keys().length > 0 || storage.pendingKeys().length > 0
  const importStatus = storage.getItem(LEGACY_IMPORT_STATUS_KEY)
  const hasLegacyData = legacyDataKeys.some((key) => localStorage.getItem(key) !== null)
  const needsLegacyImport =
    rows.length === 0 &&
    !hasCachedData &&
    importStatus === null &&
    hasLegacyData

  if (!isDrainingWrites && queuedWrites.size === 0 && failedWrites.size === 0) {
    lastSyncError = null
    reportSyncSaved()
  }

  return { needsLegacyImport }
}

/** Reads the current account's cached value; unauthenticated callers keep legacy behavior. */
export function getUserDataItem(key: string): string | null {
  return activeStorage
    ? activeStorage.getItem(key)
    : localStorage.getItem(key)
}

/** Writes to the account cache immediately and queues a protected Supabase upsert. */
export function setUserDataItem(key: string, value: string): void {
  if (!activeStorage || !activeUserId) {
    localStorage.setItem(key, value)
    return
  }

  activeStorage.setItem(key, value)
  queueWrite({ userId: activeUserId, key, value })
}

/** Stores a cloud tombstone so deleted keys cannot reappear from a stale browser cache. */
export function removeUserDataItem(key: string): void {
  if (!activeStorage || !activeUserId) {
    localStorage.removeItem(key)
    return
  }

  activeStorage.removeItem(key)
  queueWrite({ userId: activeUserId, key, value: null })
}

/** Indicates whether any account data still needs a successful cloud write. */
export function hasPendingUserDataWrites(): boolean {
  return isDrainingWrites ||
    queuedWrites.size > 0 ||
    failedWrites.size > 0 ||
    (activeStorage?.pendingKeys().length ?? 0) > 0
}

/** Copies old unscoped browser state only after the signed-in user explicitly chooses import. */
export function importLegacyUserData(): number {
  if (!activeStorage) {
    throw new Error('Sign in before importing browser data.')
  }

  let importedCount = 0
  for (const key of legacyDataKeys) {
    const value = localStorage.getItem(key)
    if (value !== null) {
      setUserDataItem(key, value)
      importedCount += 1
    }
  }
  setUserDataItem(LEGACY_IMPORT_STATUS_KEY, 'imported')
  return importedCount
}

/** Records that the user chose not to import the old browser data. */
export function skipLegacyUserDataImport(): void {
  if (!activeStorage) {
    throw new Error('Sign in before choosing a data import option.')
  }
  setUserDataItem(LEGACY_IMPORT_STATUS_KEY, 'skipped')
}

/** Waits for queued writes and reports if any data remains local-only. */
export async function flushUserDataWrites(): Promise<void> {
  await writeQueue
  if (failedWrites.size > 0 || (activeStorage?.pendingKeys().length ?? 0) > 0) {
    throw new Error(lastSyncError ?? 'Some changes could not be saved to Supabase.')
  }
}

/** Retries any data writes that failed while the user was offline or the table was unavailable. */
export async function retryUserDataSync(): Promise<void> {
  const userId = activeUserId
  const storage = activeStorage
  if (!userId || !storage) {
    throw new Error('Sign in before syncing saved data.')
  }

  await loadUserData(userId, storage)
  await writeQueue
  if (failedWrites.size === 0 && storage.pendingKeys().length === 0) {
    lastSyncError = null
    reportSyncSaved()
  } else {
    const message = lastSyncError ?? 'Some changes could not be saved to Supabase.'
    reportSyncError(message)
    throw new Error(message)
  }
}

/** Clears only the in-memory scope; per-user browser caches remain isolated for the next sign-in. */
export function clearActiveUserData(): void {
  activeUserId = null
  activeStorage = null
  activationPromise = null
}

function queueWrite(change: Omit<PendingWrite, 'version'>): void {
  const pendingWrite: PendingWrite = { ...change, version: ++nextWriteVersion }
  const pendingKey = getPendingWriteKey(change.userId, change.key)
  const storage = createUserScopedStorage(change.userId)
  storage.setPending(change.key, pendingWrite.value, pendingWrite.version)
  queuedWrites.set(pendingKey, pendingWrite)
  reportSyncSaving()

  if (isDrainingWrites) return
  isDrainingWrites = true
  let drainError: string | null = null
  writeQueue = writeQueue
    .then(async () => {
      while (queuedWrites.size > 0) {
        const next = queuedWrites.entries().next()
        if (next.done) break
        const [key, write] = next.value
        queuedWrites.delete(key)
        const writeStorage = createUserScopedStorage(write.userId)

        try {
          await writeToSupabase(write)
          const failedWrite = failedWrites.get(key)
          if (failedWrite && failedWrite.version <= write.version) {
            failedWrites.delete(key)
          }
          if (writeStorage.getPending(write.key)?.version === write.version) {
            writeStorage.removePending(write.key)
          }
        } catch (error) {
          failedWrites.set(key, write)
          lastSyncError = getErrorMessage(error)
        }
      }
    })
    .catch((error: unknown) => {
      drainError = getErrorMessage(error)
    })
    .finally(() => {
      isDrainingWrites = false
      if (drainError) {
        lastSyncError = drainError
        reportSyncError(drainError)
      } else if (failedWrites.size > 0) {
        reportSyncError(lastSyncError ?? 'Some changes could not be saved to Supabase.')
      } else if (queuedWrites.size === 0) {
        lastSyncError = null
        reportSyncSaved()
      }
    })
}

async function writeToSupabase(change: PendingWrite): Promise<void> {
  const { error } = await getSupabaseClient()
    .from(TABLE_NAME)
    .upsert(
      {
        user_id: change.userId,
        data_key: change.key,
        value: change.value,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,data_key' }
    )

  if (error) {
    throw error
  }
}

function getPendingWriteKey(userId: string, key: string): string {
  return `${userId}:${key}`
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown Supabase persistence error.'
}

function reportSyncSaving(): void {
  dispatchSyncEvent({ status: 'saving' })
}

function reportSyncSaved(): void {
  dispatchSyncEvent({ status: 'saved' })
}

function reportSyncError(error: string): void {
  lastSyncError = error
  dispatchSyncEvent({ status: 'error', error })
}

function dispatchSyncEvent(detail: UserDataSyncEvent): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<UserDataSyncEvent>(USER_DATA_SYNC_EVENT, { detail }))
  }
}
