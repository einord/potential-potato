<template>
  <main class="container">
    <h1>Hello world</h1>
    <p>Welcome to Potential Potato (Electron + Vue + Vite)</p>

    <!-- Uppdaterings-toast uppe till höger -->
    <div v-if="show" class="toast">
      <p class="title">{{ title }}</p>
      <p v-if="downloading" class="detail">Laddar ner uppdatering: {{ percent }}%</p>
      <div v-if="downloading" class="bar">
        <div class="fill" :style="{ width: percent + '%' }"></div>
      </div>
      <p v-if="countdown > 0" class="detail">Startar om om {{ countdown }}s...</p>
    </div>

    <!-- Felruta nere till vänster -->
    <div v-if="errShow" class="toast toast--error">
      <p class="title">Fel vid uppdatering</p>
      <p class="detail">{{ errMessage }}</p>
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

// Error toast state (auto-hide after 20s)
const errShow = ref(false)
const errMessage = ref('')
let errTimer: number | null = null

function showError(msg: string) {
  // Hide main downloading toast if showing
  downloading.value = false
  show.value = false

  errMessage.value = msg
  errShow.value = true
  if (errTimer) {
    window.clearTimeout(errTimer)
  }
  errTimer = window.setTimeout(() => {
    errShow.value = false
    errTimer = null
  }, 20000)
}

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
        showError(err.message)
      })
    )
  }
  onUnmounted(() => {
    offs.forEach(off => off())
    if (errTimer) window.clearTimeout(errTimer)
  })
})
</script>

<style scoped>
.container {
  display: grid;
  place-items: center;
  min-height: 100vh;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  background-color: black;
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

.toast--error {
  left: 16px;
  right: auto;
  top: auto;
  bottom: 16px;
  background: rgba(180, 24, 24, 0.92);
}

.title { margin: 0 0 6px 0; font-weight: 600; }
.detail { margin: 0; opacity: 0.9; }

.bar {
  height: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}

.fill {
  height: 100%;
  background: #4CAF50;
  width: 0%;
  transition: width 0.3s ease;
}
</style>
