import { useEffect, useMemo, useState } from 'react'
import '../styles/Inbox.css'
import EmailListPanel from './inbox/EmailListPanel'
import MessageDetailPanel from './inbox/MessageDetailPanel'
import { getEmails, saveEmailReadStates, saveEmailReadState } from '../services/emails'
import {
  generateSuggestedReply,
  getSuggestedReplies
} from '../services/suggestedReplies'
import type { EmailPriority, EmailSignal, StudentEmail } from '../types/email'
import type { EmailFilter } from './inbox/types'

type InboxProps = {
  onUnreadCountChange: (count: number) => void
}

function Inbox({ onUnreadCountChange }: InboxProps) {
  const [emails, setEmails] = useState<StudentEmail[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<EmailFilter>('All')
  const [priorityFilter, setPriorityFilter] = useState<EmailPriority | 'All'>('All')
  const [signalFilter, setSignalFilter] = useState<EmailSignal | 'All'>('All')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [suggestedReplies, setSuggestedReplies] = useState<Record<string, string>>({})
  const [replyError, setReplyError] = useState<string | null>(null)

  useEffect(() => {
    getEmails()
      .then((loadedEmails) => {
        setEmails(loadedEmails)
        setSelectedId(loadedEmails[0]?.id ?? null)
        try {
          setSuggestedReplies(getSuggestedReplies())
        } catch (error) {
          setReplyError(error instanceof Error ? error.message : 'Unable to load suggested replies.')
        }
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load emails.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    onUnreadCountChange(emails.filter((email) => !email.read).length)
  }, [emails, onUnreadCountChange])

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      if (activeFilter === 'Important' && !email.important) {
        return false
      }

      if (activeFilter === 'Unread' && email.read) {
        return false
      }

      if (activeFilter === 'Spam' && !email.spam) {
        return false
      }

      if (activeFilter === 'Suggested replies' && !suggestedReplies[email.id]) {
        return false
      }

      if (priorityFilter !== 'All' && email.priority !== priorityFilter) {
        return false
      }

      if (signalFilter !== 'All' && !email.signals.includes(signalFilter)) {
        return false
      }

      if (!searchTerm.trim()) {
        return true
      }

      const query = searchTerm.trim().toLowerCase()
      const searchableText = [
        email.sender,
        email.email,
        email.subject,
        email.preview,
        email.body,
        email.date,
        email.priority,
        email.signals.join(' '),
        email.summary,
        email.warning ?? '',
        email.read ? 'read' : 'unread',
        email.important ? 'important' : '',
        email.spam ? 'spam' : 'inbox'
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [activeFilter, emails, priorityFilter, searchTerm, signalFilter, suggestedReplies])

  const visibleSelectedId = filteredEmails.some((email) => email.id === selectedId)
    ? selectedId
    : filteredEmails[0]?.id ?? null

  const selectedEmail = filteredEmails.find((email) => email.id === visibleSelectedId) ?? null
  const suggestedReply = selectedEmail ? suggestedReplies[selectedEmail.id] ?? null : null

  const updateEmailState = (id: number, changes: Partial<StudentEmail>) => {
    if (changes.read !== undefined) {
      try {
        saveEmailReadState(id, changes.read)
        setLoadError(null)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to save email read status.')
        return
      }
    }

    setEmails((currentEmails) =>
      currentEmails.map((email) => (email.id === id ? { ...email, ...changes } : email))
    )
  }

  const toggleRead = (id: number) => {
    const email = emails.find((item) => item.id === id)

    if (!email) {
      return
    }

    updateEmailState(id, { read: !email.read })
  }

  const toggleImportant = (id: number) => {
    const email = emails.find((item) => item.id === id)

    if (!email) {
      return
    }

    updateEmailState(id, { important: !email.important })
  }

  const toggleSpam = (id: number) => {
    const email = emails.find((item) => item.id === id)

    if (!email) {
      return
    }

    updateEmailState(id, {
      spam: !email.spam,
      read: true,
      important: email.spam ? email.important : false
    })
  }

  const hasActiveSearchFilters =
    searchTerm.trim().length > 0 ||
    activeFilter !== 'All' ||
    priorityFilter !== 'All' ||
    signalFilter !== 'All'

  const clearSearchFilters = () => {
    setSearchTerm('')
    setActiveFilter('All')
    setPriorityFilter('All')
    setSignalFilter('All')
  }

  const markAllRead = () => {
    const unreadIds = emails.filter((email) => !email.read).map((email) => email.id)
    if (unreadIds.length === 0) {
      return
    }

    try {
      saveEmailReadStates(unreadIds, true)
      setEmails((currentEmails) =>
        currentEmails.map((email) => unreadIds.includes(email.id) ? { ...email, read: true } : email)
      )
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to mark all emails as read.')
    }
  }

  const handleGenerateReply = () => {
    if (!selectedEmail || suggestedReply) {
      return
    }

    try {
      const reply = generateSuggestedReply(selectedEmail)
      setSuggestedReplies((currentReplies) => ({
        ...currentReplies,
        [selectedEmail.id]: reply
      }))
      setReplyError(null)
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Unable to generate a reply.')
    }
  }

  const handleResolveReply = () => {
    if (!selectedEmail) {
      return
    }
    try {
      setSuggestedReplies(getSuggestedReplies())
      setReplyError(null)
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Unable to update suggested replies.')
    }
  }

  const handleSaveReply = (emailId: number, reply: string) => {
    setSuggestedReplies((currentReplies) => ({
      ...currentReplies,
      [emailId]: reply
    }))
    setReplyError(null)
  }

  if (isLoading) {
    return <section className="inbox-page" role="status">Loading emails...</section>
  }

  if (loadError) {
    return <section className="inbox-page" role="alert">{loadError}</section>
  }

  return (
    <section className="inbox-page">
      <div className="inbox-shell">
        <EmailListPanel
          emails={emails}
          filteredEmails={filteredEmails}
          selectedId={visibleSelectedId}
          searchTerm={searchTerm}
          activeFilter={activeFilter}
          priorityFilter={priorityFilter}
          signalFilter={signalFilter}
          hasActiveSearchFilters={hasActiveSearchFilters}
          onSelectEmail={setSelectedId}
          onSearchChange={setSearchTerm}
          onFilterChange={setActiveFilter}
          onPriorityChange={setPriorityFilter}
          onSignalChange={setSignalFilter}
          onClearFilters={clearSearchFilters}
          onMarkAllRead={markAllRead}
        />

        <MessageDetailPanel
          email={selectedEmail}
          suggestedReply={suggestedReply}
          replyError={replyError}
          onToggleRead={toggleRead}
          onToggleImportant={toggleImportant}
          onToggleSpam={toggleSpam}
          onGenerateReply={handleGenerateReply}
          onResolveReply={handleResolveReply}
          onSaveReply={handleSaveReply}
        />
      </div>
    </section>
  )
}

export default Inbox