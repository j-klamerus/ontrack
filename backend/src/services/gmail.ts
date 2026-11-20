import type { gmail_v1 } from 'googleapis'

/** The compact Gmail shape passed to Gemini; it deliberately excludes Gmail's raw API object. */
export type EmailForAnalysis = {
  id: string
  threadId: string | null
  sender: string
  subject: string
  receivedAt: string | null
  body: string
}

const MAX_BODY_CHARACTERS = 12_000

/** Gmail encodes MIME body data as base64url rather than ordinary base64. */
function decodeBody(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8')
}

/** Walk multipart messages and prefer text/plain, falling back to stripped text/html. */
function findBody(part: gmail_v1.Schema$MessagePart | undefined): { plain: string; html: string } {
  if (!part) return { plain: '', html: '' }

  const current = part.body?.data
    ? (part.mimeType === 'text/plain'
      ? { plain: decodeBody(part.body.data), html: '' }
      : part.mimeType === 'text/html'
        ? { plain: '', html: decodeBody(part.body.data) }
        : { plain: '', html: '' })
    : { plain: '', html: '' }

  return (part.parts ?? []).reduce(
    (combined, child) => {
      const found = findBody(child)
      return { plain: combined.plain || found.plain, html: combined.html || found.html }
    },
    current,
  )
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** List message IDs, fetch details, and normalize Gmail MIME data for downstream analysis. */
export async function fetchRecentEmails(
  gmail: gmail_v1.Gmail,
  maxResults: number,
): Promise<EmailForAnalysis[]> {
  const listed = await gmail.users.messages.list({ userId: 'me', maxResults, q: 'in:anywhere -in:trash' })
  const ids = (listed.data.messages ?? []).flatMap((message) => message.id ? [message.id] : [])

  return Promise.all(ids.map(async (id) => {
    const response = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
    const message = response.data
    const headers = message.payload?.headers ?? []
    const header = (name: string) =>
      headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
    const bodyParts = findBody(message.payload)
    const body = bodyParts.plain || stripHtml(bodyParts.html)

    return {
      id,
      threadId: message.threadId ?? null,
      sender: header('From') || '(unknown sender)',
      subject: header('Subject') || '(no subject)',
      receivedAt: header('Date') || null,
      body: body.slice(0, MAX_BODY_CHARACTERS),
    }
  }))
}
