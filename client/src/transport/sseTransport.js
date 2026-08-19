// Direct-pipeline transport: subscribes to /state/stream and pushes
// state to the caller as events arrive, instead of polling on an
// interval. Same (onUpdate, onError, options) -> stop() shape as
// pollingTransport.js, so stateStore.js doesn't need to change its
// calling convention when swapping between them.

const DEFAULT_BASE_URL = "http://localhost:4000";

export function createSseTransport(onUpdate, onError, options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const source = new EventSource(`${baseUrl}/state/stream`);

  source.addEventListener("state", (evt) => {
    try {
      onUpdate(JSON.parse(evt.data));
    } catch (err) {
      if (onError) onError(err);
    }
  });

  source.onerror = () => {
    // EventSource auto-reconnects on transient errors; surface it but
    // don't tear anything down ourselves.
    if (onError) onError(new Error("SSE connection error"));
  };

  return function stop() {
    source.close();
  };
}
