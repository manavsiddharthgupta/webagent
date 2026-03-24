import { useState, useEffect } from "react"
import { PanelLeftOpen, PanelLeftClose } from "lucide-react"
import { ChatPanel } from "@/components/chat-panel"
import type { PageContext } from "@/lib/types"
import type { ToolCallHandler } from "./index"

interface AppProps {
  getPageContext: () => PageContext
  handleToolCall: ToolCallHandler
}

export default function App({ getPageContext, handleToolCall }: AppProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen((prev) => !prev)
    window.addEventListener("webagent:toggle", handler)
    return () => window.removeEventListener("webagent:toggle", handler)
  }, [])

  return (
    <div className="fixed top-0 right-0 z-2147483647 flex h-screen font-sans text-foreground">
      {/* Toggle tab */}
      <div className="flex items-start pt-3">
        <button
          onClick={() => setOpen(!open)}
          className="-mr-px flex h-7 w-7 items-center justify-center rounded-l-md border border-r-0 border-gray-300 bg-background text-muted-foreground transition-colors hover:text-foreground shadow-xs"
        >
          {open ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      {open && <ChatPanel getPageContext={getPageContext} handleToolCall={handleToolCall} />}
    </div>
  )
}
