import express from "express";
import cors from "cors";
import { getState, updateState } from "./state.js";
import { addSubscriber, removeSubscriber, broadcast } from "./sse.js";
import { renderFragment } from "./render.js";

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

// Stage 1, bus path: server-rendered HTML fragment pushed over SSE,
// consumed by htmx's SSE extension (hx-ext="sse"). Every update pays a
// render cost server-side, once per subscriber — this is the path the
// JIT/ARKVM.js design is meant to route around for high-churn fields.
app.get("/fragment/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`event: fragment\ndata: ${renderFragment(getState())}\n\n`);

  addSubscriber("fragment", res);
  req.on("close", () => removeSubscriber("fragment", res));
});

app.post("/state", (req, res) => {
  const updated = updateState(req.body || {});
  broadcast("state", JSON.stringify(updated));
  broadcast("fragment", renderFragment(updated));
  res.json(updated);
});

app.post("/state/bump", (req, res) => {
  const current = getState();
  const updated = updateState({
    counter: current.counter + 1,
    message: `Counter bumped to ${current.counter + 1} by the server.`,
  });
  broadcast("state", JSON.stringify(updated));
  broadcast("fragment", renderFragment(updated));
  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`State server listening on http://localhost:${PORT}`);
  console.log(`GET  /state            -> current state (legacy poll)`);
  console.log(`GET  /state/stream     -> SSE, direct pipeline (raw JSON)`);
  console.log(`GET  /fragment/stream  -> SSE, bus path (rendered HTML)`);
  console.log(`POST /state            -> merge partial state`);
  console.log(`POST /state/bump       -> demo: increment counter`);
});
