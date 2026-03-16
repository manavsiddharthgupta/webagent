import { useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

export function ChatPanel() {
  const [message, setMessage] = useState("");

  return (
    <div className="flex h-full w-[25vw] flex-col border-l border-border bg-background">
      {/* Messages area */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-3">
        <p className="text-center text-sm text-muted-foreground">
        </p>
      </div>

      {/* Chat input */}
      <div className="p-2">
        <InputGroup className="rounded-md">
          <InputGroupTextarea
            placeholder="Ask about this page"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (message.trim()) {
                  // TODO: send message
                  setMessage("");
                }
              }
            }}
            rows={1}
            className="min-h-[40px] max-h-[120px] text-sm"
          />
          <InputGroupAddon align="block-end" className="flex justify-between">
            <InputGroupButton size="icon-xs" variant="ghost">
              <Paperclip className="size-3.5 text-muted-foreground" />
            </InputGroupButton>
            <InputGroupButton
              size="icon-xs"
              variant="default"
              disabled={!message.trim()}
              onClick={() => {
                if (message.trim()) {
                  // TODO: send message
                  setMessage("");
                }
              }}
            >
              <ArrowUp className="size-3.5" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
