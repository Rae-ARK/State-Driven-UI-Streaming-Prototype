# State-Driven UI Streaming Prototype

Stage 0–2 per [`docs/reference/PROPOSAL.md`](docs/reference/PROPOSAL.md) (§16 for
implementation status against the original §14 roadmap). A small Express server
owns one JSON state object and exposes it two ways at once:

- **Direct pipeline** (`GET /state/stream`) — raw JSON over SSE, consumed by a
  Vue 3 reactive store. No server-side render step.
- **Bus path** (`GET /fragment/stream`) — per-field HTML fragments over SSE,
  server-rendered and swapped in by real htmx (`hx-ext="sse"`). Every update
  pays a render cost server-side, once per changed field, per non-excluded
  subscriber.

Both are fed from the same `POST /state` / `POST /state/bump` handlers, so the
two paths are independent consumers of one server-side state object, not two
separate state sources.

`client/src/arkvm/ARKVM.js` sits on top of the bus path as a small JIT-style
router: it watches real per-field swap latency (server `data-updated-at` vs.
browser arrival), and the first time a field crosses 100ms it detaches that
field from htmx, starts driving it directly off `/state/stream` JSON instead,
and tells the server (`POST /fragment/exclude`) to stop rendering/sending that
field to that connection. This is a one-way valve — bus is the default, a
field promoted to direct is never handed back — because in this cost model
direct is never more expensive than bus per update, so demotion never pays
off. See the header comment in `ARKVM.js` for the full reasoning.

## Structure

```
server/
  index.js   Express app: /state, /state/stream, /fragment/stream,
             /state/bump, /fragment/exclude
  state.js   In-memory state object
  render.js  Per-field HTML fragment rendering for the bus path
  sse.js     SSE hub: channels, per-connection field exclusion

client/
  src/transport/pollingTransport.js  Stage 0 polling (kept for comparison)
  src/transport/sseTransport.js      Direct pipeline consumer
  src/store/stateStore.js            Vue reactive store
  src/arkvm/ARKVM.js                 Bus-path latency watcher + field promotion
  index.html                         Wires up both paths + htmx + ARKVM.js
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

The browser tab updates in place — no refresh, no remount. Both the Vue-driven
panel (direct pipeline) and the htmx-driven panel (bus path) update from the
same `bump`.

## Demonstrate field promotion (ARKVM.js)

Bump the counter repeatedly and fast enough to push its bus-path swap latency
past 100ms:

```
for i in $(seq 1 50); do curl -s -X POST http://localhost:4000/state/bump > /dev/null; done
```

Open the browser devtools console — once `counter` crosses the threshold,
ARKVM.js logs the promotion, removes `sse-swap` from that field's element, and
`fragment-counter` in the DOM gets a `data-arkvm-direct="true"` attribute.
Other fields (`title`, `message`, `updated_at`) stay on the bus path since
they aren't changing fast enough to trip the threshold.

## Notes

- Transport (`client/src/transport/pollingTransport.js`,
  `sseTransport.js`) is isolated from the state store
  (`client/src/store/stateStore.js`) and knows nothing about Vue or the DOM.
- `FIELD_RENDERERS` in `ARKVM.js` is a hardcoded stand-in for what an
  ARKlight-style compiler would eventually emit from a state/intent contract —
  see `ARKVM.js`'s header comment for that seam.
- Latency measurement assumes server and client clocks are close enough to
  trust the delta (`Date.now()` vs `Date.parse(data-updated-at)`). True on
  localhost; not safe across hosts without NTP or a monotonic scheme.
- No auth, no persistence, no `.arklight` binary format, no real ARKlight
  compiler — out of scope per proposal §3 and §12.
