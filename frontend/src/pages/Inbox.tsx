// Coordinates demo email loading, manual rule scans, derived signals, and Inbox filtering.
import { useEffect, useMemo, useState } from 'react'
import '../styles/Inbox.css'
import EmailListPanel from './inbox/EmailListPanel'
import MessageDetailPanel from './inbox/MessageDetailPanel'
import { getEmails, saveEmailReadStates, saveEmailReadState } from '../services/emails'
import { getEmailRules } from '../services/emailRules'
import { getEmailPriorityRules } from '../services/emailPriorityRules'
import { getEmailSpamSettings } from '../services/emailSpamSettings'
import {
  evaluateEmailRules,
  type EmailRuleEvaluation
} from '../services/emailRuleEvaluation'
import {
  generateSuggestedReply,
  getSuggestedReplies
} from '../services/suggestedReplies'
import type { EmailPriority, EmailSignal, StudentEmail } from '../types/email'
import type { EmailPriorityRule, EmailRule, EmailSpamRule } from '../types/emailRule'
import {
  signalOptions,
  type EmailFilter,
  type EmailSort,
  type PriorityFilter
} from './inbox/types'

type InboxProps = {
  onUnreadCountChange: (count: number) => void
}

// Ignore optional/custom rule labels when converting backend labels to baseline categories.
const isEmailSignal = (label: string): label is EmailSignal =>
  signalOptions.some((signal) => signal === label)

const prioritySortOrder: Record<EmailPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2
}

/** Owns Inbox scan state and turns backend rule results into visible categories and groups. */
function Inbox({ onUnreadCountChange }: InboxProps) {
  const [emails, setEmails] = useState<StudentEmail[]>([])
  const [emailRules, setEmailRules] = useState<EmailRule[]>([])
  const [priorityRules, setPriorityRules] = useState<EmailPriorityRule[]>([])
  const [spamRules, setSpamRules] = useState<EmailSpamRule[]>([])
  const [blockedSenders, setBlockedSenders] = useState<string[]>([])
  const [ruleEvaluations, setRuleEvaluations] = useState<EmailRuleEvaluation[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<EmailFilter>('All')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All')
  const [signalFilter, setSignalFilter] = useState<EmailSignal | 'All'>('All')
  const [sortBy, setSortBy] = useState<EmailSort>('category')
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [suggestedReplies, setSuggestedReplies] = useState<Record<string, string>>({})
  const [replyError, setReplyError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    // Load the bundled messages and browser-saved rules; do not classify until the user scans.
    const loadInbox = async () => {
      try {
        const loadedEmails = await getEmails()
        const loadedRules = getEmailRules()
        const loadedPriorityRules = getEmailPriorityRules()
        const loadedSpamSettings = getEmailSpamSettings()
        if (!isMounted) {
          return
        }

        setEmails(loadedEmails)
        setSelectedId(loadedEmails[0]?.id ?? null)
        setEmailRules(loadedRules)
        setPriorityRules(loadedPriorityRules)
        setSpamRules(loadedSpamSettings.rules)
        setBlockedSenders(loadedSpamSettings.blockedSenders)
        try {
          setSuggestedReplies(getSuggestedReplies())
        } catch (error) {
          setReplyError(error instanceof Error ? error.message : 'Unable to load suggested replies.')
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load emails.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadInbox()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    onUnreadCountChange(emails.filter((email) => !email.read).length)
  }, [emails, onUnreadCountChange])

  // Classification is user-triggered so emails remain untagged until a scan succeeds.
  const scanEmails = async () => {
    setIsScanning(true)
    setScanError(null)
    try {
      const results = await evaluateEmailRules(
        emails,
        emailRules,
        priorityRules,
        spamRules,
        blockedSenders
      )
      setRuleEvaluations(results)
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unable to scan emails.')
    } finally {
      setIsScanning(false)
    }
  }

  const evaluationsByEmailId = useMemo(
    () => new Map((ruleEvaluations ?? []).map((evaluation) => [evaluation.emailId, evaluation])),
    [ruleEvaluations]
  )

  // Only baseline category labels become signals; preserve Other as the no-specific-match fallback.
  const classifiedEmails = useMemo(
    () => emails.map((email) => {
      const evaluation = evaluationsByEmailId.get(email.id)
      const matchedSignals = [...new Set((evaluation?.labels ?? []).filter(isEmailSignal))]
      const signals: EmailSignal[] = matchedSignals.filter((signal) => signal !== 'Other')
      if (signals.length === 0 && evaluation && isEmailSignal(evaluation.groupLabel)) {
        signals.push(
          matchedSignals.includes('Other') || evaluation.groupLabel === 'Other'
            ? 'Other'
            : evaluation.groupLabel
        )
      }

      return {
        ...email,
        priority: ruleEvaluations === null ? null : evaluation?.priority ?? null,
        spamDetected: ruleEvaluations === null ? false : evaluation?.spamDetected ?? false,
        signals
      }
    }),
    [emails, evaluationsByEmailId, ruleEvaluations]
  )

  const labelsByEmailId = useMemo(
    () => new Map(
      (ruleEvaluations ?? []).map((evaluation) => [evaluation.emailId, evaluation.labels])
    ),
    [ruleEvaluations]
  )

  // Apply UI filters and search after scan-derived signals and rule labels are available.
  const filteredEmails = useMemo(() => {
    return classifiedEmails.filter((email) => {
      if (activeFilter === 'Important' && !email.important) {
        return false
      }

      if (activeFilter === 'Unread' && email.read) {
        return false
      }

      if (activeFilter === 'Spam' && !email.spam && !email.spamDetected) {
        return false
      }

      if (activeFilter === 'Suggested replies' && !suggestedReplies[email.id]) {
        return false
      }

      if (priorityFilter === 'None' && email.priority !== null) {
        return false
      }

      if (priorityFilter !== 'All' && priorityFilter !== 'None' && email.priority !== priorityFilter) {
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
        email.priority ?? '',
        email.signals.join(' '),
        email.summary,
        email.warning ?? '',
        email.read ? 'read' : 'unread',
        email.important ? 'important' : '',
        email.spam ? 'spam' : 'inbox',
        email.spamDetected ? 'spam detected' : ''
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query) ||
        (labelsByEmailId.get(email.id) ?? []).some((label) => label.toLowerCase().includes(query))
    })
  }, [activeFilter, classifiedEmails, labelsByEmailId, priorityFilter, searchTerm, signalFilter, suggestedReplies])

  const sortedFilteredEmails = useMemo(() => {
    const scanOrder = new Map(
      (ruleEvaluations ?? []).map((evaluation, index) => [evaluation.emailId, index])
    )
    const originalOrder = new Map(emails.map((email, index) => [email.id, index]))
    const getOrder = (id: number) =>
      scanOrder.get(id) ?? originalOrder.get(id) ?? Number.MAX_SAFE_INTEGER
    const getDate = (email: StudentEmail) => Date.parse(email.date) || 0
    const getPriorityRank = (email: StudentEmail) =>
      email.priority === null ? 3 : prioritySortOrder[email.priority]

    if (sortBy === 'priority') {
      return [...filteredEmails].sort(
        (left, right) =>
          getPriorityRank(left) - getPriorityRank(right) ||
          getDate(right) - getDate(left) ||
          getOrder(left.id) - getOrder(right.id)
      )
    }

    if (sortBy === 'date') {
      return [...filteredEmails].sort(
        (left, right) =>
          getDate(right) - getDate(left) ||
          getOrder(left.id) - getOrder(right.id)
      )
    }

    if (ruleEvaluations === null) {
      return filteredEmails
    }

    // Preserve the order returned by the backend after applying the user's inbox filters.
    return [...filteredEmails].sort(
      (left, right) =>
        getOrder(left.id) - getOrder(right.id)
    )
  }, [emails, filteredEmails, ruleEvaluations, sortBy])

  const emailGroups = useMemo(() => {
    if (ruleEvaluations === null || sortBy !== 'category') {
      return sortedFilteredEmails.length > 0
        ? [{ id: 'unscanned', label: 'Inbox', emails: sortedFilteredEmails }]
        : []
    }

    const groups = new Map<string, { id: string; label: string; emails: StudentEmail[] }>()

    sortedFilteredEmails.forEach((email) => {
      const evaluation = evaluationsByEmailId.get(email.id)
      const groupId = evaluation?.groupId ?? 'other'
      const group: { id: string; label: string; emails: StudentEmail[] } = groups.get(groupId) ?? {
        id: groupId,
        label: evaluation?.groupLabel ?? 'Other',
        emails: []
      }
      group.emails.push(email)
      groups.set(groupId, group)
    })

    return [...groups.values()]
  }, [evaluationsByEmailId, ruleEvaluations, sortedFilteredEmails, sortBy])

  const visibleSelectedId = sortedFilteredEmails.some((email) => email.id === selectedId)
    ? selectedId
    : sortedFilteredEmails[0]?.id ?? null

  const selectedEmail = sortedFilteredEmails.find((email) => email.id === visibleSelectedId) ?? null
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

  if (loadError) {
    return <section className="inbox-page" role="alert">{loadError}</section>
  }

  if (isLoading) {
    return <section className="inbox-page" role="status">Loading emails...</section>
  }

  return (
    <section className="inbox-page">
      <div className="inbox-shell">
        <EmailListPanel
          emails={emails}
          filteredEmails={filteredEmails}
          emailGroups={emailGroups}
          labelsByEmailId={labelsByEmailId}
          selectedId={visibleSelectedId}
          searchTerm={searchTerm}
          activeFilter={activeFilter}
          priorityFilter={priorityFilter}
          signalFilter={signalFilter}
          sortBy={sortBy}
          isScanned={ruleEvaluations !== null}
          isScanning={isScanning}
          scanError={scanError}
          hasActiveSearchFilters={hasActiveSearchFilters}
          onSelectEmail={setSelectedId}
          onSearchChange={setSearchTerm}
          onFilterChange={setActiveFilter}
          onPriorityChange={setPriorityFilter}
          onSignalChange={setSignalFilter}
          onSortChange={setSortBy}
          onClearFilters={clearSearchFilters}
          onMarkAllRead={markAllRead}
          onScanEmails={scanEmails}
        />

        <MessageDetailPanel
          email={selectedEmail}
          isScanned={ruleEvaluations !== null}
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