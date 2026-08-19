// Renders the bus-path HTML fragment from state. This is the server-side
// render cost that the direct pipeline skips — deliberately kept simple
// here, but stands in for "N-node fragment template" in the JIT design.

export function renderFragment(state) {
  return (
    `<div id="fragment-panel">` +
      `<span class="status connected">live via htmx/SSE</span>` +
      `<h2>${escapeHtml(state.title)}</h2>` +
      `<p class="message">${escapeHtml(state.message)}</p>` +
      `<p class="counter">counter: <strong>${state.counter}</strong></p>` +
      `<p class="updated">last updated: ${escapeHtml(state.updated_at)}</p>` +
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
