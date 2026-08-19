// Transport layer: knows how to fetch state, nothing else.
// It never touches the DOM and never imports Vue.
// Swappable for SSE / WebSocket / mock transports later (proposal §5, §6).

const DEFAULT_BASE_URL = "http://localhost:4000";
const DEFAULT_INTERVAL_MS = 1000;

/**
 * Starts polling the state endpoint on an interval.
 * @param {(state: object) => void} onUpdate - called with each fetched state
 * @param {(error: Error) => void} [onError]
 * @param {{ baseUrl?: string, intervalMs?: number }} [options]
 * @returns {() => void} stop function
 */
export function createPollingTransport(onUpdate, onError, options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const intervalMs = options.intervalMs || DEFAULT_INTERVAL_MS;

  let stopped = false;

  async function poll() {
    if (stopped) return;
    try {
      const res = await fetch(`${baseUrl}/state`);
      if (!res.ok) throw new Error(`State request failed: ${res.status}`);
      const data = await res.json();
      onUpdate(data);
    } catch (err) {
      if (onError) onError(err);
    } finally {
      if (!stopped) setTimeout(poll, intervalMs);
    }
  }

  poll();

  return function stop() {
    stopped = true;
  };
}
