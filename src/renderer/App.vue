<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import Toast from './components/Toast.vue'
import UpdaterToast from './components/UpdaterToast.vue'
import ImageViewer from './components/ImageViewer.vue'
import { defaultRemoteSettings, RemoteSettings } from '../shared-types/remote-settings'

const versionToast = ref<InstanceType<typeof Toast> | null>(null)
const currentSettings = reactive<RemoteSettings>(defaultRemoteSettings)

// Error toast state (auto-hide after 20s)
const errShow = ref(false)
const errMessage = ref('')
let errTimer: number | null = null

// Holds application version shown in bottom-right corner
const appVersion = ref('')

function showError(msg: string) {
  // Hide main downloading toast if showing

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

onMounted(async () => {
  versionToast?.value?.show(); // Always show the toast

  const offs: Array<() => void> = []
  // Fetch and display app version from main process
  try {
    if (window.api?.getVersion) {
      appVersion.value = await window.api.getVersion()
    }
  } catch {}

    // Set updated remote settings when they change
    const onRemoteSettingsUpdated = window.api?.onRemoteSettingsUpdated
    if (onRemoteSettingsUpdated) {
        onRemoteSettingsUpdated(settings => {
          Object.assign(currentSettings, defaultRemoteSettings, settings)

          // Hide / show the app version depending on settings
          if (currentSettings.showAppVersion === true) {
              versionToast.value?.show()
          } else {
              versionToast.value?.hide()
          }
      })
    }

  const u = window.api?.updater
  if (u?.onUpdateError) {
    offs.push(
      u.onUpdateError((err) => {
        showError(err.message)
      })
    )
  }
  onUnmounted(() => {
    offs.forEach((off) => off())
    if (errTimer) window.clearTimeout(errTimer)
  })
})
</script>

<template>
  <main class="container">
    <ImageViewer />

    <!-- Felruta nere till vänster -->
    <div v-if="errShow" class="toast toast--error">
      <p class="title">Fel vid uppdatering</p>
      <p class="detail">{{ errMessage }}</p>
    </div>

    <!-- Uppdaterings-toast uppe till höger -->
    <UpdaterToast />

    <!-- Version badge bottom-right -->
    <Toast ref="versionToast" position="bottomRight">
      v{{ appVersion }}
    </Toast>
  </main>
</template>

<style scoped>
.container {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100vh;
  font-family:
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  background-color: black;
  color: white;
}

h1 {
  font-size: 2.25rem;
}

.title {
  margin: 0 0 6px 0;
  font-weight: 600;
}
.detail {
  margin: 0;
  opacity: 0.9;
}



</style>
