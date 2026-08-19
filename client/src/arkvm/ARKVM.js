// ARKVM.js — tiny standin for ARKVM + ARKlight compiler routing,
// built around one idea: bus path (htmx/SSE fragments) is the default
// for every field. This runtime watches real per-field swap latency
// and, the first time a field's fragment arrives more than
// PROMOTE_THRESHOLD_MS late (server timestamp -> browser arrival),
// permanently detaches that field from htmx and starts driving it
// directly off the raw /state/stream JSON instead.
//
// One-way valve: once a field is promoted to direct, it is never
// handed back to the bus path. In this cost model direct is never
// more expensive than bus per update (flat client-side render vs. a
// render step that's always >= that server-side), so demotion never
// pays off — see docs/reference/PROPOSAL.md §16 discussion.
//
// FIELD_RENDERERS below is a hardcoded stand-in for what the ARKlight
// compiler would eventually emit from the Python state/intent
// contract. Treat it as the seam where compiled output plugs in —
// nothing else in this file should need to change when that lands.
//
// Caveat carried over from render.js: latency is measured as
// Date.now() (client) minus Date.parse(data-updated-at) (server
// timestamp embedded in the fragment). That assumes server and client
// clocks are close enough to trust the delta. True on localhost;
// not safe to assume across hosts without NTP or a monotonic scheme.

const BASE_URL = "http://localhost:4000";
const PROMOTE_THRESHOLD_MS = 100;

const FIELD_RENDERERS = {
  title: (state) => state.title,
  message: (state) => state.message,
  counter: (state) => `counter: ${state.counter}`,
  updated_at: (state) => `last updated: ${state.updated_at}`,
};

const promoted = new Set();
let connectionId = null;
let latestState = null;

function directRender(field, state) {
  const el = document.getElementById(`fragment-${field}`);
  if (!el) return;
  const render = FIELD_RENDERERS[field];
  if (!render) return;
  el.textContent = render(state);
  el.setAttribute("data-arkvm-direct", "true");
}

function promote(field) {
  if (promoted.has(field)) return;
  promoted.add(field);

  const el = document.getElementById(`fragment-${field}`);
  if (el) {
    // Detach from htmx's SSE swap so future bus-path events for this
    // field are ignored client-side, then let htmx re-scan the node
    // so the attribute removal actually takes effect.
    el.removeAttribute("sse-swap");
    if (window.htmx) window.htmx.process(el);
  }

  // Extend the one-way valve server-side too: tell the server to stop
  // writing this field to our fragment connection specifically, once
  // we know our connection id. Best-effort — if this fails, the
  // server just keeps rendering/sending a field we're now ignoring
  // client-side, which is wasted work, not a correctness problem.
  if (connectionId) {
    fetch(`${BASE_URL}/fragment/exclude`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: connectionId, field }),
    }).catch(() => {});
  }

  if (latestState) directRender(field, latestState);
}

function extractUpdatedAt(html) {
  const match = /data-updated-at="([^"]*)"/.exec(html);
  return match ? match[1] : null;
}

// Instrumentation connection: measures real per-field swap latency off
// the same bus-path stream htmx is already consuming, via a second,
// independent EventSource rather than reaching into htmx's own SSE
// extension internals.
function watchFragmentLatency() {
  const source = new EventSource(`${BASE_URL}/fragment/stream`);

  source.addEventListener("connection", (evt) => {
    try {
      connectionId = JSON.parse(evt.data).id;
    } catch {
      // Instrumentation-only — never let this block the bus path.
    }
  });

  for (const field of Object.keys(FIELD_RENDERERS)) {
    source.addEventListener(`fragment:${field}`, (evt) => {
      if (promoted.has(field)) return; // already routed direct, ignore
      const updatedAt = extractUpdatedAt(evt.data);
      if (!updatedAt) return;
      const latency = Date.now() - Date.parse(updatedAt);
      if (latency > PROMOTE_THRESHOLD_MS) promote(field);
    });
  }

  source.onerror = () => {
    // EventSource auto-reconnects; this connection is instrumentation
    // only, so a drop here should never affect the bus path itself.
  };
}

// Direct pipeline: always-open, cheap to leave idling even before
// anything is promoted (no render cost to an unused subscription —
// see PROPOSAL.md §16). Feeds directRender() for whatever fields have
// been promoted so far.
function watchDirectState() {
  const source = new EventSource(`${BASE_URL}/state/stream`);
  source.addEventListener("state", (evt) => {
    try {
      latestState = JSON.parse(evt.data);
    } catch {
      return;
    }
    for (const field of promoted) directRender(field, latestState);
  });
}

watchFragmentLatency();
watchDirectState();
