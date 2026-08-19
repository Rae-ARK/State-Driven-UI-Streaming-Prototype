// Minimal SSE hub. Tracks connected response streams and broadcasts
// named events to all of them. No dependency on what the event payload
// means — state.js/render.js decide that, this just ships bytes.
//
// Stage 2 addition: per-connection field exclusion for the "fragment"
// channel, so ARKVM.js promoting a field to the direct pipeline can
// also stop the server writing (not just rendering-and-discarding)
// that field's bus-path events to that one connection. Rendering
// itself still happens once per changed field regardless of who's
// excluded — this saves wire/parse/DOM cost per promoted connection,
// not the render call itself. Worth revisiting if render cost per
// field ever gets expensive enough to matter.

import { randomUUID } from "node:crypto";

const channels = new Map(); // event name -> Set<res>
const excludedFields = new Map(); // res -> Set<field>
const fragmentConnections = new Map(); // connection id -> res

export function addSubscriber(event, res) {
  if (!channels.has(event)) channels.set(event, new Set());
  channels.get(event).add(res);
}

export function removeSubscriber(event, res) {
  channels.get(event)?.delete(res);
  excludedFields.delete(res);
  for (const [id, r] of fragmentConnections) {
    if (r === res) fragmentConnections.delete(id);
  }
}

export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${data}\n\n`;
  for (const res of channels.get(event) || []) {
    res.write(payload);
  }
}

// Registers a "fragment" channel connection under a fresh id so it can
// be addressed later by /fragment/exclude — the res object itself
// isn't reachable from a separate HTTP request, so ARKVM.js needs a
// stable handle it can pass back.
export function registerFragmentConnection(res) {
  const id = randomUUID();
  fragmentConnections.set(id, res);
  addSubscriber("fragment", res);
  return id;
}

// Per-field broadcast on the "fragment" channel, skipping any
// connection that has excluded that field (i.e. ARKVM.js promoted it
// to the direct pipeline for that connection).
export function broadcastField(field, data) {
  const payload = `event: fragment:${field}\ndata: ${data}\n\n`;
  for (const res of channels.get("fragment") || []) {
    if (excludedFields.get(res)?.has(field)) continue;
    res.write(payload);
  }
}

// One-way valve: there is no includeField(). Once ARKVM.js promotes a
// field off the bus path there is no re-subscribing it — see
// ARKVM.js's header comment for why demotion never pays off under
// this cost model.
export function excludeField(id, field) {
  const res = fragmentConnections.get(id);
  if (!res) return false;
  if (!excludedFields.has(res)) excludedFields.set(res, new Set());
  excludedFields.get(res).add(field);
  return true;
}

export function subscriberCount(event) {
  return channels.get(event)?.size || 0;
}
