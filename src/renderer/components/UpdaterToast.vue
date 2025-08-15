<template>
    <Toast ref="updateToast" class="update-toast" position="topRight">
        <p class="title">{{ title }}</p>
        <p v-if="downloading" class="detail">Downloading update: {{ percent }}%</p>
        <div v-if="downloading" class="bar">
        <div class="fill" :style="{ width: percent + '%' }"></div>
        </div>
        <p v-if="countdown > 0" class="detail">Restarting in {{ countdown }}s...</p>
    </Toast>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Toast from './Toast.vue';
import { updaterEvents, type Off } from '../lib/events'

const updateToast = ref<InstanceType<typeof Toast> | null>(null)

const title = ref('')
const downloading = ref(false)
const countdown = ref(0)
const percent = ref(0)

onMounted(async () => {
    const offs: Off[] = []

    offs.push(
        updaterEvents.onAvailable((info) => {
            title.value = `Update available: v${info.version}`
            updateToast.value?.show()
        })
    )

    offs.push(
        updaterEvents.onProgress((p) => {
            downloading.value = true
            percent.value = p.percent
            title.value = 'Downloading update'
            updateToast.value?.show()
        })
    )

    offs.push(
        updaterEvents.onDownloaded(() => {
            downloading.value = false
            percent.value = 100
            title.value = 'Update downloaded'
            updateToast.value?.show()
        })
    )

    offs.push(
        updaterEvents.onRestarting((r) => {
            countdown.value = Math.max(0, r.secondsRemaining)
            title.value = 'Update installed'
            updateToast.value?.show()
        })
    )

    offs.push(
        updaterEvents.onError(() => {
            updateToast.value?.hide()
        })
    )

    onUnmounted(() => {
        offs.forEach((off) => off())
    })
})
</script>

<style scoped>
.title {
    margin: 0 0 6px 0;
    font-weight: 600;
}

.detail {
    margin: 0;
    opacity: 0.9;
}

.bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 8px;
}

.fill {
    height: 100%;
    background: #3f7849;
    width: 0%;
    transition: width 0.3s ease;
}
</style>