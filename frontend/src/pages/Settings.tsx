import { useState } from 'react'
import demoUser from '../data/demoUser.json'
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

const defaultSettings: SettingsState = {
  studentName: demoUser.name,
  studentEmail: demoUser.email,
  priorityEmailFiltering: true,
  highlightAssignments: true,
  highlightDeadlines: true,
  highlightImportant: true,
  spamWarnings: true,
  deadlineReminders: true,
  importantEmailNotifications: true,
  reminderTiming: '1 hour before',
  aiEmailSummaries: true,
  aiDeadlineDetection: true,
  emailAnalysisEnabled: true,
  plannerKeyDefaults: DEFAULT_PLANNER_KEY_DEFAULTS
}

type SettingsProps = {
  onLogOut: () => void
}

function Settings({ onLogOut }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)

      if (!storedSettings) {
        return defaultSettings
      }

      const parsedSettings = JSON.parse(storedSettings) as Partial<SettingsState>
      return {
        ...defaultSettings,
        ...parsedSettings,
        plannerKeyDefaults: {
          ...DEFAULT_PLANNER_KEY_DEFAULTS,
          ...(parsedSettings.plannerKeyDefaults ?? {})
        }
      }
    } catch {
      return defaultSettings
    }
  })
  const [saveMessage, setSaveMessage] = useState('')
  const [categories, setCategories] = useState<EventCategoryDefinition[]>(getEventCategoryDefinitions)
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState('#0f766e')
  const [categoryError, setCategoryError] = useState('')

  const refreshCategories = () => setCategories(getEventCategoryDefinitions())

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
  }

  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      setSaveMessage('Demo settings saved locally in your browser.')
    } catch {
      setSaveMessage('Unable to save demo settings in this browser.')
    }
  }

  const handleReset = () => {
    setSettings(defaultSettings)
    localStorage.removeItem(SETTINGS_STORAGE_KEY)
    setSaveMessage('Demo settings reset to defaults.')
  }

  const handleRestoreSuggestions = () => {
    try {
      resetDashboardSuggestionReviews()
      setSaveMessage('Suggestions restored. Reopen Dashboard, Commitments, or Calendar to review them again.')
    } catch {
      setSaveMessage('Unable to restore suggestions in this browser.')
    }
  }

  return (
    <section className="settings-page">
      {saveMessage && <div className="save-banner">{saveMessage}</div>}

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

        <button type="button" className="primary-button" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </section>
  )
}

export default Settings