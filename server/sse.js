// Minimal SSE hub. Tracks connected response streams and broadcasts
// named events to all of them. No dependency on what the event payload
// means — state.js/render.js decide that, this just ships bytes.

const channels = new Map(); // event name -> Set<res>

export function addSubscriber(event, res) {
  if (!channels.has(event)) channels.set(event, new Set());
  channels.get(event).add(res);
}

export function removeSubscriber(event, res) {
  channels.get(event)?.delete(res);
}

export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${data}\n\n`;
  for (const res of channels.get(event) || []) {
    res.write(payload);
  }
}

export function subscriberCount(event) {
  return channels.get(event)?.size || 0;
}
