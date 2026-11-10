import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Mail,
  ClipboardList,
  CalendarDays,
  Settings as SettingsIcon
} from 'lucide-react'
import './App.css'

import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import Commitments from './pages/Commitments'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import { getEmails } from './services/emails'
import { getDashboardSuggestions } from './services/dashboardSuggestions'
import {
  getPlannerPageChanges,
  markPlannerPageVisited,
  PLANNER_NAVIGATION_EVENT,
  type PlannerPage,
  type PlannerPageChanges
} from './services/plannerNavigation'

type Page = 'Dashboard' | 'Inbox' | 'Commitments' | 'Calendar' | 'Settings'
type SuggestionCounts = Record<PlannerPage, number>

type AppProps = {
  onLogOut: () => void
  authError: string | null
}

function App({ onLogOut, authError }: AppProps) {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard')
  const [unreadEmailCount, setUnreadEmailCount] = useState(0)
  const [navigationError, setNavigationError] = useState<string | null>(null)
  const [plannerPageChanges, setPlannerPageChanges] = useState<PlannerPageChanges>({
    calendar: false,
    commitments: false
  })
  const [suggestionCounts, setSuggestionCounts] = useState<SuggestionCounts>({
    calendar: 0,
    commitments: 0
  })

  useEffect(() => {
    let isMounted = true

    getEmails()
      .then((emails) => {
        if (isMounted) {
          setUnreadEmailCount(emails.filter((email) => !email.read).length)
          setNavigationError(null)
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setNavigationError(error instanceof Error ? error.message : 'Unable to load unread email count.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const refreshPlannerNavigation = () => {
      try {
        setPlannerPageChanges(getPlannerPageChanges())
      } catch (error) {
        if (isMounted) {
          setNavigationError(error instanceof Error ? error.message : 'Unable to load planner activity.')
        }
      }

      getDashboardSuggestions()
        .then((suggestions) => {
          if (isMounted) {
            setSuggestionCounts({
              calendar: suggestions.filter((suggestion) => suggestion.kind === 'Calendar event').length,
              commitments: suggestions.filter((suggestion) => suggestion.kind === 'Commitment').length
            })
          }
        })
        .catch((error: unknown) => {
          if (isMounted) {
            setNavigationError(error instanceof Error ? error.message : 'Unable to load planner suggestions.')
          }
        })
    }

    refreshPlannerNavigation()
    window.addEventListener(PLANNER_NAVIGATION_EVENT, refreshPlannerNavigation)

    return () => {
      isMounted = false
      window.removeEventListener(PLANNER_NAVIGATION_EVENT, refreshPlannerNavigation)
    }
  }, [])

  useEffect(() => {
    if (currentPage === 'Calendar' || currentPage === 'Commitments') {
      markPlannerPageVisited(currentPage.toLowerCase() as PlannerPage)
    }
  }, [currentPage])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'instant' })
  }, [currentPage])

  const pages = {
    Dashboard: <Dashboard />,
    Inbox: <Inbox onUnreadCountChange={setUnreadEmailCount} />,
    Commitments: <Commitments />,
    Calendar: <Calendar />,
    Settings: <Settings onLogOut={onLogOut} />
  }

  const navigationItems = [
    { page: 'Dashboard' as Page, icon: LayoutDashboard },
    { page: 'Inbox' as Page, icon: Mail },
    { page: 'Commitments' as Page, icon: ClipboardList },
    { page: 'Calendar' as Page, icon: CalendarDays }
  ]

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">On Track</div>

        <nav className="navigation">
          {navigationItems.map(({ page, icon: Icon }) => {
            const plannerPage = page === 'Calendar'
              ? 'calendar'
              : page === 'Commitments'
                ? 'commitments'
                : null

            return (
              <button
                key={page}
                className={`nav-item ${currentPage === page ? 'active' : ''} ${
                  plannerPage && plannerPageChanges[plannerPage] ? 'has-new-changes' : ''
                }`}
                aria-current={currentPage === page ? 'page' : undefined}
                aria-label={plannerPage && plannerPageChanges[plannerPage] ? `${page}, new changes` : undefined}
                onClick={() => setCurrentPage(page)}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{page}</span>
                {page === 'Inbox' && unreadEmailCount > 0 && (
                  <span
                    className="nav-unread-count"
                    aria-label={`${unreadEmailCount} unread emails`}
                    title="Unread emails"
                  >
                    {unreadEmailCount}
                  </span>
                )}
                {plannerPage && (
                  <>
                    {suggestionCounts[plannerPage] > 0 && (
                      <span
                        className="nav-suggestion-count"
                        aria-label={`${suggestionCounts[plannerPage]} pending suggestions`}
                        title={plannerPage === 'calendar' ? 'Suggested calendar events' : 'Suggested commitments'}
                      >
                        {suggestionCounts[plannerPage]}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>
        {navigationError && <p className="navigation-error" role="alert">{navigationError}</p>}

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${currentPage === 'Settings' ? 'active' : ''}`}
            aria-current={currentPage === 'Settings' ? 'page' : undefined}
            onClick={() => setCurrentPage('Settings')}
          >
            <SettingsIcon size={20} strokeWidth={1.8} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h1>{currentPage}</h1>
        </header>

        {authError && <p className="auth-error" role="alert">{authError}</p>}
        {pages[currentPage]}
      </main>
    </div>
  )
}

export default App