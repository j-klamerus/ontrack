import { useEffect, useState } from 'react'
import {
  createCustomEventCategory,
  getEventCategoryDefinitions,
  moveCategoryOverridesToOther,
  saveCustomEventCategories
} from '../constants/eventCategories'
import {
  moveReviewedSuggestionCategoryToOther,
  resetDashboardSuggestionReviews
} from '../services/reviewedSuggestions'
import { getCalendarEvents } from '../services/calendarEvents'
import { getCommitments, moveCommitmentCategoryToOther } from '../services/commitments'
import {
  getSelectedGoogleCalendarId,
  resetSelectedGoogleCalendarId,
  saveSelectedGoogleCalendarId
} from '../services/googleCalendar'
import { recordPlannerPageChange } from '../services/plannerNavigation'
import { SETTINGS_STORAGE_KEY } from '../services/user'
import { DEFAULT_PLANNER_KEY_DEFAULTS } from '../services/plannerKeyPreferences'
import type { EventCategoryDefinition } from '../constants/eventCategories'
import CategorySettingsCard from './settings/CategorySettingsCard'
import PreferenceSettingsCards from './settings/PreferenceSettingsCards'
import type { SettingsState } from './settings/types'
import type { UserProfile } from '../types/user'
import '../styles/Settings.css'

const defaultSettings: SettingsState = {
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
  user: UserProfile
  userId: string
  onDirtyChange: (dirty: boolean) => void
  onLogOut: () => void
}

function Settings({ user, userId, onDirtyChange, onLogOut }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)

      if (!storedSettings) {
        return defaultSettings
      }

      const parsedSettings = JSON.parse(storedSettings) as Partial<SettingsState> & {
        studentName?: unknown
        studentEmail?: unknown
      }
      delete parsedSettings.studentName
      delete parsedSettings.studentEmail
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
  const [savedSettings, setSavedSettings] = useState(settings)
  const [saveMessage, setSaveMessage] = useState('')
  const [savedCategories, setSavedCategories] = useState<EventCategoryDefinition[]>(getEventCategoryDefinitions)
  const [categories, setCategories] = useState<EventCategoryDefinition[]>(savedCategories)
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null)
  const [selectionLoading, setSelectionLoading] = useState(true)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [calendarChanged, setCalendarChanged] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState('#0f766e')
  const [categoryError, setCategoryError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [reviewReset, setReviewReset] = useState(false)
  const [resetPreferences, setResetPreferences] = useState(true)
  const [resetCalendar, setResetCalendar] = useState(true)
  const [resetCategories, setResetCategories] = useState<string[]>([])
  const isDirty = calendarChanged ||
    JSON.stringify(settings) !== JSON.stringify(savedSettings) ||
    JSON.stringify(categories) !== JSON.stringify(savedCategories) ||
    categoryName.trim().length > 0

  useEffect(() => {
    let active = true
    getSelectedGoogleCalendarId(userId)
      .then((calendarId) => {
        if (active) setSelectedCalendarId(calendarId)
      })
      .catch((error: unknown) => {
        if (active) setSelectionError(error instanceof Error ? error.message : 'Unable to load your calendar choice.')
      })
      .finally(() => {
        if (active) setSelectionLoading(false)
      })
    return () => { active = false }
  }, [userId])

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  const handleAddCategory = () => {
    try {
      const category = createCustomEventCategory(categoryName, categoryColor, categories)
      setCategories((current) => [...current, category])
      setCategoryName('')
      setCategoryError('')
      setSaveMessage('Category added to your changes. Select Save Changes to apply it.')
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Unable to add this category.')
    }
  }

  const handleRemoveCategory = (category: EventCategoryDefinition) => {
    if (!category.isCustom) {
      return
    }

    setCategories((current) => current.filter((item) => item.name !== category.name))
    setCategoryError('')
    setSaveMessage('Category removal staged. Select Save Changes to apply it.')
  }

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value
    }))
  }

  const persistCategoryChanges = async (target: EventCategoryDefinition[], confirmRemoval: boolean) => {
    const stored = getEventCategoryDefinitions()
    if (JSON.stringify(stored) !== JSON.stringify(savedCategories)) {
      throw new Error('Categories changed in another tab. Reopen Settings before saving.')
    }

    const removed = stored.filter((category) =>
      category.isCustom && !target.some((item) => item.name === category.name)
    )
    if (removed.length > 0) {
      const [events, commitments] = await Promise.all([getCalendarEvents(), getCommitments()])
      const names = new Set(removed.map((category) => category.name))
      const eventCount = events.filter((event) => names.has(event.category)).length
      const commitmentCount = commitments.filter((commitment) => names.has(commitment.category)).length
      if (confirmRemoval && !window.confirm(
        `Remove ${removed.map((category) => `"${category.name}"`).join(', ')}? ` +
        `${eventCount + commitmentCount} local events and commitments will be reassigned to Other.`
      )) {
        return false
      }

      if (JSON.stringify(getEventCategoryDefinitions()) !== JSON.stringify(stored)) {
        throw new Error('Categories changed in another tab. Reopen Settings before saving.')
      }

      for (const category of removed) {
        moveCategoryOverridesToOther(category.name)
        moveReviewedSuggestionCategoryToOther(category.name)
        moveCommitmentCategoryToOther(category.name)
      }
      if (eventCount > 0) recordPlannerPageChange('calendar')
      if (commitmentCount > 0) recordPlannerPageChange('commitments')
    }

    saveCustomEventCategories(target.filter((category) => category.isCustom))
    setSavedCategories(target)
    return true
  }

  const handleSave = async () => {
    if (categoryName.trim()) {
      setCategoryError('Add the category or clear its name before saving.')
      return
    }
    setIsSaving(true)
    try {
      if (JSON.stringify(categories) !== JSON.stringify(savedCategories)) {
        if (!await persistCategoryChanges(categories, true)) return
      }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      setSavedSettings(settings)
      if (calendarChanged && selectedCalendarId) {
        await saveSelectedGoogleCalendarId(selectedCalendarId)
        setCalendarChanged(false)
      }
      setSaveMessage('Changes saved. Preferences and categories are stored in this browser.')
    } catch (error) {
      setSaveMessage(`${error instanceof Error ? error.message : 'Unable to save changes.'} Some changes may have been saved; review and try again.`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    setIsSaving(true)
    try {
      if (resetCategories.length > 0) {
        const target = savedCategories.filter((category) => !resetCategories.includes(category.name))
        if (JSON.stringify(target) !== JSON.stringify(savedCategories)) {
          await persistCategoryChanges(target, false)
        }
        setCategories((current) => current.filter((category) => !resetCategories.includes(category.name)))
      }
      if (resetPreferences) {
        localStorage.removeItem(SETTINGS_STORAGE_KEY)
        setSettings(defaultSettings)
        setSavedSettings(defaultSettings)
      }
      if (resetCalendar && !selectionLoading && !selectionError) {
        await resetSelectedGoogleCalendarId()
        setSelectedCalendarId(null)
        setCalendarChanged(false)
      }
      setReviewReset(false)
      setSaveMessage('Selected resets applied. Save any remaining changes.')
    } catch (error) {
      setSaveMessage(`${error instanceof Error ? error.message : 'Unable to reset settings.'} Some resets may have been applied; review and try again.`)
    } finally {
      setIsSaving(false)
    }
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

        <PreferenceSettingsCards
          user={user}
          selectedCalendarId={selectedCalendarId}
          selectionLoading={selectionLoading}
          selectionError={selectionError}
          onCalendarChange={(calendarId) => {
            setSelectedCalendarId(calendarId)
            setCalendarChanged(true)
            setSaveMessage('Calendar selection staged. Select Save Changes to apply it.')
          }}
          settings={settings}
          updateSetting={updateSetting}
        />
      </div>

      {reviewReset && (
        <section className="settings-card reset-review" aria-labelledby="reset-review-heading">
          <h3 id="reset-review-heading">Review resets</h3>
          <p>Choose what to reset. Applying these choices takes effect immediately.</p>
          <div className="reset-options">
            <label>
              <input type="checkbox" checked={resetPreferences} onChange={(event) => setResetPreferences(event.target.checked)} />
              Reset preference switches and planner key defaults
            </label>
            <label>
              <input type="checkbox" checked={resetCalendar && !selectionLoading && !selectionError} disabled={selectionLoading || !!selectionError} onChange={(event) => setResetCalendar(event.target.checked)} />
              Reset the On Track calendar choice (does not disconnect Google Calendar)
            </label>
            {[...savedCategories, ...categories]
              .filter((category, index, all) =>
                category.isCustom && all.findIndex((item) => item.name === category.name) === index
              )
              .map((category) => (
                <label key={category.name}>
                  <input
                    type="checkbox"
                    checked={resetCategories.includes(category.name)}
                    onChange={(event) => setResetCategories((current) =>
                      event.target.checked
                        ? [...current, category.name]
                        : current.filter((name) => name !== category.name)
                    )}
                  />
                  Remove {category.name}; local events and commitments using it will move to Other
                </label>
              ))}
          </div>
          <div className="reset-review-actions">
            <button type="button" className="secondary-button" disabled={isSaving} onClick={() => setReviewReset(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={isSaving || (!resetPreferences && !(resetCalendar && !selectionLoading && !selectionError) && resetCategories.length === 0)}
              onClick={handleReset}
            >
              Apply selected resets
            </button>
          </div>
        </section>
      )}

      <div className="settings-actions">
        <button type="button" className="settings-logout-button" onClick={onLogOut}>
          Log Out
        </button>

        <button type="button" className="secondary-button" onClick={handleRestoreSuggestions}>
          Restore Suggestions
        </button>

        <button
          type="button"
          className="secondary-button"
          disabled={isSaving || reviewReset}
          onClick={() => {
            setResetPreferences(true)
            setResetCalendar(true)
            setResetCategories([])
            setReviewReset(true)
          }}
        >
          Reset to Defaults
        </button>

        <button type="button" className="primary-button" disabled={isSaving || reviewReset} onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </section>
  )
}

export default Settings