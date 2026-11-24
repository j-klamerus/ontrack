import type { Commitment, CommitmentStatus } from '../../types/commitment'

export const getStatus = (commitment: Commitment): CommitmentStatus => {
  if (commitment.completed) {
    return 'Completed'
  }

  const dueAt = new Date(
    commitment.dueTime
      ? `${commitment.dueDate}T${commitment.dueTime}:00`
      : `${commitment.dueDate}T23:59:59`
  )

  return dueAt < new Date() ? 'Overdue' : 'Upcoming'
}

export const formatDueDate = (date: string, time: string) => {
  const dueAt = new Date(time ? `${date}T${time}:00` : `${date}T00:00:00`)

  return new Intl.DateTimeFormat(
    'en-US',
    time
      ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  ).format(dueAt)
}
