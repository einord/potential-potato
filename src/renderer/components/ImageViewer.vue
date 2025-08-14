<script setup lang="ts">
import { defaultRemoteSettings, RemoteSettings } from '../../shared-types/remote-settings';
import { computed, onMounted, reactive, ref } from 'vue';

const currentImage1Data = ref('https://wallpapercave.com/wp/9gAmpUH.jpg') // Get cached image and fallback on this url
const currentImage2Data = ref('https://eskipaper.com/images/background-images-7.jpg') // Get cached image and fallback on this url
const currentImage = ref<1 | 2>(1)

const currentSettings = reactive<RemoteSettings>(defaultRemoteSettings)

const stylePassepartoutColor = computed(() => currentSettings.passepartoutColor)
const styleImageWidthHeight = computed(() => `calc(100% - ${currentSettings.passepartoutWidth}px - ${currentSettings.passepartoutWidth}px)`)
const styleImageTransition = computed(() => `opacity ${currentSettings.transitionDuration ?? 0}ms ease-in-out`)
const image1Url = computed(() => `url('${currentImage1Data.value}')`)
const image2Url = computed(() => `url('${currentImage2Data.value}')`)
const styleImage1Opacity = computed(() => currentImage.value === 1 ? 1 : 0)
const styleImage2Opacity = computed(() => currentImage.value === 2 ? 1 : 0)
const styleImageMargin = computed(() => `${currentSettings.passepartoutWidth}px`)

onMounted(() => {
    // Set updated remote settings when they change
    const onRemoteSettingsUpdated = window.api?.onRemoteSettingsUpdated
    if (onRemoteSettingsUpdated) {
        onRemoteSettingsUpdated(settings => Object.assign(currentSettings, defaultRemoteSettings, settings))
    }

    const onNewImage = window.api?.onNewImage
    if (onNewImage) {
        onNewImage(dataUrl => {
            // Set the background image for the next layer, and switch to it
            if (currentImage.value === 1) {
                currentImage2Data.value = dataUrl
                currentImage.value = 2
            } else {
                currentImage1Data.value = dataUrl
                currentImage.value = 1
            }
        })
    }
})

</script>

<template>
    <div class="image-viewer">
        <div class="image image-1" :style="{ backgroundImage: image1Url }"></div>
        <div class="image image-2" :style="{ backgroundImage: image2Url }"></div>
    </div>
</template>

<style scoped>
.image-viewer {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: none;
    background-color: v-bind(stylePassepartoutColor);

    > .image {
        position: absolute;
        overflow: hidden;
        height: v-bind(styleImageWidthHeight);
        width: v-bind(styleImageWidthHeight);
        transition: v-bind(styleImageTransition);
        background-position: center;
        background-size: cover;
        opacity: 0;
        margin: v-bind(styleImageMargin);
        outline: 10px solid hsla(0, 100%, 0%, 0.2);

        &.image-1 {
            opacity: v-bind(styleImage1Opacity);
        }

        &.image-2 {
            opacity: v-bind(styleImage2Opacity);
        }
    }
}

</style>