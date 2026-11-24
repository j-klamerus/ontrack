import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import demoUser from '../data/demoUser.json'
import defaultSettingsData from '../data/defaultSettings.json'
import demoSettingsData from '../data/demoSettings.json'
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
import { getCalendarEvents, moveCalendarEventCategoryToOther } from '../services/calendarEvents'
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
import EmailRulesCard from './settings/EmailRulesCard'
import EmailPriorityRulesCard from './settings/EmailPriorityRulesCard'
import EmailSpamSettingsCard from './settings/EmailSpamSettingsCard'
import GmailConnectionCard from './settings/GmailConnectionCard'
import PreferenceSettingsCards from './settings/PreferenceSettingsCards'
import { getGmailConnectionStatus, startGmailConnection } from '../services/gmailAnalysis'
import { preserveSessionForGmailOAuthRedirect } from '../services/supabase'
import { getUserDataItem, removeUserDataItem, setUserDataItem } from '../services/userData'
import type { SettingsState } from './settings/types'
import type { UserProfile } from '../types/user'
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
  priorityEmailFiltering: true,
  highlightAssignments: true,
  highlightDeadlines: true,
  highlightImportant: true,
  spamWarnings: true,
  deadlineReminders: true,
  importantEmailNotifications: true,
  aiEmailSummaries: true,
  aiDeadlineDetection: true,
  emailAnalysisEnabled: true,
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
  user: UserProfile
  userId: string
  onDirtyChange: (dirty: boolean) => void
  onLogOut: () => void
  onThemeChange: (isDark: boolean) => void
  onUnsavedChangesChange: (hasUnsavedChanges: boolean) => void
  leaveConfirmationOpen: boolean
  onCancelLeave: () => void
  onLeaveAnyway: () => void
}

/** Saves general preferences here; categories and email rules manage their own storage. */
function Settings({
  user,
  userId,
  onDirtyChange,
  onLogOut,
  onThemeChange,
  onUnsavedChangesChange,
  leaveConfirmationOpen,
  onCancelLeave,
  onLeaveAnyway
}: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const storedSettings = getUserDataItem(SETTINGS_STORAGE_KEY)

      if (!storedSettings) {
        return demoSettings
      }

      const parsedSettings = JSON.parse(storedSettings) as Partial<SettingsState> & {
        studentName?: unknown
        studentEmail?: unknown
      }
      delete parsedSettings.studentName
      delete parsedSettings.studentEmail
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
  const [savedSettings, setSavedSettings] = useState(settings)
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(null)
  const [categories, setCategories] = useState<EventCategoryDefinition[]>(getEventCategoryDefinitions)
  const [savedCategories, setSavedCategories] = useState<EventCategoryDefinition[]>(getEventCategoryDefinitions)
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
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailBusy, setGmailBusy] = useState(false)
  const [gmailError, setGmailError] = useState<string | null>(null)

  useEffect(() => {
    getGmailConnectionStatus()
      .then(setGmailConnected)
      .catch((error: unknown) => {
        setGmailError(error instanceof Error ? error.message : 'Unable to check Gmail connection.')
      })
  }, [])

  const handleConnectGmail = async () => {
    setGmailBusy(true)
    setGmailError(null)
    try {
      const authorizationUrl = await startGmailConnection()
      await preserveSessionForGmailOAuthRedirect()
      window.location.assign(authorizationUrl)
    } catch (error) {
      setGmailError(error instanceof Error ? error.message : 'Unable to start Gmail authorization.')
      setGmailBusy(false)
    }
  }

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

  useEffect(() => {
    onUnsavedChangesChange(isDirty)
  }, [isDirty, onUnsavedChangesChange])

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
      const category = createCustomEventCategory(categoryName, categoryColor, categories)
      setCategories((current) => [...current, category])
      setCategoryName('')
      setCategoryError('')
      setSaveMessage({ text: 'Category added to your changes. Select Save Changes to apply it.', tone: 'unsaved' })
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
    setSaveMessage({ text: 'Category removal staged. Select Save Changes to apply it.', tone: 'unsaved' })
  }

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value
    }))
    setSaveMessage({ text: 'You have unsaved changes.', tone: 'unsaved' })
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
        moveCalendarEventCategoryToOther(category.name)
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
      if (calendarChanged && selectedCalendarId) {
        await saveSelectedGoogleCalendarId(selectedCalendarId)
      }
      setUserDataItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      setSavedSettings(settings)
      setCalendarChanged(false)
      onThemeChange(settings.darkTheme)
      setSaveMessage({ text: 'Your settings have been saved.', tone: 'success' })
      return true
    } catch (error) {
      setSaveMessage({
        text: error instanceof Error ? error.message : 'Unable to save settings.',
        tone: 'error'
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndLeave = async () => {
    if (await handleSave()) {
      onLeaveAnyway()
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
        removeUserDataItem(SETTINGS_STORAGE_KEY)
        setSettings(defaultSettings)
        setSavedSettings(defaultSettings)
        onThemeChange(defaultSettings.darkTheme)
      }
      // A confirmed reset clears the selection immediately without disconnecting Google.
      if (resetCalendar && !selectionLoading && !selectionError) {
        await resetSelectedGoogleCalendarId()
        setSelectedCalendarId(null)
        setCalendarChanged(false)
      }
      setReviewReset(false)
      setSaveMessage({ text: 'Selected resets applied. Save any remaining changes.', tone: 'success' })
    } catch (error) {
      setSaveMessage({
        text: `${error instanceof Error ? error.message : 'Unable to reset settings.'} Some resets may have been applied; review and try again.`,
        tone: 'error'
      })
    } finally {
      setIsSaving(false)
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
      <header className="settings-page-header">
        <div>
          <p className="settings-eyebrow">ON TRACK</p>
          <h1>Settings</h1>
          <p>Manage your Gmail connection, inbox rules, calendar, and preferences.</p>
        </div>
      </header>

      {saveMessage && (
        <div className={`save-banner save-banner-${saveMessage.tone}`} role="status" aria-live="polite">
          {saveMessage.tone === 'success' && <CheckCircle2 size={18} aria-hidden="true" />}
          <span>{saveMessage.text}</span>
        </div>
      )}

      <GmailConnectionCard
        connected={gmailConnected}
        busy={gmailBusy}
        error={gmailError}
        onConnect={handleConnectGmail}
      />

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

        {/* Rules have their own storage and save lifecycle, separate from general preferences. */}
        <EmailRulesCard />
        <EmailPriorityRulesCard />
        <EmailSpamSettingsCard />
        <PreferenceSettingsCards
          user={user}
          selectedCalendarId={selectedCalendarId}
          selectionLoading={selectionLoading}
          selectionError={selectionError}
          onCalendarChange={(calendarId) => {
            setSelectedCalendarId(calendarId)
            setCalendarChanged(true)
            setSaveMessage({ text: 'Calendar selection staged. Select Save Changes to apply it.', tone: 'unsaved' })
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

        <button
          type="button"
          className="primary-button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
        >
          {isDirty ? 'Save Changes' : 'Changes Saved'}
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
