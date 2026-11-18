import type { EventCategory } from '../types/calendarEvent'
import defaultSettingsData from '../data/defaultSettings.json'
import demoSettingsData from '../data/demoSettings.json'

export type EventCategoryDefinition = {
  name: EventCategory
  color: string
  isCustom: boolean
}

type StoredCategory = {
  name: string
  color: string
}

type CategoryOverride = {
  kind: 'event' | 'commitment'
  id: number
  category: EventCategory
}

const CATEGORY_STORAGE_KEY = 'ontrack-event-categories'
const CATEGORY_OVERRIDES_STORAGE_KEY = 'ontrack-category-overrides'

const defaultCategories: StoredCategory[] = defaultSettingsData.categories

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)

const readCustomCategories = (): StoredCategory[] => {
  const saved = localStorage.getItem(CATEGORY_STORAGE_KEY)
  if (!saved) {
    return demoSettingsData.categories
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved event categories could not be read.')
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) =>
      isRecord(item) &&
      typeof item.name === 'string' &&
      item.name.trim().length > 0 &&
      isHexColor(item.color)
    )
  ) {
    throw new Error('Saved event categories have an invalid format.')
  }

  const custom = parsed as StoredCategory[]
  const names = new Set(defaultCategories.map(({ name }) => name.toLowerCase()))
  for (const category of custom) {
    const normalizedName = category.name.trim().toLowerCase()
    if (names.has(normalizedName)) {
      throw new Error('Saved event categories contain duplicate names.')
    }
    names.add(normalizedName)
  }

  return custom.map(({ name, color }) => ({ name: name.trim(), color }))
}

const readCategoryOverrides = (): CategoryOverride[] => {
  const saved = localStorage.getItem(CATEGORY_OVERRIDES_STORAGE_KEY)
  if (!saved) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved category assignments could not be read.')
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) =>
      isRecord(item) &&
      (item.kind === 'event' || item.kind === 'commitment') &&
      typeof item.id === 'number' &&
      typeof item.category === 'string'
    )
  ) {
    throw new Error('Saved category assignments have an invalid format.')
  }

  return parsed as CategoryOverride[]
}

export const getEventCategoryDefinitions = (): EventCategoryDefinition[] => [
  ...defaultCategories.map((category) => ({ ...category, isCustom: false })),
  ...readCustomCategories().map((category) => ({ ...category, isCustom: true }))
]

export const getEventCategories = (): EventCategory[] =>
  getEventCategoryDefinitions().map(({ name }) => name)

export const getEventCategoryColor = (name: EventCategory): string =>
  getEventCategoryDefinitions().find((category) => category.name === name)?.color ??
  defaultCategories[defaultCategories.length - 1].color

export function addCustomEventCategory(name: string, color: string): void {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Enter a category name.')
  }
  if (trimmedName.length > 32) {
    throw new Error('Category names must be 32 characters or fewer.')
  }
  if (!isHexColor(color)) {
    throw new Error('Choose a valid category color.')
  }

  const categories = readCustomCategories()
  if (
    [...defaultCategories, ...categories].some(
      (category) => category.name.toLowerCase() === trimmedName.toLowerCase()
    )
  ) {
    throw new Error('A category with this name already exists.')
  }

  localStorage.setItem(
    CATEGORY_STORAGE_KEY,
    JSON.stringify([...categories, { name: trimmedName, color }])
  )
}

export function removeCustomEventCategory(name: string): void {
  const categories = readCustomCategories()
  if (!categories.some((category) => category.name === name)) {
    throw new Error('That custom category could not be found.')
  }
  localStorage.setItem(
    CATEGORY_STORAGE_KEY,
    JSON.stringify(categories.filter((category) => category.name !== name))
  )
}

export const getItemCategoryOverride = (
  kind: CategoryOverride['kind'],
  id: number
): EventCategory | undefined =>
  readCategoryOverrides().find((item) => item.kind === kind && item.id === id)?.category

export function saveItemCategoryOverride(
  kind: CategoryOverride['kind'],
  id: number,
  category: EventCategory
): void {
  const overrides = readCategoryOverrides()
  const existing = overrides.find((item) => item.kind === kind && item.id === id)
  const updated = existing
    ? overrides.map((item) => item === existing ? { ...item, category } : item)
    : [...overrides, { kind, id, category }]

  localStorage.setItem(CATEGORY_OVERRIDES_STORAGE_KEY, JSON.stringify(updated))
}

export function moveCategoryOverridesToOther(category: EventCategory): void {
  const updated = readCategoryOverrides().map((item) =>
    item.category === category ? { ...item, category: 'Other' } : item
  )
  localStorage.setItem(CATEGORY_OVERRIDES_STORAGE_KEY, JSON.stringify(updated))
}
