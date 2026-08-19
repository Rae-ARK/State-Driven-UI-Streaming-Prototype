# State-Driven UI Streaming Prototype

Stage 0 MVP per [`docs/reference/PROPOSAL.md`](docs/reference/PROPOSAL.md): a Vue 3 client
polls a small HTTP server for a single JSON state object and updates reactively,
with no page reload.

## Structure

```
server/   Express state server (in-memory state, GET/POST /state)
client/   Vue 3 + Vite app (polling transport -> reactive store -> components)
```

## Run it

Two terminals.

**Server**
```
cd server
npm install
npm start
```
Runs on http://localhost:4000.

**Client**
```
cd client
npm install
npm run dev
```
Runs on http://localhost:5173.

## Demonstrate the live update

With both running, open the client in a browser, then in a third terminal change
the server-side state without touching the client:

```
curl -X POST http://localhost:4000/state/bump
```

or set arbitrary fields:

```
curl -X POST http://localhost:4000/state \
  -H "Content-Type: application/json" \
  -d '{"message": "hello from the server"}'
```

The browser tab updates in place — no refresh, no remount.

## Notes

- Transport (`client/src/transport/pollingTransport.js`) is isolated from the
  state store (`client/src/store/stateStore.js`) and knows nothing about Vue or
  the DOM. Swapping it for SSE/WebSocket later shouldn't require touching
  `App.vue` or `StatePanel.vue`.
- No auth, no persistence, no ARKlight integration — out of scope per proposal §3.
