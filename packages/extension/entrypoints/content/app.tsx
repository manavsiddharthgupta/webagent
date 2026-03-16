import { useState } from "react";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-0 right-0 z-2147483647 flex h-screen font-sans text-foreground">
      {/* Toggle tab */}
      <div className="flex items-start pt-3">
        <button
          onClick={() => setOpen(!open)}
          className="-mr-px flex h-7 w-7 items-center justify-center rounded-l-md border border-r-0 border-border bg-background"
        >
          {open ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      {open && (
        <ChatPanel />
      )}
    </div>
  );
}
