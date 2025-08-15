import { onMounted, onUnmounted, reactive } from 'vue'
import type { RemoteSettings } from '../../shared-types/remote-settings'
import { defaultRemoteSettings } from '../../shared-types/remote-settings'
import { listenRemoteSettings, type Off } from '../lib/events'

// Exposes a shared reactive RemoteSettings object synced from preload DOM events
export function useRemoteSettings() {
  const settings = reactive<RemoteSettings>({ ...defaultRemoteSettings })
  const offs: Off[] = []

  onMounted(async () => {
    // Initialize from cached image (if any)
    try {
      const cached = await window.api?.getCachedImage?.()
      if (cached?.settings) {
        Object.assign(settings, defaultRemoteSettings, cached.settings)
      }
    } catch {}

    // Subscribe to remote settings changes
    offs.push(
      listenRemoteSettings((s) => {
        Object.assign(settings, defaultRemoteSettings, s)
      })
    )
  })

  onUnmounted(() => {
    offs.forEach((off) => off())
  })

  return { settings }
}
