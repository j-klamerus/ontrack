import { SETTINGS_STORAGE_KEY } from './user'

export type PlannerKeyPage = 'dashboard' | 'calendar' | 'commitments'

export type PlannerKeyDefaults = Record<PlannerKeyPage, boolean>

export const DEFAULT_PLANNER_KEY_DEFAULTS: PlannerKeyDefaults = {
  dashboard: false,
  calendar: true,
  commitments: false
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function getPlannerKeyDefaultOpen(
  page: PlannerKeyPage
): boolean {
  const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (!savedSettings) {
    return DEFAULT_PLANNER_KEY_DEFAULTS[page]
  }

  let parsedSettings: unknown
  try {
    parsedSettings = JSON.parse(savedSettings)
  } catch {
    throw new Error('Saved planner key settings could not be read.')
  }

  if (!isRecord(parsedSettings)) {
    throw new Error('Saved planner key settings have an invalid format.')
  }

  const plannerKeyDefaults = parsedSettings.plannerKeyDefaults
  if (isRecord(plannerKeyDefaults) && typeof plannerKeyDefaults[page] === 'boolean') {
    return plannerKeyDefaults[page]
  }

  return DEFAULT_PLANNER_KEY_DEFAULTS[page]
}
