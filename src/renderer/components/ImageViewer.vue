<script setup lang="ts">
import { defaultRemoteSettings, RemoteSettings } from '../../shared-types/remote-settings';
import { computed, onMounted, ref } from 'vue';

const defaultImageUrl = 'https://wallpapercave.com/wp/9gAmpUH.jpg' // Get cached image and fallback on this url
const currentImage = ref<1 | 2>(1)

const currentSettings = ref<RemoteSettings>(defaultRemoteSettings)

const stylePassepartoutColor = computed(() => currentSettings.value.passepartoutColor)
const styleImageWidthHeight = computed(() => `calc(100% - ${currentSettings.value.passepartoutWidth}px - ${currentSettings.value.passepartoutWidth}px)`)
const styleImageTransition = computed(() => `opacity ${currentSettings.value.transitionDuration}ms ease-in-out;`)
const styleImage1Url = ref(`url('${defaultImageUrl}')`)
const styleImage2Url = ref(`none`)
const styleImage1Opacity = computed(() => currentImage.value === 1 ? 1 : 0)
const styleImage2Opacity = computed(() => currentImage.value === 2 ? 1 : 0)
const styleImageMargin = computed(() => `${currentSettings.value.passepartoutWidth}px`)

onMounted(() => {
    // Set updated remote settings when they change
    const onRemoteSettingsUpdated = window.api?.onRemoteSettingsUpdated
    if (onRemoteSettingsUpdated) {
        onRemoteSettingsUpdated(settings => currentSettings.value = Object.assign({}, defaultRemoteSettings, settings))
    }

    const onNewImage = window.api?.onNewImage
    if (onNewImage) {
        onNewImage(dataUrl => {
            // Set the background image for the next layer, and switch to it
            if (currentImage.value === 1) {
                styleImage2Url.value = `url('${dataUrl}')`
                currentImage.value = 2
            } else {
                styleImage1Url.value = `url('${dataUrl}')`
                currentImage.value = 1
            }
        })
    }
})

</script>

<template>
    <div class="image-viewer">
        <div class="image layer-1"></div>
        <div class="image layer-2"></div>
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

        &.layer-1 {
            opacity: v-bind(styleImage1Opacity);
            background-image: v-bind(styleImage1Url);
        }

        &.layer-2 {
            opacity: v-bind(styleImage2Opacity);
            background-image: v-bind(styleImage2Url);
        }
    }
}

</style>