<!-- <template>
  <div id="app">
    <PdfViewer />
    <OfflinePdfViewer />
  </div>
</template>

<script setup>
import PdfViewer from './components/PdfViewer.vue'
import OfflinePdfViewer from './components/OfflinePdfViewer.vue'
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  padding: 2rem;
  background-color: #f5f5f5;
}
</style> -->


<!-- src/App.vue -->
<template>
  <div id="app">
    <router-view></router-view> <!-- This is where routed views will be displayed -->
  </div>
</template>

<script setup>
// Any global logic can go here
</script>

<style scoped>
/* Your styles here */
</style>
