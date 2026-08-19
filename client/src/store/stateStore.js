// State store: owns the reactive representation of remote state.
// Components read from this. It does not know or care which transport
// filled it in (proposal §5). Swap createPollingTransport for another
// transport here without touching any component.

import { reactive } from "vue";
import { createPollingTransport } from "../transport/pollingTransport.js";

export const remoteState = reactive({
  title: "",
  message: "",
  counter: 0,
  updated_at: "",
  connected: false,
  lastError: null,
});

let stopTransport = null;

export function startStateStream(options = {}) {
  if (stopTransport) return stopTransport;

  stopTransport = createPollingTransport(
    (data) => {
      Object.assign(remoteState, data, { connected: true, lastError: null });
    },
    (err) => {
      remoteState.connected = false;
      remoteState.lastError = err.message;
    },
    options
  );

  return stopTransport;
}

export function stopStateStream() {
  if (stopTransport) {
    stopTransport();
    stopTransport = null;
  }
}
