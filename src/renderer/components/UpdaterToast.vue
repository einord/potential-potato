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

const updateToast = ref<InstanceType<typeof Toast> | null>(null)

const title = ref('')
const downloading = ref(false)
const countdown = ref(0)
const percent = ref(0)

onMounted(async () => {
    const offs: Array<() => void> = []

    const u = window.api?.updater
    if (
        u &&
        u.onUpdateAvailable &&
        u.onDownloadProgress &&
        u.onUpdateDownloaded &&
        u.onUpdateRestarting &&
        u.onUpdateError
    ) {
        offs.push(
            u.onUpdateAvailable((info) => {
                title.value = `Update available: v${info.version}`
                if (updateToast?.value) updateToast.value.show()
            }),
            u.onDownloadProgress((p) => {
                downloading.value = true
                percent.value = p.percent
                title.value = 'Downloading update'
                if (updateToast?.value) updateToast.value.show()
            }),
            u.onUpdateDownloaded(() => {
                downloading.value = false
                percent.value = 100
                title.value = 'Update downloaded'
                if (updateToast?.value) updateToast.value.show()
            }),
            u.onUpdateRestarting((r) => {
                countdown.value = Math.max(0, r.secondsRemaining)
                title.value = 'Update installed'
                if (updateToast?.value) updateToast.value.show()
            }),
            u.onUpdateError(() => {
                updateToast.value?.hide()
            })
        )
    }

    // Release event listeners
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