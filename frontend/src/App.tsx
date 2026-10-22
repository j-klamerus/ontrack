import { useState } from 'react'
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

type Page = 'Dashboard' | 'Inbox' | 'Commitments' | 'Calendar' | 'Settings'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard')

  const pages = {
    Dashboard: <Dashboard />,
    Inbox: <Inbox />,
    Commitments: <Commitments />,
    Calendar: <Calendar />,
    Settings: <Settings />
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
          {navigationItems.map(({ page, icon: Icon }) => (
            <button
              key={page}
              className={`nav-item ${currentPage === page ? 'active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{page}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${currentPage === 'Settings' ? 'active' : ''}`}
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

        {pages[currentPage]}
      </main>
    </div>
  )
}

export default App