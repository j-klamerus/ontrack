/** Record add-only Google syncs per On Track user and destination calendar. */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type LocalEventId = string | number
type SyncEntries = Record<string, LocalEventId>

function isSyncEntries(value: unknown): value is SyncEntries {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.entries(value).every(([id, source]) =>
      /^[0-9a-f]{64}$/.test(id) &&
      (typeof source === 'string' || (typeof source === 'number' && Number.isSafeInteger(source))))
}

/** Produce a stable Google-compatible ID for retrying the same local event. */
export function syncEventId(userId: string, calendarId: string, localEventId: LocalEventId): string {
  return createHash('sha256').update(JSON.stringify([userId, calendarId, localEventId])).digest('hex')
}

/** Serialize sync operations per user/calendar and persist source IDs with atomic replacement. */
export class CalendarSyncStore {
  private readonly queues = new Map<string, Promise<void>>()

  constructor(private readonly directory: string) {}

  private pathFor(userId: string, calendarId: string): string {
    const name = createHash('sha256').update(JSON.stringify([userId, calendarId])).digest('hex')
    return join(this.directory, `${name}.json`)
  }

  private async read(path: string): Promise<SyncEntries> {
    let contents: string
    try {
      contents = await readFile(path, 'utf8')
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return {}
      throw error
    }

    const value: unknown = JSON.parse(contents)
    if (!isSyncEntries(value)) {
      throw new Error('Stored Google Calendar sync records are invalid.')
    }
    return value
  }

  /** Allow independent calendars to proceed while serializing access to each record file. */
  private run<T>(path: string, operation: () => Promise<T>): Promise<T> {
    const result = (this.queues.get(path) ?? Promise.resolve()).then(operation)
    const settled = result.then(() => undefined, () => undefined)
    this.queues.set(path, settled)
    void settled.then(() => {
      if (this.queues.get(path) === settled) this.queues.delete(path)
    })
    return result
  }

  list(userId: string, calendarId: string): Promise<SyncEntries> {
    const path = this.pathFor(userId, calendarId)
    return this.run(path, () => this.read(path))
  }

  /**
   * Create once and record the result. A recorded ID is not recreated, even if the
   * Google event is later deleted. The caller handles recovery after an uncertain insert.
   */
  sync(
    userId: string,
    calendarId: string,
    localEventId: LocalEventId,
    create: (eventId: string) => Promise<'added' | 'already-synced'>
  ): Promise<'added' | 'already-synced'> {
    const path = this.pathFor(userId, calendarId)
    return this.run(path, async () => {
      const entries = await this.read(path)
      const id = syncEventId(userId, calendarId, localEventId)
      if (Object.hasOwn(entries, id)) return 'already-synced'
      const result = await create(id)
      entries[id] = localEventId
      await mkdir(this.directory, { recursive: true })
      const temporary = join(this.directory, `${randomUUID()}.tmp`)
      try {
        await writeFile(temporary, JSON.stringify(entries), { flag: 'wx', mode: 0o600 })
        await rename(temporary, path)
      } catch (error) {
        try {
          await unlink(temporary)
        } catch (cleanupError) {
          if (!(cleanupError instanceof Error && 'code' in cleanupError && cleanupError.code === 'ENOENT')) {
            throw new AggregateError([error, cleanupError], 'Unable to save or clean up calendar sync records.')
          }
        }
        throw error
      }
      return result
    })
  }
}
