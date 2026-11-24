import {
  getEventCategories,
  getItemCategoryOverride
} from '../constants/eventCategories'
import { getConfirmedCommitments } from './reviewedSuggestions'
import { getUserDataItem, setUserDataItem } from './userData'
import type { Commitment, Priority } from '../types/commitment'
import type { EventCategory } from '../types/calendarEvent'

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
  const saved = getUserDataItem(key)
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
  const saved = getUserDataItem(DELETED_COMMITMENTS_KEY)
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

/**
 * Combines confirmed suggestions and custom commitments with saved edits.
 */
export async function getCommitments(): Promise<Commitment[]> {
  const overrides = new Map(
    readCommitmentArray(COMMITMENT_OVERRIDES_KEY).map((commitment) => [commitment.id, commitment])
  )
  const deletedIds = new Set(readDeletedCommitmentIds())
  const allCommitments = [
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

/** Adds a new user-created commitment to browser storage. */
export function addCommitment(commitment: Commitment): void {
  if (!isCommitment(commitment)) {
    throw new Error('The commitment data is invalid.')
  }

  const customCommitments = readCommitmentArray(CUSTOM_COMMITMENTS_KEY)
  if (customCommitments.some((item) => item.id === commitment.id)) {
    throw new Error('A commitment with this ID already exists.')
  }

  setUserDataItem(
    CUSTOM_COMMITMENTS_KEY,
    JSON.stringify([...customCommitments, commitment])
  )
  setUserDataItem(
    DELETED_COMMITMENTS_KEY,
    JSON.stringify(readDeletedCommitmentIds().filter((id) => id !== commitment.id))
  )
}

/** Stores a full replacement record as an override for the matching commitment. */
export function updateCommitment(commitment: Commitment): void {
  if (!isCommitment(commitment)) {
    throw new Error('The commitment data is invalid.')
  }

  const overrides = readCommitmentArray(COMMITMENT_OVERRIDES_KEY)
  setUserDataItem(
    COMMITMENT_OVERRIDES_KEY,
    JSON.stringify([
      ...overrides.filter((item) => item.id !== commitment.id),
      commitment
    ])
  )
}

/** Deletes one commitment by delegating to the batch deletion path. */
export function moveCommitmentCategoryToOther(category: EventCategory): void {
  for (const key of [CUSTOM_COMMITMENTS_KEY, COMMITMENT_OVERRIDES_KEY]) {
    const saved = getUserDataItem(key)
    if (saved) {
      const commitments = readCommitmentArray(key)
      setUserDataItem(key, JSON.stringify(commitments.map((commitment) =>
        commitment.category === category ? { ...commitment, category: 'Other' } : commitment
      )))
    }
  }
}

export function deleteCommitment(commitmentId: number): void {
  deleteCommitments([commitmentId])
}

/** Removes custom records and overrides, then records deleted IDs for compatibility. */
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

  setUserDataItem(CUSTOM_COMMITMENTS_KEY, JSON.stringify(customCommitments))
  setUserDataItem(COMMITMENT_OVERRIDES_KEY, JSON.stringify(overrides))
  setUserDataItem(
    DELETED_COMMITMENTS_KEY,
    JSON.stringify([...new Set([...deletedIds, ...idsToDelete])])
  )
}
