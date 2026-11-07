import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getEventCategoryColor } from '../constants/eventCategories'
import {
  getPlannerKeyDefaultOpen,
  type PlannerKeyPage
} from '../services/plannerKeyPreferences'
import type { EventPriority } from '../types/calendarEvent'
import '../styles/PlannerKey.css'

type PlannerKeyProps = {
  categories: string[]
  page: PlannerKeyPage
}

const priorities: EventPriority[] = ['High', 'Medium', 'Low']

export function PlannerKey({ categories, page }: PlannerKeyProps) {
  const [isOpen, setIsOpen] = useState(() => getPlannerKeyDefaultOpen(page))

  return (
    <section
      className="planner-key planner-key-toggle"
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setIsOpen((open) => !open)
        }
      }}
      onClick={() => setIsOpen((open) => !open)}
    >
      <div className="planner-key-heading">
        <span>Key</span>
        {isOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </div>

      {isOpen && (
        <div className="planner-key-content">
          <div className="planner-key-row">
            <span className="planner-key-label">Type</span>
            <span className="planner-key-item">
              <i className="type-marker type-marker-event" aria-hidden="true" />
              Calendar event
            </span>
            <span className="planner-key-item">
              <i className="type-marker type-marker-commitment" aria-hidden="true" />
              Commitment
            </span>
          </div>
          <div className="planner-key-row">
            <span className="planner-key-label">Category</span>
            {categories.map((category) => (
              <span className="planner-key-item" key={category}>
                <i
                  className="planner-key-category-dot"
                  style={{ backgroundColor: getEventCategoryColor(category) }}
                  aria-hidden="true"
                />
                {category}
              </span>
            ))}
          </div>
          <div className="planner-key-row">
            <span className="planner-key-label">Priority</span>
            {priorities.map((priority) => (
              <span key={priority} className={`priority-badge priority-${priority.toLowerCase()}`}>
                {priority}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
