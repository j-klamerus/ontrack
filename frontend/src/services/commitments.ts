import demoCommitments from '../data/demoCommitments.json'
import {
  getEventCategories,
  getItemCategoryOverride
} from '../constants/eventCategories'
import { getConfirmedCommitments } from './reviewedSuggestions'
import type { Commitment, Priority } from '../types/commitment'
import type { EventCategory } from '../types/calendarEvent'

type DemoCommitment = Omit<Commitment, 'dueDate'> & { dueInDays: number }
type JsonRecord = Record<string, unknown>

const CUSTOM_COMMITMENTS_KEY = 'ontrack-custom-commitments'
const COMMITMENT_OVERRIDES_KEY = 'ontrack-commitment-overrides'
const DELETED_COMMITMENTS_KEY = 'ontrack-deleted-commitments'

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isPriority = (value: unknown): value is Priority =>
  value === 'High' || value === 'Medium' || value === 'Low'

const isEventCategory = (value: unknown): value is EventCategory =>
  typeof value === 'string' && getEventCategories().some((category) => category === value)

const isDemoCommitment = (value: unknown): value is DemoCommitment =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  typeof value.course === 'string' &&
  typeof value.dueInDays === 'number' &&
  typeof value.dueTime === 'string' &&
  isEventCategory(value.category) &&
  isPriority(value.priority) &&
  typeof value.completed === 'boolean' &&
  typeof value.sourceEmail === 'string'

const isCommitment = (value: unknown): value is Commitment =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  typeof value.course === 'string' &&
  typeof value.dueDate === 'string' &&
  typeof value.dueTime === 'string' &&
  isEventCategory(value.category) &&
  isPriority(value.priority) &&
  typeof value.completed === 'boolean' &&
  typeof value.sourceEmail === 'string'

const readCommitmentArray = (key: string): Commitment[] => {
  const saved = localStorage.getItem(key)
  if (!saved) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved commitments could not be read.')
  }

  if (!Array.isArray(parsed) || !parsed.every(isCommitment)) {
    throw new Error('Saved commitments have an invalid format.')
  }

  return parsed
}

const readDeletedCommitmentIds = (): number[] => {
  const saved = localStorage.getItem(DELETED_COMMITMENTS_KEY)
  if (!saved) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved deleted commitments could not be read.')
  }

  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'number')) {
    throw new Error('Saved deleted commitments have an invalid format.')
  }

  return parsed
}

const getIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export async function getCommitments(): Promise<Commitment[]> {
  if (!Array.isArray(demoCommitments) || !demoCommitments.every(isDemoCommitment)) {
    throw new Error('The demo commitment data is invalid.')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fixtureCommitments = demoCommitments.map(({ dueInDays, ...commitment }) => {
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + dueInDays)

    return {
      ...commitment,
      category: getItemCategoryOverride('commitment', commitment.id) ?? commitment.category,
      dueDate: getIsoDate(dueDate)
    }
  })

  const overrides = new Map(
    readCommitmentArray(COMMITMENT_OVERRIDES_KEY).map((commitment) => [commitment.id, commitment])
  )
  const deletedIds = new Set(readDeletedCommitmentIds())
  const allCommitments = [
    ...fixtureCommitments,
    ...getConfirmedCommitments(),
    ...readCommitmentArray(CUSTOM_COMMITMENTS_KEY)
  ]
  const existingCommitments = allCommitments.map((commitment) => {
    const updated = overrides.get(commitment.id) ?? commitment

    return {
      ...updated,
      category: getItemCategoryOverride('commitment', commitment.id) ?? updated.category
    }
  })

  return existingCommitments.filter((commitment) => !deletedIds.has(commitment.id))
}

export function addCommitment(commitment: Commitment): void {
  if (!isCommitment(commitment)) {
    throw new Error('The commitment data is invalid.')
  }

  const customCommitments = readCommitmentArray(CUSTOM_COMMITMENTS_KEY)
  if (customCommitments.some((item) => item.id === commitment.id)) {
    throw new Error('A commitment with this ID already exists.')
  }

  localStorage.setItem(
    CUSTOM_COMMITMENTS_KEY,
    JSON.stringify([...customCommitments, commitment])
  )
  localStorage.setItem(
    DELETED_COMMITMENTS_KEY,
    JSON.stringify(readDeletedCommitmentIds().filter((id) => id !== commitment.id))
  )
}

export function updateCommitment(commitment: Commitment): void {
  if (!isCommitment(commitment)) {
    throw new Error('The commitment data is invalid.')
  }

  const overrides = readCommitmentArray(COMMITMENT_OVERRIDES_KEY)
  localStorage.setItem(
    COMMITMENT_OVERRIDES_KEY,
    JSON.stringify([
      ...overrides.filter((item) => item.id !== commitment.id),
      commitment
    ])
  )
}

export function deleteCommitment(commitmentId: number): void {
  deleteCommitments([commitmentId])
}

export function deleteCommitments(commitmentIds: number[]): void {
  const idsToDelete = new Set(commitmentIds)
  if (idsToDelete.size === 0) {
    return
  }

  const customCommitments = readCommitmentArray(CUSTOM_COMMITMENTS_KEY)
    .filter((commitment) => !idsToDelete.has(commitment.id))
  const overrides = readCommitmentArray(COMMITMENT_OVERRIDES_KEY)
    .filter((commitment) => !idsToDelete.has(commitment.id))
  const deletedIds = readDeletedCommitmentIds()

  localStorage.setItem(CUSTOM_COMMITMENTS_KEY, JSON.stringify(customCommitments))
  localStorage.setItem(COMMITMENT_OVERRIDES_KEY, JSON.stringify(overrides))
  localStorage.setItem(
    DELETED_COMMITMENTS_KEY,
    JSON.stringify([...new Set([...deletedIds, ...idsToDelete])])
  )
}
