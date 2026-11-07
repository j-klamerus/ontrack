import type { SettingsState } from './types'
import ToggleRow from './ToggleRow'

type PreferenceSettingsCardsProps = {
  settings: SettingsState
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
}

function PreferenceSettingsCards({ settings, updateSetting }: PreferenceSettingsCardsProps) {
  return (
    <>
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

      <div className="settings-card">
        <div className="card-header-row">
          <h3>Student Profile</h3>
        </div>
        <div className="field-group">
          <label htmlFor="student-name">
            Student name
            <input
              id="student-name"
              type="text"
              value={settings.studentName}
              onChange={(event) => updateSetting('studentName', event.target.value)}
            />
          </label>
          <label htmlFor="student-email">
            Email address
            <input
              id="student-email"
              type="email"
              value={settings.studentEmail}
              onChange={(event) => updateSetting('studentEmail', event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-header-row">
          <h3>Gmail Connection</h3>
          <span className="status-pill disconnected">Not connected</span>
        </div>
        <p className="field-note">
          This is a placeholder for future Google authentication. Gmail is not currently connected.
        </p>
        <button type="button" className="secondary-button">
          Connect Gmail (demo placeholder)
        </button>
      </div>

      <div className="settings-card">
        <div className="card-header-row">
          <h3>Google Calendar Connection</h3>
          <span className="status-pill disconnected">Not connected</span>
        </div>
        <p className="field-note">
          Calendar integration is not active yet. This area is reserved for future Google Calendar sync.
        </p>
        <button type="button" className="secondary-button">
          Connect Calendar (demo placeholder)
        </button>
      </div>

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
          <ToggleRow
            label="Spam warnings"
            description="Display warnings for suspicious or fake student emails."
            checked={settings.spamWarnings}
            onChange={(checked) => updateSetting('spamWarnings', checked)}
          />
        </div>
      </div>

      <div className="settings-card">
        <div className="card-header-row">
          <h3>Notification Preferences</h3>
        </div>
        <div className="toggle-stack">
          <ToggleRow
            label="Deadline reminders"
            description="Send a reminder before important academic deadlines."
            checked={settings.deadlineReminders}
            onChange={(checked) => updateSetting('deadlineReminders', checked)}
          />
          <ToggleRow
            label="Important email notifications"
            description="Alert you when a high-priority email needs attention."
            checked={settings.importantEmailNotifications}
            onChange={(checked) => updateSetting('importantEmailNotifications', checked)}
          />
        </div>
        <label className="select-field" htmlFor="reminder-timing">
          Reminder timing
          <select
            id="reminder-timing"
            value={settings.reminderTiming}
            onChange={(event) => updateSetting('reminderTiming', event.target.value as SettingsState['reminderTiming'])}
          >
            <option value="15 minutes before">15 minutes before</option>
            <option value="1 hour before">1 hour before</option>
            <option value="1 day before">1 day before</option>
          </select>
        </label>
      </div>

      <div className="settings-card">
        <div className="card-header-row">
          <h3>AI Preferences</h3>
        </div>
        <div className="toggle-stack">
          <ToggleRow
            label="Simulated AI email summaries"
            description="Use demo AI-generated summaries for important student emails."
            checked={settings.aiEmailSummaries}
            onChange={(checked) => updateSetting('aiEmailSummaries', checked)}
          />
          <ToggleRow
            label="Simulated deadline detection"
            description="Highlight assignments and due dates from demo email content."
            checked={settings.aiDeadlineDetection}
            onChange={(checked) => updateSetting('aiDeadlineDetection', checked)}
          />
        </div>
        <p className="field-note strong-note">
          OnTrack uses simulated AI to scan demo email content, summarize important messages, and detect deadlines or academic tasks. This does not access real Gmail messages.
        </p>
      </div>

      <div className="settings-card">
        <div className="card-header-row">
          <h3>Privacy Settings</h3>
        </div>
        <ToggleRow
          label="Simulated email analysis"
          description="Allow OnTrack to analyze demo student emails in the browser interface."
          checked={settings.emailAnalysisEnabled}
          onChange={(checked) => updateSetting('emailAnalysisEnabled', checked)}
        />
        <p className="field-note">
          No real Gmail or Google Calendar data is currently accessed. Demo processing only.
        </p>
      </div>
    </>
  )
}

export default PreferenceSettingsCards
