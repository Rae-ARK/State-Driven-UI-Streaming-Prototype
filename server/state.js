// Single in-memory application state object.
// This is intentionally the only source of truth on the server side.
// No database, no persistence — restarting the server resets it.

let state = {
  title: "State-Driven UI Streaming Prototype",
  message: "Waiting for the first state change...",
  counter: 0,
  updated_at: new Date().toISOString(),
};

export function getState() {
  return state;
}

// Shallow-merges a partial update into the current state and
// stamps updated_at. This is the only way state changes.
export function updateState(partial) {
  state = {
    ...state,
    ...partial,
    updated_at: new Date().toISOString(),
  };
  return state;
}
