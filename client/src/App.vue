<template>
  <StatePanel />
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import StatePanel from "./components/StatePanel.vue";
import { startStateStream, stopStateStream } from "./store/stateStore.js";

// The UI is mounted exactly once here. The transport starts on mount
// and keeps feeding the store for as long as this component lives —
// no reload, no remount, per proposal §7/§11.
onMounted(() => startStateStream());
onUnmounted(() => stopStateStream());
</script>
