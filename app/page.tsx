'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  FiMessageSquare,
  FiSend,
  FiPlus,
  FiMenu,
  FiX,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
  FiTrash2,
  FiCpu,
  FiChevronRight,
  FiZap,
  FiHelpCircle,
  FiSmile,
  FiBookOpen,
} from 'react-icons/fi'

// ---------- Constants ----------
const CHAT_AGENT_ID = '699b595299a581580fa6037c'

// ---------- Types ----------
interface Message {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  timestamp: number
  retryMessage?: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

// ---------- Sample Data ----------
const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: 'sample-1',
    title: 'What can you help me with?',
    messages: [
      {
        id: 's1-m1',
        role: 'user',
        content: 'What can you help me with?',
        timestamp: Date.now() - 300000,
      },
      {
        id: 's1-m2',
        role: 'assistant',
        content:
          "I can help you with a wide range of tasks! Here are some things I can assist with:\n\n## Research & Information\n- Answering questions on various topics\n- Explaining complex concepts in simple terms\n- Providing summaries and analyses\n\n## Writing & Communication\n- Drafting emails, messages, and documents\n- Proofreading and improving text\n- Creative writing assistance\n\n## Problem Solving\n- Breaking down complex problems\n- Brainstorming ideas and solutions\n- Technical troubleshooting guidance\n\nFeel free to ask me anything!",
        timestamp: Date.now() - 298000,
      },
    ],
    createdAt: Date.now() - 300000,
  },
  {
    id: 'sample-2',
    title: 'Explain quantum computing',
    messages: [
      {
        id: 's2-m1',
        role: 'user',
        content: 'Explain quantum computing in simple terms',
        timestamp: Date.now() - 600000,
      },
      {
        id: 's2-m2',
        role: 'assistant',
        content:
          "**Quantum computing** is a type of computing that uses the principles of quantum mechanics to process information.\n\n### Classical vs Quantum\n- **Classical computers** use bits that are either 0 or 1\n- **Quantum computers** use **qubits** that can be 0, 1, or both at the same time (superposition)\n\n### Key Concepts\n1. **Superposition** - A qubit can exist in multiple states simultaneously\n2. **Entanglement** - Qubits can be linked so that the state of one instantly affects the other\n3. **Interference** - Quantum states can combine to amplify correct answers and cancel wrong ones\n\n### Why It Matters\nQuantum computers can solve certain problems exponentially faster than classical computers, such as:\n- Drug discovery and molecular simulation\n- Cryptography and security\n- Optimization problems\n- Machine learning enhancements\n\nThink of it like this: if a classical computer tries every path in a maze one by one, a quantum computer can explore many paths simultaneously.",
        timestamp: Date.now() - 598000,
      },
    ],
    createdAt: Date.now() - 600000,
  },
  {
    id: 'sample-3',
    title: 'Tell me a joke',
    messages: [
      {
        id: 's3-m1',
        role: 'user',
        content: 'Tell me a joke',
        timestamp: Date.now() - 120000,
      },
      {
        id: 's3-m2',
        role: 'assistant',
        content:
          "Why do programmers prefer dark mode?\n\nBecause light attracts bugs!",
        timestamp: Date.now() - 118000,
      },
    ],
    createdAt: Date.now() - 120000,
  },
]

const SUGGESTED_PROMPTS = [
  { icon: FiHelpCircle, text: 'What can you help me with?' },
  { icon: FiSmile, text: 'Tell me a joke' },
  { icon: FiBookOpen, text: 'Explain quantum computing' },
  { icon: FiZap, text: 'Give me 5 productivity tips' },
]

// ---------- Helpers ----------
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function truncateTitle(text: string, maxLen: number = 32): string {
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen).trim() + '...'
}

// ---------- Markdown Renderer ----------
function formatInline(text: string) {
  const codeParts = text.split(/`([^`]+)`/g)
  const withCode = codeParts.map((part, ci) =>
    ci % 2 === 1 ? (
      <code key={`c-${ci}`} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
        {part}
      </code>
    ) : (
      part
    )
  )

  const result: React.ReactNode[] = []
  withCode.forEach((segment, si) => {
    if (typeof segment !== 'string') {
      result.push(segment)
      return
    }
    const boldParts = segment.split(/\*\*(.*?)\*\*/g)
    boldParts.forEach((bp, bi) => {
      if (bi % 2 === 1) {
        result.push(
          <strong key={`b-${si}-${bi}`} className="font-semibold">
            {bp}
          </strong>
        )
      } else {
        result.push(bp)
      }
    })
  })
  return result
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm leading-relaxed">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ---------- Extract response text ----------
function extractResponseText(result: any): string {
  let responseText = ''
  try {
    if (result?.response?.result) {
      const resultData = result.response.result
      if (typeof resultData === 'string') {
        try {
          const parsed = JSON.parse(resultData)
          responseText = parsed.text || parsed.message || resultData
        } catch {
          responseText = resultData
        }
      } else if (typeof resultData === 'object' && resultData !== null) {
        responseText = resultData.text || resultData.message || JSON.stringify(resultData)
      }
    }
    if (!responseText) {
      responseText =
        result?.response?.message || result?.message || 'Sorry, I could not generate a response.'
    }
  } catch {
    responseText = 'An error occurred while processing the response.'
  }
  return responseText
}

// ---------- Error Boundary ----------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------- Typing Indicator ----------
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FiCpu className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

// ---------- Message Bubble ----------
function MessageBubble({
  message,
  onRetry,
}: {
  message: Message
  onRetry?: (msg: string) => void
}) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'

  return (
    <div className={`flex items-start gap-3 px-4 py-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-primary text-primary-foreground' : isError ? 'bg-destructive/10' : 'bg-primary/10'}`}
      >
        {isUser ? (
          <span className="text-xs font-semibold">You</span>
        ) : isError ? (
          <FiAlertCircle className="w-4 h-4 text-destructive" />
        ) : (
          <FiCpu className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 ${isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : isError ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : isError ? (
            <div className="space-y-2">
              <p className="text-sm">{message.content}</p>
              {onRetry && message.retryMessage && (
                <button
                  onClick={() => onRetry(message.retryMessage!)}
                  className="flex items-center gap-1.5 text-xs font-medium hover:underline"
                >
                  <FiRefreshCw className="w-3 h-3" />
                  Retry
                </button>
              )}
            </div>
          ) : (
            renderMarkdown(message.content)
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

// ---------- Welcome Screen ----------
function WelcomeScreen({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <FiMessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Chabbychatbot</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Start a conversation by typing a message below or choose one of the suggested prompts to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTED_PROMPTS.map((prompt, idx) => {
            const IconComp = prompt.icon
            return (
              <button
                key={idx}
                onClick={() => onPromptClick(prompt.text)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200 text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <IconComp className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground font-medium">{prompt.text}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------- Agent Info ----------
function AgentInfoSection({ activeAgentId }: { activeAgentId: string | null }) {
  const isActive = activeAgentId === CHAT_AGENT_ID

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <FiCpu className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Powered by</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
        <span className="text-xs text-foreground font-medium truncate">Chat Agent</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-auto">
          {isActive ? 'Active' : 'Ready'}
        </Badge>
      </div>
    </div>
  )
}

// ---------- Main Page ----------
export default function Page() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSampleData, setShowSampleData] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initializedTimestamp = useRef(false)
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('')

  // Initialize timestamp client-side only
  useEffect(() => {
    if (!initializedTimestamp.current) {
      initializedTimestamp.current = true
      setCurrentTimestamp(new Date().toLocaleDateString())
    }
  }, [])

  // Derived state
  const displayConversations = showSampleData && conversations.length === 0 ? SAMPLE_CONVERSATIONS : conversations
  const activeConversation = displayConversations.find((c) => c.id === activeConversationId) ?? null
  const messages = activeConversation?.messages ?? []

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [inputValue])

  // Create a new conversation
  const createConversation = useCallback((): string => {
    const newId = generateId()
    const newConvo: Conversation = {
      id: newId,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
    }
    setConversations((prev) => [newConvo, ...prev])
    setActiveConversationId(newId)
    setSidebarOpen(false)
    return newId
  }, [])

  // Handle new chat
  const handleNewChat = useCallback(() => {
    createConversation()
    setInputValue('')
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [createConversation])

  // Send a message
  const sendMessage = useCallback(
    async (text: string, convoId?: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      let targetId = convoId ?? activeConversationId
      if (!targetId || showSampleData) {
        // Create a real conversation if we're on sample data or have no active convo
        targetId = generateId()
        const newConvo: Conversation = {
          id: targetId,
          title: truncateTitle(trimmed),
          messages: [],
          createdAt: Date.now(),
        }
        setConversations((prev) => [newConvo, ...prev])
        setActiveConversationId(targetId)
        if (showSampleData) {
          setShowSampleData(false)
        }
      }

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      }

      // Add user message and update title if it's the first message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetId) return c
          const isFirst = c.messages.length === 0
          return {
            ...c,
            title: isFirst ? truncateTitle(trimmed) : c.title,
            messages: [...c.messages, userMsg],
          }
        })
      )

      setInputValue('')
      setIsLoading(true)
      setActiveAgentId(CHAT_AGENT_ID)
      setSidebarOpen(false)

      try {
        const result = await callAIAgent(trimmed, CHAT_AGENT_ID)

        if (result.success) {
          const responseText = extractResponseText(result)
          const assistantMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: responseText,
            timestamp: Date.now(),
          }
          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetId ? { ...c, messages: [...c.messages, assistantMsg] } : c
            )
          )
        } else {
          const errorMsg: Message = {
            id: generateId(),
            role: 'error',
            content: result?.error || result?.response?.message || 'Failed to get a response. Please try again.',
            timestamp: Date.now(),
            retryMessage: trimmed,
          }
          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetId ? { ...c, messages: [...c.messages, errorMsg] } : c
            )
          )
        }
      } catch (err) {
        const errorMsg: Message = {
          id: generateId(),
          role: 'error',
          content: 'A network error occurred. Please check your connection and try again.',
          timestamp: Date.now(),
          retryMessage: trimmed,
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetId ? { ...c, messages: [...c.messages, errorMsg] } : c
          )
        )
      } finally {
        setIsLoading(false)
        setActiveAgentId(null)
      }
    },
    [activeConversationId, isLoading, showSampleData]
  )

  // Handle retry
  const handleRetry = useCallback(
    (retryText: string) => {
      sendMessage(retryText)
    },
    [sendMessage]
  )

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(inputValue)
      }
    },
    [inputValue, sendMessage]
  )

  // Delete a conversation
  const deleteConversation = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConversationId === id) {
        setActiveConversationId(null)
      }
    },
    [activeConversationId]
  )

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-background text-foreground overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:relative z-40 md:z-auto h-full w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          {/* Sidebar header */}
          <div className="p-4 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FiMessageSquare className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground text-sm">Chabbychatbot</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-md hover:bg-accent transition-colors"
              aria-label="Close sidebar"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* New chat button */}
          <div className="p-3">
            <Button
              onClick={handleNewChat}
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
            >
              <FiPlus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="px-2 pb-2 space-y-0.5">
                {displayConversations.length === 0 && (
                  <div className="px-3 py-8 text-center">
                    <FiMessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No conversations yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Start a new chat to begin</p>
                  </div>
                )}
                {displayConversations.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => {
                      setActiveConversationId(convo.id)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left group transition-colors duration-150 ${activeConversationId === convo.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                  >
                    <FiMessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                    <span className="text-sm truncate flex-1">{convo.title}</span>
                    {!showSampleData && (
                      <span
                        onClick={(e) => deleteConversation(convo.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                        aria-label="Delete conversation"
                      >
                        <FiTrash2 className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Agent Info */}
          <AgentInfoSection activeAgentId={activeAgentId} />

          {/* Sample data toggle */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <label htmlFor="sample-toggle" className="text-xs text-muted-foreground font-medium cursor-pointer">
                Sample Data
              </label>
              <Switch
                id="sample-toggle"
                checked={showSampleData}
                onCheckedChange={(checked) => {
                  setShowSampleData(checked)
                  if (checked) {
                    setActiveConversationId(SAMPLE_CONVERSATIONS[0]?.id ?? null)
                  } else {
                    if (conversations.length > 0) {
                      setActiveConversationId(conversations[0]?.id ?? null)
                    } else {
                      setActiveConversationId(null)
                    }
                  }
                }}
              />
            </div>
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card/50 backdrop-blur-sm flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-md hover:bg-accent transition-colors"
              aria-label="Open sidebar"
            >
              <FiMenu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FiChevronRight className="w-4 h-4 text-muted-foreground/50 hidden md:block" />
              <h1 className="text-sm font-semibold truncate">
                {activeConversation?.title || 'New Conversation'}
              </h1>
            </div>

            {activeConversation && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FiClock className="w-3 h-3" />
                <span className="text-[10px]">
                  {activeConversation.messages.length > 0
                    ? formatTime(activeConversation.messages[activeConversation.messages.length - 1]?.timestamp ?? 0)
                    : currentTimestamp}
                </span>
              </div>
            )}
          </header>

          {/* Messages area */}
          <div className="flex-1 overflow-hidden">
            {!activeConversation || messages.length === 0 ? (
              <WelcomeScreen
                onPromptClick={(text) => {
                  setInputValue(text)
                  sendMessage(text)
                }}
              />
            ) : (
              <ScrollArea className="h-full">
                <div className="py-4 space-y-1">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} onRetry={handleRetry} />
                  ))}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border p-4 bg-card/30 backdrop-blur-sm flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 bg-background border border-border rounded-2xl px-4 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Shift+Enter for new line)"
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground py-1.5 max-h-40 disabled:opacity-50"
                />
                <Button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  size="sm"
                  className="rounded-xl h-9 w-9 p-0 flex-shrink-0"
                >
                  {isLoading ? (
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiSend className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
                Press Enter to send, Shift+Enter for a new line
              </p>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
