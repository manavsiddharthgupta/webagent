import { streamText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(req: Request) {
  const { pageContent, messages } = await req.json()

  const systemPrompt = `You are WebAgent, a helpful AI assistant embedded in the user's browser.
The user is viewing a web page and asking questions about it.

Here is the page content:
---
${pageContent}
---

Answer the user's question about this page in 2-4 concise sentences.
Be direct and helpful. If the content doesn't contain the answer, say so.`

  const result = streamText({
    model: google("gemini-3-pro-preview"),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
