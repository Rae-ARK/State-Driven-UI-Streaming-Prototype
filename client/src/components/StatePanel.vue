<template>
  <div class="panel">
    <span class="status" :class="{ connected: state.connected }">
      {{ state.connected ? "connected" : "disconnected" }}
    </span>
    <h1>{{ state.title }}</h1>
    <p class="message">{{ state.message }}</p>
    <p class="counter">counter: <strong>{{ state.counter }}</strong></p>
    <p class="updated">last updated: {{ state.updated_at }}</p>
    <p v-if="state.lastError" class="error">error: {{ state.lastError }}</p>
  </div>
</template>

<script setup>
import { remoteState as state } from "../store/stateStore.js";
// This component has no knowledge of HTTP, polling, or the server.
// It only reads reactive state (proposal §5).
</script>

<style scoped>
.panel {
  font-family: system-ui, sans-serif;
  max-width: 480px;
  margin: 4rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.status {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: #eee;
  color: #666;
}
.status.connected {
  background: #d7f7dd;
  color: #1a7f37;
}
.counter {
  font-size: 1.25rem;
}
.updated {
  color: #888;
  font-size: 0.85rem;
}
.error {
  color: #c0392b;
}
</style>
