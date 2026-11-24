// Coordinates scanned Gmail messages, manual rule scans, derived signals, and Inbox filtering.
import { useEffect, useMemo, useState } from 'react'
import '../styles/Inbox.css'
import EmailListPanel from './inbox/EmailListPanel'
import MessageDetailPanel from './inbox/MessageDetailPanel'
import { saveEmailReadStates, saveEmailReadState } from '../services/emails'
import { getEmailRules } from '../services/emailRules'
import { getEmailPriorityRules } from '../services/emailPriorityRules'
import { getEmailSpamSettings } from '../services/emailSpamSettings'
import { getInboxSortPreference, saveInboxSortPreference } from '../services/inboxPreferences'
import {
  createInboxScanSignature,
  DEFAULT_INBOX_VIEW_STATE,
  getInboxViewState,
  getSavedInboxScanState,
  saveInboxScanState,
  saveInboxViewState,
  type InboxViewState
} from '../services/inboxState'
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
  type EmailSort,
} from './inbox/types'
import { analyzeGmail, toStudentEmails, type GmailAnalysis } from '../services/gmailAnalysis'
import { saveGmailCommitmentSuggestions } from '../services/gmailCommitmentSuggestions'

type InboxProps = {
  onUnreadCountChange: (count: number) => void
  onGmailScanComplete: (summary: { totalEmails: number; highPriorityEmails: number }) => void
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
function Inbox({ onUnreadCountChange, onGmailScanComplete }: InboxProps) {
  const [emails, setEmails] = useState<StudentEmail[]>([])
  const [emailRules, setEmailRules] = useState<EmailRule[]>([])
  const [priorityRules, setPriorityRules] = useState<EmailPriorityRule[]>([])
  const [spamRules, setSpamRules] = useState<EmailSpamRule[]>([])
  const [blockedSenders, setBlockedSenders] = useState<string[]>([])
  const [ruleEvaluations, setRuleEvaluations] = useState<EmailRuleEvaluation[] | null>(null)
  const [classificationCleared, setClassificationCleared] = useState(false)
  const [scanSignature, setScanSignature] = useState<string | null>(null)
  const [viewState, setViewState] = useState<InboxViewState>(DEFAULT_INBOX_VIEW_STATE)
  const [sortBy, setSortBy] = useState<EmailSort>('category')
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [sortError, setSortError] = useState<string | null>(null)
  const [viewPersistenceError, setViewPersistenceError] = useState<string | null>(null)
  const [scanPersistenceError, setScanPersistenceError] = useState<string | null>(null)
  const [suggestedReplies, setSuggestedReplies] = useState<Record<string, string>>({})
  const [replyError, setReplyError] = useState<string | null>(null)
  const { searchTerm, activeFilter, priorityFilter, signalFilter, selectedId } = viewState
  const [gmailAnalyses, setGmailAnalyses] = useState<GmailAnalysis[] | null>(null)
  const [isAnalyzingGmail, setIsAnalyzingGmail] = useState(false)
  const [gmailAnalysisError, setGmailAnalysisError] = useState<string | null>(null)
  const [gmailPlannerMessage, setGmailPlannerMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    // Load Inbox settings without populating the list with bundled demo messages.
    const loadInbox = async () => {
      try {
        const loadedEmails: StudentEmail[] = []
        const loadedRules = getEmailRules()
        const loadedPriorityRules = getEmailPriorityRules()
        const loadedSpamSettings = getEmailSpamSettings()
        let loadedViewState = DEFAULT_INBOX_VIEW_STATE
        let loadedViewError: string | null = null
        try {
          loadedViewState = getInboxViewState() ?? DEFAULT_INBOX_VIEW_STATE
        } catch (error) {
          loadedViewError = error instanceof Error ? error.message : 'Unable to load Inbox view settings.'
        }

        let loadedScanState: ReturnType<typeof getSavedInboxScanState> = null
        let loadedScanSignature: string | null = null
        let loadedScanError: string | null = null
        try {
          loadedScanSignature = await createInboxScanSignature(
            loadedEmails,
            loadedRules,
            loadedPriorityRules,
            loadedSpamSettings.rules,
            loadedSpamSettings.blockedSenders
          )
          loadedScanState = getSavedInboxScanState(loadedScanSignature)
        } catch (error) {
          loadedScanError = error instanceof Error ? error.message : 'Unable to load saved Inbox scan results.'
        }

        if (!loadedScanState) {
          loadedViewState = {
            ...loadedViewState,
            priorityFilter: 'All',
            signalFilter: 'All'
          }
        }
        const selectedEmailId = loadedEmails.some((email) => email.id === loadedViewState.selectedId)
          ? loadedViewState.selectedId
          : loadedEmails[0]?.id ?? null
        loadedViewState = { ...loadedViewState, selectedId: selectedEmailId }

        let loadedSort: EmailSort = 'category'
        let loadedSortError: string | null = null
        try {
          loadedSort = getInboxSortPreference()
        } catch (error) {
          loadedSortError = error instanceof Error ? error.message : 'Unable to load Inbox sort preference.'
        }
        if (!isMounted) {
          return
        }

        setSortError(loadedSortError)
        setViewPersistenceError(loadedViewError)
        setScanPersistenceError(loadedScanError)
        setEmails(loadedEmails)
        setViewState(loadedViewState)
        setEmailRules(loadedRules)
        setPriorityRules(loadedPriorityRules)
        setSpamRules(loadedSpamSettings.rules)
        setBlockedSenders(loadedSpamSettings.blockedSenders)
        setSortBy(loadedSort)
        setRuleEvaluations(loadedScanState?.evaluations ?? null)
        setClassificationCleared(loadedScanState?.classificationCleared ?? false)
        setScanSignature(loadedScanSignature)
        try {
          saveInboxViewState(loadedViewState)
        } catch (error) {
          setViewPersistenceError(error instanceof Error ? error.message : 'Unable to save Inbox view settings.')
        }
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
      setClassificationCleared(false)
      if (gmailAnalyses !== null) {
        setScanSignature(null)
        setScanPersistenceError(null)
        return
      }
      try {
        const signature = await createInboxScanSignature(
          emails,
          emailRules,
          priorityRules,
          spamRules,
          blockedSenders
        )
        setScanSignature(signature)
        saveInboxScanState(results, false, signature)
        setScanPersistenceError(null)
      } catch (error) {
        setScanPersistenceError(error instanceof Error ? error.message : 'Unable to save Inbox scan results.')
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unable to scan emails.')
    } finally {
      setIsScanning(false)
    }
  }

  const changeSort = (nextSort: EmailSort) => {
    try {
      saveInboxSortPreference(nextSort)
      setSortBy(nextSort)
      setSortError(null)
    } catch (error) {
      setSortError(error instanceof Error ? error.message : 'Unable to save Inbox sort preference.')
    }
  }

  const hasCategoryPriorityResults = ruleEvaluations !== null && !classificationCleared
  const useGeminiAnalysis = gmailAnalyses !== null && ruleEvaluations === null && !classificationCleared

  const updateInboxView = (changes: Partial<InboxViewState>) => {
    const nextViewState = { ...viewState, ...changes }
    setViewState(nextViewState)
    if (gmailAnalyses !== null) {
      setViewPersistenceError(null)
      return
    }
    try {
      saveInboxViewState(nextViewState)
      setViewPersistenceError(null)
    } catch (error) {
      setViewPersistenceError(error instanceof Error ? error.message : 'Unable to save Inbox view settings.')
    }
  }

  const clearCategoriesAndPriorities = () => {
    setClassificationCleared(true)
    updateInboxView({ priorityFilter: 'All', signalFilter: 'All' })
    if (gmailAnalyses !== null) {
      setScanPersistenceError(null)
      return
    }
    if (ruleEvaluations === null || scanSignature === null) {
      setScanPersistenceError('The scan can be cleared for this session, but its results could not be saved.')
      return
    }

    try {
      saveInboxScanState(ruleEvaluations, true, scanSignature)
      setScanPersistenceError(null)
    } catch (error) {
      setScanPersistenceError(error instanceof Error ? error.message : 'Unable to save cleared Inbox scan results.')
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
      const matchedSignals = hasCategoryPriorityResults
        ? [...new Set((evaluation?.labels ?? []).filter(isEmailSignal))]
        : []
      const signals: EmailSignal[] = matchedSignals.filter((signal) => signal !== 'Other')
      if (signals.length === 0 && hasCategoryPriorityResults && evaluation && isEmailSignal(evaluation.groupLabel)) {
        signals.push(
          matchedSignals.includes('Other') || evaluation.groupLabel === 'Other'
            ? 'Other'
            : evaluation.groupLabel
        )
      }

      return {
        ...email,
        priority: hasCategoryPriorityResults
          ? evaluation?.priority ?? null
          : useGeminiAnalysis ? email.priority : null,
        spamDetected: ruleEvaluations === null ? false : evaluation?.spamDetected ?? false,
        signals: useGeminiAnalysis ? email.signals : signals
      }
    }),
    [emails, evaluationsByEmailId, hasCategoryPriorityResults, ruleEvaluations, useGeminiAnalysis]
  )

  const labelsByEmailId = useMemo(
    () => new Map(
      (hasCategoryPriorityResults ? ruleEvaluations ?? [] : [])
        .map((evaluation) => [evaluation.emailId, evaluation.labels])
    ),
    [hasCategoryPriorityResults, ruleEvaluations]
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

    if (!hasCategoryPriorityResults) {
      return filteredEmails
    }

    // Preserve the order returned by the backend after applying the user's inbox filters.
    return [...filteredEmails].sort(
      (left, right) =>
        getOrder(left.id) - getOrder(right.id)
    )
  }, [emails, filteredEmails, hasCategoryPriorityResults, ruleEvaluations, sortBy])

  const emailGroups = useMemo(() => {
    if (!hasCategoryPriorityResults || sortBy !== 'category') {
      return sortedFilteredEmails.length > 0
        ? [{ id: 'inbox', label: 'Inbox', emails: sortedFilteredEmails }]
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
  }, [evaluationsByEmailId, hasCategoryPriorityResults, sortedFilteredEmails, sortBy])

  const visibleSelectedId = sortedFilteredEmails.some((email) => email.id === selectedId)
    ? selectedId
    : sortedFilteredEmails[0]?.id ?? null

  const selectedEmail = sortedFilteredEmails.find((email) => email.id === visibleSelectedId) ?? null
  const suggestedReply = selectedEmail ? suggestedReplies[selectedEmail.id] ?? null : null

  const updateEmailState = (id: number, changes: Partial<StudentEmail>) => {
    if (changes.read !== undefined && gmailAnalyses === null) {
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
    updateInboxView({
      searchTerm: '',
      activeFilter: 'All',
      priorityFilter: 'All',
      signalFilter: 'All'
    })
  }

  const markAllRead = () => {
    const unreadIds = emails.filter((email) => !email.read).map((email) => email.id)
    if (unreadIds.length === 0) {
      return
    }

    try {
      if (gmailAnalyses === null) {
        saveEmailReadStates(unreadIds, true)
      }
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

  const handleAnalyzeGmail = async () => {
    setIsAnalyzingGmail(true)
    setGmailAnalysisError(null)
    setGmailPlannerMessage(null)
    try {
      const analyses = await analyzeGmail()
      const liveEmails = toStudentEmails(analyses)
      onGmailScanComplete({
        totalEmails: analyses.length,
        highPriorityEmails: analyses.filter((analysis) => analysis.priority === 'High').length
      })
      let plannerMessage: string
      let plannerError: string | null = null
      try {
        const addedCount = saveGmailCommitmentSuggestions(analyses)
        plannerMessage = addedCount > 0
          ? `${addedCount} dated commitment${addedCount === 1 ? '' : 's'} saved for review in the Commitments tab. Undated items stay in Inbox.`
          : 'No new dated commitments were found; undated items stay in Inbox.'
      } catch (error) {
        plannerMessage = ''
        plannerError = error instanceof Error
          ? `Gmail loaded, but commitment suggestions could not be saved: ${error.message}`
          : 'Gmail loaded, but commitment suggestions could not be saved.'
      }

      const nextViewState: InboxViewState = {
        ...viewState,
        searchTerm: '',
        activeFilter: 'All',
        priorityFilter: 'All',
        signalFilter: 'All',
        selectedId: liveEmails[0]?.id ?? null
      }
      setEmails(liveEmails)
      setGmailAnalyses(analyses)
      setRuleEvaluations(null)
      setClassificationCleared(false)
      setScanSignature(null)
      setScanError(null)
      setScanPersistenceError(null)
      setViewState(nextViewState)
      setViewPersistenceError(null)
      setGmailPlannerMessage(plannerMessage || null)
      if (plannerError) setGmailAnalysisError(plannerError)
    } catch (error) {
      setGmailAnalysisError(error instanceof Error ? error.message : 'Unable to analyze Gmail messages.')
    } finally {
      setIsAnalyzingGmail(false)
    }
  }

  if (isLoading) {
    return <section className="inbox-page" role="status">Loading emails...</section>
  }

  if (loadError) {
    return <section className="inbox-page" role="alert">{loadError}</section>
  }

  if (isLoading) {
    return <section className="inbox-page" role="status">Loading emails...</section>
  }

  return (
    <section className="inbox-page">
      <div className="gmail-analysis-toolbar">
        <div>
          <strong>Live Gmail analysis</strong>
          <span>
            {gmailAnalyses === null
              ? 'Fetch up to 20 recent messages. Email bodies and full analysis are not saved; dated commitment suggestions are saved for your review.'
              : `Showing ${emails.length} live Gmail messages. Email bodies are not saved; extracted dated commitments are available for review.`}
          </span>
        </div>
        <button type="button" className="action-button" onClick={handleAnalyzeGmail} disabled={isAnalyzingGmail}>
          {isAnalyzingGmail ? 'Fetching and analyzing...' : gmailAnalyses === null ? 'Analyze Gmail' : 'Refresh Gmail'}
        </button>
      </div>
      {gmailAnalysisError && <p className="gmail-analysis-error" role="alert">{gmailAnalysisError}</p>}
      {gmailPlannerMessage && <p className="gmail-analysis-status" role="status">{gmailPlannerMessage}</p>}
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
          isScanned={hasCategoryPriorityResults}
          hasScanResults={ruleEvaluations !== null}
          classificationCleared={classificationCleared}
          isScanning={isScanning}
          scanError={scanError}
          sortError={sortError}
          persistenceError={[viewPersistenceError, scanPersistenceError].filter(Boolean).join(' ') || null}
          hasActiveSearchFilters={hasActiveSearchFilters}
          isLiveGmail={gmailAnalyses !== null}
          onSelectEmail={(id) => updateInboxView({ selectedId: id })}
          onSearchChange={(nextSearchTerm) => updateInboxView({ searchTerm: nextSearchTerm })}
          onFilterChange={(nextFilter) => updateInboxView({ activeFilter: nextFilter })}
          onPriorityChange={(nextPriority) => updateInboxView({ priorityFilter: nextPriority })}
          onSignalChange={(nextSignal) => updateInboxView({ signalFilter: nextSignal })}
          onSortChange={changeSort}
          onClearCategoriesAndPriorities={clearCategoriesAndPriorities}
          onClearFilters={clearSearchFilters}
          onMarkAllRead={markAllRead}
          onScanEmails={scanEmails}
        />

        <MessageDetailPanel
          email={selectedEmail}
          isScanned={hasCategoryPriorityResults}
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
