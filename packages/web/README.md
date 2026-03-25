## WebAgent API

Express + TypeScript backend for the browser extension.

### Development

```bash
pnpm dev
```

The API listens on [http://localhost:3000](http://localhost:3000) by default and exposes:

- `GET /` for a simple health check
- `POST /api/chat` for the streaming agent endpoint

### Environment

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
PORT=3000
```

### Build

```bash
pnpm build
pnpm start
```
