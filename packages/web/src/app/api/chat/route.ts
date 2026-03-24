import {
  ToolLoopAgent,
  createAgentUIStreamResponse,
  tool,
  stepCountIs,
  InferAgentUIMessage,
} from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import type { PageContext } from "@/lib/ai/types"
import { buildSystemPrompt } from "@/lib/ai/constants/prompts"

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

function createAgent(pageContext: PageContext) {
  return new ToolLoopAgent({
    model: google("gemini-2.5-flash"),
    instructions: buildSystemPrompt(pageContext),
    stopWhen: stepCountIs(20),
    tools: {
      // ── Server-side tools ──

      get_form_fields: tool({
        description:
          "Get all fillable form fields on the current page. Returns each field's CSS selector, tag, type, name, label, placeholder, current value, options (for selects), and whether it's required. Always call this BEFORE fill_fields.",
        inputSchema: z.object({}),
        execute: async () => {
          return { fields: pageContext.fields }
        },
      }),

      get_clickable_elements: tool({
        description:
          "Get all clickable elements — buttons, links, checkboxes, radio buttons, tabs. Returns CSS selector, tag, visible text, aria-label, and role. Call this before click_element.",
        inputSchema: z.object({}),
        execute: async () => {
          return { clickables: pageContext.clickables }
        },
      }),

      get_page_content: tool({
        description:
          "Re-read the current page text. Use after clicking something or when the user says the page changed.",
        inputSchema: z.object({}),
        execute: async () => {
          return {
            url: pageContext.url,
            title: pageContext.title,
            text: pageContext.text,
          }
        },
      }),

      // ── Client-side tools (no execute — handled by onToolCall in the extension) ──
      // When the agent calls these, the loop pauses. The extension executes
      // the DOM action, sends the real result back via addToolOutput, and
      // sendAutomaticallyWhen resumes the loop with the actual outcome.

      fill_fields: tool({
        description:
          "Fill one or more form fields. Use CSS selectors from get_form_fields. The extension will set the values in the browser and report back what happened.",
        inputSchema: z.object({
          fills: z.array(
            z.object({
              selector: z.string().describe("CSS selector from get_form_fields"),
              value: z.string().describe("Value to set"),
              label: z.string().describe("Human-readable field label"),
            }),
          ),
        }),
      }),

      click_element: tool({
        description:
          "Click a button, link, checkbox, radio button, tab, or any interactive element. Use get_clickable_elements first to find the selector.",
        inputSchema: z.object({
          selector: z.string().describe("CSS selector for the element"),
          description: z.string().describe("What this click does, e.g. 'Submit form', 'Check agree to terms'"),
        }),
      }),

      select_option: tool({
        description:
          "Select an option from a <select> dropdown. More reliable than fill_fields for dropdowns.",
        inputSchema: z.object({
          selector: z.string().describe("CSS selector for the <select>"),
          value: z.string().describe("Option text or value to select"),
          label: z.string().describe("Human-readable label for the dropdown"),
        }),
      }),

      read_element: tool({
        description:
          "Read text content of a specific element. Useful for checking field values, error messages, or specific sections after an action.",
        inputSchema: z.object({
          selector: z.string().describe("CSS selector for the element"),
          purpose: z.string().describe("Why you're reading this, e.g. 'check error message'"),
        }),
      }),
    },
  })
}

export type MyAgentUIMessage = InferAgentUIMessage<ReturnType<typeof createAgent>>

export async function POST(req: Request) {
  const body: { messages: MyAgentUIMessage[]; pageContext: PageContext } =
    await req.json()
  const agent = createAgent(body.pageContext)

  return createAgentUIStreamResponse({
    agent,
    uiMessages: body.messages,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  })
}
