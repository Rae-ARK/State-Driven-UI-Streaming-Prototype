import express from "express";
import cors from "cors";
import { getState, updateState } from "./state.js";
import {
  addSubscriber,
  removeSubscriber,
  registerFragmentConnection,
  broadcast,
  broadcastField,
  excludeField,
} from "./sse.js";
import { renderFieldFragment, FIELDS } from "./render.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Legacy Stage 0 endpoint, kept for compatibility / comparison against
// the polling transport.
app.get("/state", (req, res) => {
  res.json(getState());
});

// Stage 1, direct pipeline: raw JSON pushed over SSE as state changes.
// Client does its own diffing/rendering. No server-side render cost per
// update, one push per subscriber.
app.get("/state/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`event: state\ndata: ${JSON.stringify(getState())}\n\n`);

  addSubscriber("state", res);
  req.on("close", () => removeSubscriber("state", res));
});

// Stage 2, bus path: per-field HTML fragments over one SSE connection.
// Each field is independently swappable (fragment:<field> events) so
// ARKVM.js can promote individual hot fields to the direct pipeline
// without taking the whole panel with it. Every update still pays a
// render cost server-side per changed field, once per non-excluded
// subscriber — this is the path the JIT/ARKVM.js design routes around
// for high-churn fields.
app.get("/fragment/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const id = registerFragmentConnection(res);
  res.write(`event: connection\ndata: ${JSON.stringify({ id })}\n\n`);

  const state = getState();
  for (const field of FIELDS) {
    res.write(
      `event: fragment:${field}\ndata: ${renderFieldFragment(field, state)}\n\n`
    );
  }

  req.on("close", () => removeSubscriber("fragment", res));
});

// ARKVM.js calls this once it promotes a field to the direct pipeline,
// so the server stops writing that field's bus-path events for that
// connection specifically. One-way: there is no /fragment/include,
// because demotion never pays off under this cost model — see
// ARKVM.js's header comment.
app.post("/fragment/exclude", (req, res) => {
  const { id, field } = req.body || {};
  if (!id || !field) return res.status(400).json({ ok: false });
  res.json({ ok: excludeField(id, field) });
});

function changedFields(before, after) {
  return FIELDS.filter((f) => before[f] !== after[f]);
}

app.post("/state", (req, res) => {
  const before = getState();
  const updated = updateState(req.body || {});
  broadcast("state", JSON.stringify(updated));
  for (const field of changedFields(before, updated)) {
    broadcastField(field, renderFieldFragment(field, updated));
  }
  res.json(updated);
});

app.post("/state/bump", (req, res) => {
  const before = getState();
  const updated = updateState({
    counter: before.counter + 1,
    message: `Counter bumped to ${before.counter + 1} by the server.`,
  });
  broadcast("state", JSON.stringify(updated));
  for (const field of changedFields(before, updated)) {
    broadcastField(field, renderFieldFragment(field, updated));
  }
  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`State server listening on http://localhost:${PORT}`);
  console.log(`GET  /state             -> current state (legacy poll)`);
  console.log(`GET  /state/stream      -> SSE, direct pipeline (raw JSON)`);
  console.log(`GET  /fragment/stream   -> SSE, bus path (per-field rendered HTML)`);
  console.log(`POST /state             -> merge partial state`);
  console.log(`POST /state/bump        -> demo: increment counter`);
  console.log(`POST /fragment/exclude  -> ARKVM.js: stop bus-path writes for one field/connection`);
});
