import { parseDashboardDateTime } from './types'

export const formatDateTime = (date: string, time: string) => {
  const dateTime = parseDashboardDateTime(date, time)
  if (!dateTime) return 'Date unavailable'

  return new Intl.DateTimeFormat('en-US', time
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric' }
  ).format(dateTime)
}
