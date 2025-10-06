<script setup>
import ChatWidget from './components/ChatWidget.vue'
</script>

<template>
  <main class="min-h-screen bg-white">
    <!-- Placeholder content area; the widget floats over the page -->
    <section class="max-w-5xl mx-auto px-4 py-10">
      <div class="space-y-2">
        <img src="/logo-hg.svg" alt="Hôtel Gascogne" class="h-10" />
        <h1 class="text-2xl font-semibold">Hôtel Gascogne · Toulouse</h1>
        <p class="text-gray-600">Bienvenue. Scannez le QR code pour accéder au concierge numérique et découvrir Toulouse.</p>
      </div>
    </section>

    <ChatWidget />
  </main>
  
</template>

<style scoped>
</style>
