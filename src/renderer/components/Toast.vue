<template>
    <div v-if="isVisible" class="toast" :class="{ error }" :style="positionStyle">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(defineProps<{
    position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
    error?: boolean
}>(), {
    error: false
})

const isVisible = ref(false)

const positionStyle = computed(() => {
    switch (props.position) {
        case 'topLeft':
            return { top: '16px', left: '16px' }
        case 'topRight':
            return { top: '16px', right: '16px' }
        case 'bottomLeft':
            return { bottom: '16px', left: '16px' }
        case 'bottomRight':
            return { bottom: '16px', right: '16px' }
        default:
            return {}
    }
})

/**
 * Show the toast message.
 * @param autoHide - The duration in seconds to auto-hide the toast. If not set, it will never disappear.
 */
const show = (autoHide?: number) => {
    isVisible.value = true
    if (autoHide) {
        setTimeout(() => {
            isVisible.value = false
        }, autoHide * 1000)
    }
}

const hide = () => {
    isVisible.value = false
}

defineExpose({
    show,
    hide
})

</script>

<style scoped>
.toast {
    position: fixed;
    background-color: transparent;
    color: white;
    text-shadow: 2px 0 black, -2px 0 black, 0 2px black, 0 -2px black, 1px 1px black, -1px -1px black, 1px -1px black, -1px 1px black;
    font-size: 0.8rem;

    &.toast--error {
        background: rgba(180, 24, 24, 0.92);
    }
}
</style>
