/** Persist each On Track user's selected Google calendar for a single backend process. */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type Selection = { initialized: boolean; calendarId: string | null }

/** Serialize access and atomically replace selection files; null is an explicit reset. */
export class CalendarSelectionStore {
  private queue: Promise<void> = Promise.resolve()

  constructor(private readonly directory: string) {}

  private pathFor(userId: string): string {
    const name = createHash('sha256').update(userId).digest('hex')
    return join(this.directory, `${name}.json`)
  }

  private async read(userId: string): Promise<Selection> {
    let contents: string
    try {
      contents = await readFile(this.pathFor(userId), 'utf8')
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return { initialized: false, calendarId: null }
      }
      throw error
    }

    const value: unknown = JSON.parse(contents)
    if (
      typeof value !== 'object' || value === null ||
      !('calendarId' in value) ||
      (value.calendarId !== null && (typeof value.calendarId !== 'string' || !value.calendarId.trim()))
    ) {
      throw new Error('Stored Google Calendar selection is invalid.')
    }
    return { initialized: true, calendarId: value.calendarId }
  }

  /** Keep a failed operation from blocking later reads or writes. */
  private run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation)
    this.queue = result.then(() => undefined, () => undefined)
    return result
  }

  get(userId: string): Promise<Selection> {
    return this.run(() => this.read(userId))
  }

  /** Save a selection, optionally only when no selection or reset has been recorded. */
  set(userId: string, calendarId: string | null, onlyIfUnset = false): Promise<Selection> {
    return this.run(async () => {
      const current = await this.read(userId)
      if (onlyIfUnset && current.initialized) return current

      await mkdir(this.directory, { recursive: true })
      const destination = this.pathFor(userId)
      const temporary = join(this.directory, `${randomUUID()}.tmp`)
      try {
        await writeFile(temporary, JSON.stringify({ calendarId }), { flag: 'wx', mode: 0o600 })
        await rename(temporary, destination)
      } catch (error) {
        try {
          await unlink(temporary)
        } catch (cleanupError) {
          if (!(cleanupError instanceof Error && 'code' in cleanupError && cleanupError.code === 'ENOENT')) {
            throw new AggregateError([error, cleanupError], 'Unable to save or clean up the calendar selection.')
          }
        }
        throw error
      }
      return { initialized: true, calendarId }
    })
  }
}
