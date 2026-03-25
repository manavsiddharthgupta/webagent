import "dotenv/config"

import { Readable } from "node:stream"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"

import express, {
  type NextFunction,
  type Request,
  type Response as ExpressResponse,
} from "express"

import {
  type ChatRequestBody,
  createChatResponse,
} from "./lib/agent.js"

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(express.json({ limit: "1mb" }))
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  next()
})

app.options("/api/chat", (_req, res) => {
  res.sendStatus(204)
})

app.get("/", (_req, res) => {
  res.json({
    name: "WebAgent API",
    status: "ok",
  })
})

app.post(
  "/api/chat",
  async (
    req: Request<unknown, unknown, ChatRequestBody>,
    res: ExpressResponse,
    next: NextFunction,
  ) => {
    try {
      const { messages, pageContext } = req.body ?? {}

      if (!Array.isArray(messages) || !pageContext) {
        res.status(400).json({
          error: "Invalid request body",
        })
        return
      }

      const response = await createChatResponse({ messages, pageContext })
      await pipeWebResponse(response, res)
    } catch (error) {
      next(error)
    }
  },
)

app.use(
  (
    error: unknown,
    _req: Request,
    res: ExpressResponse,
    _next: NextFunction,
  ) => {
    console.error("[WebAgent API] Request failed", error)

    if (res.headersSent) {
      return
    }

    res.status(500).json({
      error: "Internal server error",
    })
  },
)

app.listen(port, () => {
  console.log(`[WebAgent API] listening on http://localhost:${port}`)
})

async function pipeWebResponse(response: Response, res: ExpressResponse) {
  res.status(response.status)

  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  if (!response.body) {
    res.end()
    return
  }

  const stream = Readable.fromWeb(
    response.body as unknown as NodeReadableStream,
  )

  await new Promise<void>((resolve, reject) => {
    stream.on("end", () => resolve())
    stream.on("error", reject)
    res.on("close", () => resolve())
    stream.pipe(res)
  })
}
