// Uses the demo profile as defaults and stores editable fields with app preferences.
import demoUser from '../data/demoUser.json'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '../types/user'

export const SETTINGS_STORAGE_KEY = 'ontrack-demo-settings'

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isUserProfile = (value: unknown): value is UserProfile =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  typeof value.email === 'string'

/** Loads the validated demo profile with locally saved name and email overrides. */
export async function getUserProfile(): Promise<UserProfile> {
  if (!isUserProfile(demoUser)) {
    throw new Error('The demo user profile is invalid.')
  }

  const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (!savedSettings) {
    return demoUser
  }

  let parsedSettings: unknown
  try {
    parsedSettings = JSON.parse(savedSettings)
  } catch {
    throw new Error('Saved user settings could not be read.')
  }

  if (!isRecord(parsedSettings)) {
    throw new Error('Saved user settings have an invalid format.')
  }

  const name = parsedSettings.studentName ?? demoUser.name
  const email = parsedSettings.studentEmail ?? demoUser.email
  if (typeof name !== 'string' || typeof email !== 'string') {
    throw new Error('Saved user profile is invalid.')
  }
export function getUserProfile(user: User): UserProfile {
  const fullName: unknown = user.user_metadata?.full_name
  const name: unknown = user.user_metadata?.name

  return {
    name: typeof fullName === 'string' && fullName.trim()
      ? fullName.trim()
      : typeof name === 'string'
        ? name.trim()
        : '',
    email: user.email?.trim() ?? ''
  }
}
