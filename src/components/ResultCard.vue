<template>
  <a
    class="block rounded-xl border border-gray-200 bg-white hover:border-accent transition p-3"
    :href="place.mapsUrl"
    target="_blank"
    rel="noopener"
  >
    <div class="flex gap-3">
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">{{ place.name }}</p>
        <p class="text-xs text-gray-600 mb-2">{{ place.address }}</p>
        <div
          class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-2"
        >
          <span
            class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100"
            >{{ place.typeLabel }}</span
          >
          <span
            class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100"
            >{{ place.distanceMinutes }} min à pied</span
          >
          <span
            v-if="place.phone"
            class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100"
            >{{ place.phone }}</span
          >
        </div>
        <a :href="place.website" target="_blank" rel="noopener">
          <span
            v-if="place.website"
            class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-xs text-gray-600"
            >{{ place.website }}</span
          >
        </a>
      </div>
    </div>
  </a>
</template>

<script setup>
import { defineProps } from "vue";

defineProps({
  place: { type: Object, required: true },
});
</script>

<style scoped></style>
