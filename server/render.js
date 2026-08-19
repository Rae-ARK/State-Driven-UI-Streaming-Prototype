// Renders per-field HTML fragments for the bus path. Each field gets
// its own <span>, independently swappable by htmx via a dedicated
// `fragment:<field>` SSE event — this is what makes ARKVM.js's
// promote-per-field routing possible. Stage 1's single-panel
// renderFragment() could only be routed at whole-panel granularity;
// Stage 2 needs field granularity for the JIT-style promotion to mean
// anything.
//
// Every fragment carries data-updated-at so client-side code
// (ARKVM.js) can measure real bus-path latency without a separate
// timestamp channel. Caveat: this assumes server and client clocks
// are close enough to trust the delta — true on localhost, worth
// revisiting before this crosses hosts.

export const FIELDS = ["title", "message", "counter", "updated_at"];

const FIELD_LABELS = {
  title: "",
  message: "",
  counter: "counter: ",
  updated_at: "last updated: ",
};

export function renderFieldFragment(field, state) {
  const label = FIELD_LABELS[field] ?? "";
  const value = escapeHtml(String(state[field]));
  const updatedAt = escapeHtml(state.updated_at);
  // sse-swap/hx-swap are re-emitted in the swapped-in HTML itself:
  // htmx's outerHTML swap replaces the whole element, attributes
  // included, so omitting them here would silently break every swap
  // after the first one.
  return (
    `<span id="fragment-${field}" class="fragment-field" ` +
    `sse-swap="fragment:${field}" hx-swap="outerHTML" ` +
    `data-field="${field}" data-updated-at="${updatedAt}">` +
    `${label}${value}</span>`
  );
}

// Legacy Stage 1 whole-panel render, kept for comparison against the
// per-field approach and anything still pointed at the old shape.
export function renderFragment(state) {
  return (
    `<div id="fragment-panel">` +
      `<span class="status connected">live via htmx/SSE</span>` +
      FIELDS.map((f) => renderFieldFragment(f, state)).join("") +
    `</div>`
  ).replace(/\n/g, "");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
