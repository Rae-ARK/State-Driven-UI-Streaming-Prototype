import express from "express";
import cors from "cors";
import { getState, updateState } from "./state.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Transport contract: GET /state returns the full current state.
// The client polls this. Nothing here is HTML — data only.
app.get("/state", (req, res) => {
  res.json(getState());
});

// Demo-only mutation endpoint so the state can change independently
// of the Vue client (per proposal §4/§7). Not meant to be a real API.
app.post("/state", (req, res) => {
  const updated = updateState(req.body || {});
  res.json(updated);
});

// Convenience endpoint for the demo: increments counter and refreshes message.
app.post("/state/bump", (req, res) => {
  const current = getState();
  const updated = updateState({
    counter: current.counter + 1,
    message: `Counter bumped to ${current.counter + 1} by the server.`,
  });
  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`State server listening on http://localhost:${PORT}`);
  console.log(`GET  /state       -> current state`);
  console.log(`POST /state       -> merge partial state`);
  console.log(`POST /state/bump  -> demo: increment counter`);
});
