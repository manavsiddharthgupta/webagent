# WebAgent

An AI browser extension that adds an agent to every webpage. It lives in a sidebar and can answer questions about page content, fill forms, click buttons, and navigate for you.

## Project Structure

```
packages/
  extension/   # Chrome extension (WXT + React)
  web/         # API backend (Express + TypeScript)
```

## Setup

```bash
pnpm install
```

Create env files:

```bash
# packages/web/.env
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here

# packages/extension/.env
WXT_API_BASE=http://localhost:3000
```

## Development

Run both in separate terminals:

```bash
pnpm dev:web   # starts the Express API on port 3000
pnpm dev:ext   # starts extension with hot reload
```

Load the extension in Chrome: go to `chrome://extensions`, enable Developer Mode, and load unpacked from `packages/extension/.output/chrome-mv3`.

## Build

```bash
pnpm build:web
pnpm build:ext
```
