export type PlannerPage = 'calendar' | 'commitments'
export type PlannerPageChanges = Record<PlannerPage, boolean>

const STORAGE_KEY = 'ontrack-planner-page-changes'
export const PLANNER_NAVIGATION_EVENT = 'ontrack-planner-navigation-change'

const initialChanges: PlannerPageChanges = {
  calendar: false,
  commitments: false
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function getPlannerPageChanges(): PlannerPageChanges {
  const savedChanges = localStorage.getItem(STORAGE_KEY)
  if (!savedChanges) {
    return initialChanges
  }

  let parsedChanges: unknown
  try {
    parsedChanges = JSON.parse(savedChanges)
  } catch {
    throw new Error('Saved planner page activity could not be read.')
  }

  if (
    !isRecord(parsedChanges) ||
    (parsedChanges.calendar !== undefined && typeof parsedChanges.calendar !== 'boolean') ||
    (parsedChanges.commitments !== undefined && typeof parsedChanges.commitments !== 'boolean')
  ) {
    throw new Error('Saved planner page activity has an invalid format.')
  }

  return {
    calendar: parsedChanges.calendar === true,
    commitments: parsedChanges.commitments === true
  }
}

const saveChanges = (changes: PlannerPageChanges) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(changes))
  window.dispatchEvent(new Event(PLANNER_NAVIGATION_EVENT))
}

export function recordPlannerPageChange(page: PlannerPage): void {
  const changes = getPlannerPageChanges()
  saveChanges({ ...changes, [page]: true })
}

export function markPlannerPageVisited(page: PlannerPage): void {
  const changes = getPlannerPageChanges()
  if (!changes[page]) {
    return
  }

  saveChanges({ ...changes, [page]: false })
}
