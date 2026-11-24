import type { SettingsState } from './types'
import ToggleRow from './ToggleRow'
import GoogleCalendarConnectionCard from './GoogleCalendarConnectionCard'

type PreferenceSettingsCardsProps = {
  selectedCalendarId: string | null
  selectionLoading: boolean
  selectionError: string | null
  onCalendarChange: (calendarId: string) => void
  settings: SettingsState
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
}

function PreferenceSettingsCards({
  selectedCalendarId,
  selectionLoading,
  selectionError,
  onCalendarChange,
  settings,
  updateSetting
}: PreferenceSettingsCardsProps) {
  return (
    <>
      <div className="settings-card">
        <div className="card-header-row">
          <h3>Appearance</h3>
        </div>
        <div className="toggle-stack">
          <ToggleRow
            label="Dark theme"
            description="Use a darker color scheme throughout OnTrack."
            checked={settings.darkTheme}
            onChange={(checked) => updateSetting('darkTheme', checked)}
          />
        </div>
      </div>

      <div className="settings-card">
        <div className="card-header-row">
          <h3>Planner Key Defaults</h3>
        </div>
        <p className="field-note">
          Choose whether the Key starts open or closed on each page. You can still toggle it any time.
        </p>
        <div className="toggle-stack">
          <ToggleRow
            label="Dashboard Key open by default"
            description="Show the category and priority key when opening Dashboard."
            checked={settings.plannerKeyDefaults.dashboard}
            onChange={(checked) =>
              updateSetting('plannerKeyDefaults', {
                ...settings.plannerKeyDefaults,
                dashboard: checked
              })
            }
          />
          <ToggleRow
            label="Calendar Key open by default"
            description="Show the category and priority key when opening Calendar."
            checked={settings.plannerKeyDefaults.calendar}
            onChange={(checked) =>
              updateSetting('plannerKeyDefaults', {
                ...settings.plannerKeyDefaults,
                calendar: checked
              })
            }
          />
          <ToggleRow
            label="Commitments Key open by default"
            description="Show the category and priority key when opening Commitments."
            checked={settings.plannerKeyDefaults.commitments}
            onChange={(checked) =>
              updateSetting('plannerKeyDefaults', {
                ...settings.plannerKeyDefaults,
                commitments: checked
              })
            }
          />
        </div>
      </div>

      <GoogleCalendarConnectionCard
        selectedCalendarId={selectedCalendarId}
        selectionLoading={selectionLoading}
        selectionError={selectionError}
        onCalendarChange={onCalendarChange}
      />

      <div className="settings-card">
        <div className="card-header-row">
          <h3>Email Preferences</h3>
        </div>
        <div className="toggle-stack">
          <ToggleRow
            label="Priority email filtering"
            description="Focus on high-priority student messages first."
            checked={settings.priorityEmailFiltering}
            onChange={(checked) => updateSetting('priorityEmailFiltering', checked)}
          />
          <ToggleRow
            label="Highlight assignments"
            description="Surface academic work and submission reminders."
            checked={settings.highlightAssignments}
            onChange={(checked) => updateSetting('highlightAssignments', checked)}
          />
          <ToggleRow
            label="Highlight deadlines"
            description="Call attention to due dates and timing-sensitive messages."
            checked={settings.highlightDeadlines}
            onChange={(checked) => updateSetting('highlightDeadlines', checked)}
          />
          <ToggleRow
            label="Highlight important messages"
            description="Show key academic updates in a more visible way."
            checked={settings.highlightImportant}
            onChange={(checked) => updateSetting('highlightImportant', checked)}
          />
        </div>
      </div>

    </>
  )
}

export default PreferenceSettingsCards
