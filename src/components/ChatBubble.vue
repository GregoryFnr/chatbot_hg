<template>
  <div :class="['max-w-[85%] w-fit', who === 'bot' ? 'self-start' : 'self-end']">
    <div :class="[
      'px-3 py-2 rounded-2xl shadow-sm text-sm',
      who === 'bot' ? 'bg-white border border-gray-200 text-gray-800' : 'bg-primary text-white'
    ]">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

defineProps({
  who: { type: String, default: 'bot' },
})
</script>

<style scoped>
</style>
