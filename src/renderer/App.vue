<template>
  <main class="container">
    <h1>Hello world</h1>
    <p>Welcome to Potential Potato (Electron + Vue + Vite)</p>

    <div v-if="show" class="toast">
      <p class="title">{{ title }}</p>
      <p v-if="downloading" class="detail">Laddar ner uppdatering: {{ percent }}%</p>
      <div v-if="downloading" class="bar">
        <div class="fill" :style="{ width: percent + '%' }"></div>
      </div>
      <p v-if="countdown > 0" class="detail">Startar om om {{ countdown }}s...</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const show = ref(false)
const title = ref('')
const percent = ref(0)
const downloading = ref(false)
const countdown = ref(0)

onMounted(() => {
  const offs: Array<() => void> = []
  if (window.api?.updater) {
    offs.push(
      window.api.updater.onUpdateAvailable((info) => {
        title.value = `Uppdatering till v${info.version} hittad`
        show.value = true
      }),
      window.api.updater.onDownloadProgress((p) => {
        downloading.value = true
        percent.value = p.percent
        title.value = 'Laddar ner uppdatering'
        show.value = true
      }),
      window.api.updater.onUpdateDownloaded((_info) => {
        downloading.value = false
        percent.value = 100
        title.value = 'Uppdatering nedladdad'
        show.value = true
      }),
      window.api.updater.onUpdateRestarting((r) => {
        countdown.value = Math.max(0, r.secondsRemaining)
        title.value = 'Uppdatering installerad'
        show.value = true
      }),
      window.api.updater.onUpdateError((err) => {
        title.value = `Fel vid uppdatering: ${err.message}`
        show.value = true
      })
    )
  }
  onUnmounted(() => offs.forEach(off => off()))
})
</script>

<style scoped>
.container {
  display: grid;
  place-items: center;
  min-height: 100vh;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
}
h1 { font-size: 2.25rem; }
.toast {
  position: fixed;
  right: 16px;
  top: 16px;
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 12px 14px;
  border-radius: 8px;
  min-width: 280px;
  max-width: 360px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.title { margin: 0 0 6px 0; font-weight: 600; }
.detail { margin: 0; opacity: 0.9; }
.bar {
  height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; margin-top: 8px;
}
.fill { height: 100%; background: #4CAF50; width: 0%; transition: width 0.3s ease; }
</style>
