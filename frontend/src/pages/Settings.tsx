import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import demoUser from '../data/demoUser.json'
import defaultSettingsData from '../data/defaultSettings.json'
import demoSettingsData from '../data/demoSettings.json'
import {
  addCustomEventCategory,
  getEventCategoryDefinitions,
  moveCategoryOverridesToOther,
  removeCustomEventCategory
} from '../constants/eventCategories'
import {
  moveReviewedSuggestionCategoryToOther,
  resetDashboardSuggestionReviews
} from '../services/reviewedSuggestions'
import { getCalendarEvents } from '../services/calendarEvents'
import { getCommitments } from '../services/commitments'
import { recordPlannerPageChange } from '../services/plannerNavigation'
import { SETTINGS_STORAGE_KEY } from '../services/user'
import { DEFAULT_PLANNER_KEY_DEFAULTS } from '../services/plannerKeyPreferences'
import type { EventCategoryDefinition } from '../constants/eventCategories'
import CategorySettingsCard from './settings/CategorySettingsCard'
import PreferenceSettingsCards from './settings/PreferenceSettingsCards'
import type { SettingsState } from './settings/types'
import '../styles/Settings.css'

const isReminderTiming = (value: string): value is SettingsState['reminderTiming'] =>
  value === '15 minutes before' || value === '1 hour before' || value === '1 day before'

const defaultSettings: SettingsState = {
  studentName: demoUser.name,
  studentEmail: demoUser.email,
  ...defaultSettingsData.preferences,
  reminderTiming: isReminderTiming(defaultSettingsData.preferences.reminderTiming)
    ? defaultSettingsData.preferences.reminderTiming
    : '1 hour before',
  plannerKeyDefaults: DEFAULT_PLANNER_KEY_DEFAULTS
}

const demoSettings: SettingsState = {
  ...defaultSettings,
  ...demoSettingsData.preferences,
  reminderTiming: isReminderTiming(demoSettingsData.preferences.reminderTiming)
    ? demoSettingsData.preferences.reminderTiming
    : defaultSettings.reminderTiming,
  plannerKeyDefaults: {
    ...DEFAULT_PLANNER_KEY_DEFAULTS,
    ...demoSettingsData.plannerKeyDefaults
  }
}

type SaveMessage = {
  text: string
  tone: 'success' | 'error' | 'unsaved'
}

type SettingsProps = {
  onLogOut: () => void
  onUnsavedChangesChange: (hasUnsavedChanges: boolean) => void
  leaveConfirmationOpen: boolean
  onCancelLeave: () => void
  onLeaveAnyway: () => void
}

function Settings({
  onLogOut,
  onUnsavedChangesChange,
  leaveConfirmationOpen,
  onCancelLeave,
  onLeaveAnyway
}: SettingsProps) {
  const [initialSettings] = useState<SettingsState>(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)

      if (!storedSettings) {
        return demoSettings
      }

      const parsedSettings = JSON.parse(storedSettings) as Partial<SettingsState>
      return {
        ...demoSettings,
        ...parsedSettings,
        plannerKeyDefaults: {
          ...demoSettings.plannerKeyDefaults,
          ...(parsedSettings.plannerKeyDefaults ?? {})
        }
      }
    } catch {
      return demoSettings
    }
  })
  const [settings, setSettings] = useState(initialSettings)
  const [savedSettings, setSavedSettings] = useState(initialSettings)
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(null)
  const [categories, setCategories] = useState<EventCategoryDefinition[]>(getEventCategoryDefinitions)
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState('#0f766e')
  const [categoryError, setCategoryError] = useState('')

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings)
  const refreshCategories = () => setCategories(getEventCategoryDefinitions())

  useEffect(() => {
    onUnsavedChangesChange(hasUnsavedChanges)
  }, [hasUnsavedChanges, onUnsavedChangesChange])

  useEffect(() => {
    if (!leaveConfirmationOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancelLeave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [leaveConfirmationOpen, onCancelLeave])

  const handleAddCategory = () => {
    try {
      addCustomEventCategory(categoryName, categoryColor)
      refreshCategories()
      setCategoryName('')
      setCategoryError('')
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Unable to add this category.')
    }
  }

  const handleRemoveCategory = async (category: EventCategoryDefinition) => {
    if (!category.isCustom) {
      return
    }

    try {
      const [events, commitments] = await Promise.all([getCalendarEvents(), getCommitments()])
      const affectedEventCount = events.filter((item) => item.category === category.name).length
      const affectedCommitmentCount = commitments.filter((item) => item.category === category.name).length
      const affectedCount = affectedEventCount + affectedCommitmentCount
      const affectedItems = affectedCount === 1 ? '1 item' : `${affectedCount} items`
      const warning = affectedCount > 0
        ? ` ${affectedItems} use this category and will be reassigned to Other.`
        : ''

      if (!window.confirm(`Delete "${category.name}"?${warning}`)) {
        return
      }

      moveCategoryOverridesToOther(category.name)
      moveReviewedSuggestionCategoryToOther(category.name)
      removeCustomEventCategory(category.name)
      refreshCategories()
      if (affectedEventCount > 0) {
        recordPlannerPageChange('calendar')
      }
      if (affectedCommitmentCount > 0) {
        recordPlannerPageChange('commitments')
      }
      setCategoryError('')
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Unable to remove this category.')
    }
  }

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value
    }))
    setSaveMessage({ text: 'You have unsaved changes.', tone: 'unsaved' })
  }

  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      setSavedSettings(settings)
      setSaveMessage({ text: 'Your settings have been saved.', tone: 'success' })
      return true
    } catch {
      setSaveMessage({ text: 'Unable to save settings in this browser.', tone: 'error' })
      return false
    }
  }

  const handleSaveAndLeave = () => {
    if (handleSave()) {
      onLeaveAnyway()
    }
  }

  const handleReset = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings))
      setSettings(defaultSettings)
      setSavedSettings(defaultSettings)
      setSaveMessage({ text: 'Settings have been reset to defaults.', tone: 'success' })
    } catch {
      setSaveMessage({ text: 'Unable to reset settings in this browser.', tone: 'error' })
    }
  }

  const handleRestoreSuggestions = () => {
    try {
      resetDashboardSuggestionReviews()
      setSaveMessage({
        text: 'Suggestions restored. Reopen Dashboard, Commitments, or Calendar to review them again.',
        tone: 'success'
      })
    } catch {
      setSaveMessage({ text: 'Unable to restore suggestions in this browser.', tone: 'error' })
    }
  }

  return (
    <section className="settings-page">
      {saveMessage && (
        <div className={`save-banner save-banner-${saveMessage.tone}`} role="status" aria-live="polite">
          {saveMessage.tone === 'success' && <CheckCircle2 size={18} aria-hidden="true" />}
          <span>{saveMessage.text}</span>
        </div>
      )}

      <div className="settings-grid">
        <CategorySettingsCard
          categories={categories}
          categoryName={categoryName}
          categoryColor={categoryColor}
          categoryError={categoryError}
          onCategoryNameChange={setCategoryName}
          onCategoryColorChange={setCategoryColor}
          onAddCategory={handleAddCategory}
          onRemoveCategory={handleRemoveCategory}
        />

        <PreferenceSettingsCards settings={settings} updateSetting={updateSetting} />
      </div>

      <div className="settings-actions">
        <button type="button" className="settings-logout-button" onClick={onLogOut}>
          Log Out
        </button>

        <button type="button" className="secondary-button" onClick={handleRestoreSuggestions}>
          Restore Suggestions
        </button>

        <button type="button" className="secondary-button" onClick={handleReset}>
          Reset to Defaults
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
        >
          {hasUnsavedChanges ? 'Save Changes' : 'Changes Saved'}
        </button>
      </div>

      {leaveConfirmationOpen && (
        <div className="settings-leave-backdrop" onClick={onCancelLeave}>
          <div
            className="settings-leave-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-leave-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-leave-header">
              <h2 id="settings-leave-title">Unsaved changes</h2>
            </div>
            <p>Your settings haven&apos;t been saved. What would you like to do?</p>
            <div className="settings-leave-actions">
              <button type="button" className="secondary-button" onClick={onCancelLeave}>
                Cancel
              </button>
              <button type="button" className="settings-leave-discard-button" onClick={onLeaveAnyway}>
                Leave Anyway
              </button>
              <button type="button" className="primary-button" onClick={handleSaveAndLeave}>
                Save and Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Settings