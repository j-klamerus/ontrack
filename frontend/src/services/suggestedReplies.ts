import demoSuggestedReplies from '../data/demoSuggestedReplies.json'
import type { StudentEmail } from '../types/email'

type SuggestedReplyRecord = {
  emailId: number
  reply: string
}

const STORAGE_KEY = 'ontrack-suggested-replies'
const REVIEWED_STORAGE_KEY = 'ontrack-reviewed-suggested-replies'
type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSuggestedReplyRecord = (value: unknown): value is SuggestedReplyRecord =>
  isRecord(value) &&
  typeof value.emailId === 'number' &&
  typeof value.reply === 'string'

const getDemoReplies = (): SuggestedReplyRecord[] => {
  if (!Array.isArray(demoSuggestedReplies) || !demoSuggestedReplies.every(isSuggestedReplyRecord)) {
    throw new Error('The demo suggested reply data is invalid.')
  }

  return demoSuggestedReplies
}

const getSavedReplies = (): Record<string, string> => {
  const savedReplies = localStorage.getItem(STORAGE_KEY)
  if (!savedReplies) {
    return {}
  }

  let parsedReplies: unknown
  try {
    parsedReplies = JSON.parse(savedReplies)
  } catch {
    throw new Error('Saved suggested replies could not be read.')
  }

  if (!isRecord(parsedReplies) || !Object.values(parsedReplies).every((reply) => typeof reply === 'string')) {
    throw new Error('Saved suggested replies have an invalid format.')
  }

  return Object.fromEntries(
    Object.entries(parsedReplies).map(([id, reply]) => [id, reply as string])
  )
}

export function getSuggestedReplies(): Record<string, string> {
  const demoReplies = Object.fromEntries(
    getDemoReplies().map(({ emailId, reply }) => [emailId, reply])
  )
  const replies = { ...demoReplies, ...getSavedReplies() }
  const reviewedIds = new Set(Object.keys(readReviewedReplies()))
  return Object.fromEntries(
    Object.entries(replies).filter(([emailId]) => !reviewedIds.has(emailId))
  )
}

export function saveSuggestedReply(emailId: number, reply: string): void {
  const savedReplies = getSavedReplies()
  const savedReviews = readReviewedReplies()
  delete savedReviews[emailId]

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...savedReplies, [emailId]: reply })
  )
  localStorage.setItem(REVIEWED_STORAGE_KEY, JSON.stringify(savedReviews))
}

const readReviewedReplies = (): Record<string, 'confirmed' | 'dismissed'> => {
  const savedReviews = localStorage.getItem(REVIEWED_STORAGE_KEY)
  if (!savedReviews) {
    return {}
  }

  let parsedReviews: unknown
  try {
    parsedReviews = JSON.parse(savedReviews)
  } catch {
    throw new Error('Saved suggested reply reviews could not be read.')
  }

  if (!isRecord(parsedReviews) || !Object.values(parsedReviews).every((status) =>
    status === 'confirmed' || status === 'dismissed'
  )) {
    throw new Error('Saved suggested reply reviews have an invalid format.')
  }

  return Object.fromEntries(
    Object.entries(parsedReviews).map(([id, status]) => [id, status as 'confirmed' | 'dismissed'])
  )
}

export function resolveSuggestedReply(emailId: number, status: 'confirmed' | 'dismissed'): void {
  const reviews = readReviewedReplies()
  localStorage.setItem(
    REVIEWED_STORAGE_KEY,
    JSON.stringify({ ...reviews, [emailId]: status })
  )
}

const getReplyBody = (email: StudentEmail): string => {
  if (email.warning || email.spam) {
    return `Hello ${email.sender},\n\nI’ll verify this message through an official campus channel before taking any action.\n\nBest,\n[Your name]`
  }

  if (email.signals.includes('Assignment') || email.signals.includes('Deadline')) {
    return `Hello ${email.sender},\n\nThank you for the reminder and for outlining the requirements. I’ll review the details and plan to complete the requested work by the deadline.\n\nBest,\n[Your name]`
  }

  if (email.signals.includes('Exam')) {
    return `Hello ${email.sender},\n\nThank you for the update. I’ve noted the exam details and will review the materials beforehand.\n\nBest,\n[Your name]`
  }

  if (email.signals.includes('Meeting')) {
    return `Hello ${email.sender},\n\nThank you for sharing the event details. I’ve noted the information and will follow up if I have any questions.\n\nBest,\n[Your name]`
  }

  return `Hello ${email.sender},\n\nThank you for your message. I appreciate the information and will follow up if I have any questions.\n\nBest,\n[Your name]`
}

export function generateSuggestedReply(email: StudentEmail): string {
  const reply = getReplyBody(email)
  saveSuggestedReply(email.id, reply)
  return reply
}
