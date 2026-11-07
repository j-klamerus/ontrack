import type { Commitment, CommitmentStatus } from '../../types/commitment'

export const getStatus = (commitment: Commitment): CommitmentStatus => {
  if (commitment.completed) {
    return 'Completed'
  }

  const dueAt = new Date(`${commitment.dueDate}T${commitment.dueTime}:00`)

  return dueAt < new Date() ? 'Overdue' : 'Upcoming'
}

export const formatDueDate = (date: string, time: string) => {
  const dueAt = new Date(`${date}T${time}:00`)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(dueAt)
}
