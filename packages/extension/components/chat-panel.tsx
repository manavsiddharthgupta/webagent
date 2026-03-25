import {
  useEffect,
  useRef,
  useState,
  useCallback,
  Component,
  type ReactNode,
} from "react"
import { useChat } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai"
import {
  ArrowUp,
  Paperclip,
  Square,
  CheckCircle,
  Copy,
  Check,
  AlertCircle,
  Globe,
  MousePointerClick,
  Search,
  ListChecks,
  FileText,
} from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"
import type { PageContext } from "@/lib/types"
import type { ToolCallHandler } from "@/entrypoints/content/index"
// Type-only import — erased at compile time, no runtime dependency on web package
import type { MyAgentUIMessage } from "../../web/src/lib/agent"

// Infer the part type from the message
type AgentPart = MyAgentUIMessage["parts"][number]

// ---------------------------------------------------------------------------
// Error boundary
// ---------------------------------------------------------------------------
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center gap-2 p-4 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <div>
            <p className="font-medium">Extension error</p>
            <p className="mt-0.5">{this.state.error.message}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ChatPanelProps {
  getPageContext: () => PageContext
  handleToolCall: ToolCallHandler
}

export function ChatPanel({ getPageContext, handleToolCall }: ChatPanelProps) {
  return (
    <ErrorBoundary>
      <ChatPanelInner
        getPageContext={getPageContext}
        handleToolCall={handleToolCall}
      />
    </ErrorBoundary>
  )
}

// ---------------------------------------------------------------------------
// Main chat panel
// ---------------------------------------------------------------------------
function ChatPanelInner({ getPageContext, handleToolCall }: ChatPanelProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, stop, error, addToolOutput } =
    useChat<MyAgentUIMessage>({
      transport: new DefaultChatTransport({
        api: `${API_BASE}/api/chat`,
        body: () => ({
          pageContext: getPageContext(),
        }),
      }),

      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

      onToolCall: async ({ toolCall }) => {
        if (toolCall.dynamic) return

        const { toolName, toolCallId, input: toolInput } = toolCall
        console.log("[WebAgent] onToolCall:", toolName, toolInput)

        const result = handleToolCall(
          toolName,
          toolInput as Record<string, unknown>,
        )
        console.log("[WebAgent] Tool result:", result)

        addToolOutput({
          tool: toolName,
          toolCallId,
          output: result,
        })
      },

      onError: (err) => {
        console.error("[WebAgent] Chat error:", err)
      },
    })

  const isLoading = status === "submitted" || status === "streaming"

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, status, scrollToBottom])

  function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    sendMessage({ text })
  }

  return (
    <div className="flex h-full w-[25vw] min-w-[320px] flex-col border-l border-border bg-background shadow-xs">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="px-3 py-4 space-y-1">
          {messages.length === 0 && status === "ready" && <EmptyState />}

          {messages.map((message) => (
            <div key={message.id}>
              <div
                className={cn(
                  message.role === "user" &&
                    "border rounded-lg bg-muted w-fit ml-auto",
                )}
              >
                <div
                  className={cn(
                    "py-2 px-3",
                    message.role === "assistant" && "space-y-1",
                    message.role === "user" && "text-sm",
                  )}
                >
                  <MessageParts
                    message={message}
                    messages={messages}
                    status={status}
                  />
                </div>
              </div>
              {message.role === "assistant" &&
                !(status !== "ready" && message.id === messages.at(-1)?.id) && (
                  <MessageActions message={message} />
                )}
            </div>
          ))}

          <StreamingLoader status={status} />

          {error && (
            <div className="p-3 flex items-start gap-2.5 text-destructive text-xs bg-destructive/10 rounded-md">
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{error.name}</span>
                <span>{error.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-2">
        <InputGroup className="rounded-md">
          <InputGroupTextarea
            placeholder="Ask about this page..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={1}
            className="min-h-10 max-h-30 text-sm"
          />
          <InputGroupAddon align="block-end" className="flex justify-between">
            <InputGroupButton size="icon-xs" variant="ghost">
              <Paperclip className="size-3.5 text-muted-foreground" />
            </InputGroupButton>
            {isLoading ? (
              <InputGroupButton
                size="icon-xs"
                variant="outline"
                onClick={() => stop()}
              >
                <Square className="size-3" />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                size="icon-xs"
                variant="default"
                disabled={!input.trim()}
                onClick={handleSend}
              >
                <ArrowUp className="size-3.5" />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message parts renderer
// ---------------------------------------------------------------------------
function MessageParts({
  message,
  messages,
  status,
}: {
  message: MyAgentUIMessage
  messages: MyAgentUIMessage[]
  status: string
}) {
  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <div
              key={i}
              className="text-sm whitespace-pre-wrap leading-relaxed"
            >
              {part.text}
            </div>
          )
        }

        if (part.type === "reasoning") {
          return (
            <ReasoningBlock
              key={i}
              text={part.text}
              isStreaming={
                status === "streaming" &&
                i === message.parts.length - 1 &&
                message.id === messages.at(-1)?.id
              }
            />
          )
        }

        if (part.type === "tool-fill_fields") {
          return (
            <ToolIndicator
              key={i}
              icon={ListChecks}
              label="Filled fields"
              detail={part.input?.fills?.map((f) => f?.label).join(", ")}
              state={part.state}
            />
          )
        }

        if (part.type === "tool-click_element") {
          return (
            <ToolIndicator
              key={i}
              icon={MousePointerClick}
              label="Clicked"
              detail={part.input?.description}
              state={part.state}
            />
          )
        }

        if (part.type === "tool-select_option") {
          return (
            <ToolIndicator
              key={i}
              icon={ListChecks}
              label="Selected"
              detail={part.input?.label}
              state={part.state}
            />
          )
        }

        if (part.type === "tool-read_element") {
          return (
            <ToolIndicator
              key={i}
              icon={Search}
              label="Read element"
              detail={part.input?.purpose}
              state={part.state}
            />
          )
        }

        if (part.type === "tool-get_form_fields") {
          return (
            <ToolIndicator
              key={i}
              icon={FileText}
              label="Scanned form"
              state={part.state}
            />
          )
        }

        if (part.type === "tool-get_clickable_elements") {
          return (
            <ToolIndicator
              key={i}
              icon={MousePointerClick}
              label="Scanned buttons"
              state={part.state}
            />
          )
        }

        if (part.type === "tool-get_page_content") {
          return (
            <ToolIndicator
              key={i}
              icon={FileText}
              label="Read page"
              state={part.state}
            />
          )
        }

        return null
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// Reasoning block
// ---------------------------------------------------------------------------
function ReasoningBlock({
  text,
  isStreaming,
}: {
  text: string
  isStreaming: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isStreaming && <Spinner className="size-3" />}
        <span>{open ? "Hide" : "Show"} thinking</span>
      </button>
      {open && (
        <div className="mt-1 pl-3 border-l-2 border-muted text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tool indicator — reusable, no casts needed
// ---------------------------------------------------------------------------
function ToolIndicator({
  icon: Icon,
  label,
  detail,
  state,
}: {
  icon: typeof CheckCircle
  label: string
  detail?: string
  state: string
}) {
  const isDone = state === "output-available" || state === "error"

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 py-0.5">
      {isDone ? (
        <CheckCircle className="size-2.5 text-green-500 shrink-0" />
      ) : (
        <Spinner className="size-2.5 shrink-0" />
      )}
      <Icon className="size-2.5 shrink-0" />
      <span className="truncate">
        {label}
        {detail ? ` · ${detail}` : ""}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Copy action
// ---------------------------------------------------------------------------
function MessageActions({ message }: { message: MyAgentUIMessage }) {
  const [copied, setCopied] = useState(false)

  const text = message.parts
    .filter(
      (part): part is Extract<AgentPart, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("\n")
    .trim()

  if (!text) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex justify-end px-3 pb-1">
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Streaming loader
// ---------------------------------------------------------------------------
function StreamingLoader({ status }: { status: string }) {
  if (status !== "submitted") return null

  return (
    <div className="flex items-center gap-2 py-2 px-3">
      <Spinner className="size-3.5 text-muted-foreground" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[82vh] gap-3 px-4">
      <div className="rounded-full bg-muted p-3">
        <Globe className="size-5 text-muted-foreground" />
      </div>
      <p className="text-center text-sm font-medium text-muted-foreground">
        Ask anything about this page
      </p>
      <p className="text-center text-xs text-muted-foreground/70">
        I can explore content, answer questions, fill forms, and click buttons
        for you.
      </p>
    </div>
  )
}
