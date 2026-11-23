import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '../types/user'

export const SETTINGS_STORAGE_KEY = 'ontrack-demo-settings'

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
