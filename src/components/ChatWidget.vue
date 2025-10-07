<template>
  <div>
    <!-- Chat Window -->
    <div
      class="w-full mx-auto max-w-sm md:max-w-2xl"
      role="dialog"
      aria-label="Chatbot Hôtel Gascogne"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 px-4 py-3 bg-primary text-white">
          <img src="/logo_hg.png" alt="Hôtel Gascogne" class="h-20" />
          <div>
            <p class="font-semibold leading-tight">
              Votre Concierge · Hôtel Gascogne
            </p>
            <p class="text-white/80 text-xs leading-tight">
              25 allées Charles de Fitte · 31300 Toulouse
            </p>
          </div>
        </div>

        <!-- Messages -->
        <div
          ref="scrollArea"
          class="max-h-[60vh] overflow-y-auto p-4 space-y-3 bg-gray-50 flex flex-col"
        >
          <!-- Welcome message -->
          <ChatBubble who="bot">
            Et bonjour 👋 ! Vous souhaitez découvrir un restaurant, un bar ou
            une activité à proximité ?
          </ChatBubble>

          <!-- Conversation flow -->
          <template v-for="(entry, idx) in conversation" :key="idx">
            <ChatBubble v-if="entry.who === 'bot'" who="bot">{{
              entry.text
            }}</ChatBubble>
            <ChatBubble v-else who="user">{{ entry.text }}</ChatBubble>
          </template>

          <!-- Step: choose category -->
          <div v-if="step === 'choose-category'" class="flex flex-wrap gap-2">
            <button
              class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              @click="selectCategory('restaurant')"
            >
              Restaurant
            </button>
            <button
              class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              @click="selectCategory('bar')"
            >
              Bar
            </button>
            <button
              class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              @click="selectCategory('activity')"
            >
              Activité
            </button>
          </div>

          <!-- Step: filters -->
          <div v-if="step === 'filters'" class="space-y-3">
            <div>
              <p class="text-sm font-medium mb-1">Type</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in typeOptions"
                  :key="opt.value"
                  class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                  :class="{ 'ring-2 ring-primary': filters.type === opt.value }"
                  @click="filters.type = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div>
              <p class="text-sm font-medium mb-1">Budget</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="b in [1, 2, 3]"
                  :key="b"
                  class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                  :class="{ 'ring-2 ring-primary': filters.budget === b }"
                  @click="filters.budget = b"
                >
                  {{ "€".repeat(b) }}
                </button>
              </div>
            </div>
            <div>
              <p class="text-sm font-medium mb-1">Distance depuis l’hôtel</p>
              <div class="flex flex-wrap gap-2">
                <button
                  class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                  :class="{ 'ring-2 ring-primary': filters.maxWalk === 10 }"
                  @click="filters.maxWalk = 10"
                >
                  < 10 min à pied
                </button>
                <button
                  class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                  :class="{ 'ring-2 ring-primary': filters.maxWalk === 20 }"
                  @click="filters.maxWalk = 20"
                >
                  < 20 min à pied
                </button>
              </div>
            </div>
            <div class="pt-1">
              <button
                class="bg-primary text-white font-medium px-4 py-2 rounded-full shadow-lg hover:opacity-95 transition"
                @click="showResults"
              >
                Voir les recommandations
              </button>
            </div>
          </div>

          <!-- Step: results -->
          <div v-if="step === 'results'" class="space-y-3">
            <p class="text-sm text-gray-600">
              Voici quelques suggestions correspondant à vos critères.
            </p>
            <div v-if="results.length === 0" class="text-sm text-gray-600">
              Aucun résultat exact. Voici des options proches de vos préférences
              :
            </div>
            <div class="grid gap-3">
              <ResultCard
                v-for="(p, i) in displayResults"
                :key="i"
                :place="p"
              />
            </div>
            <div class="flex justify-between pt-1">
              <button
                class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                @click="resetAll"
              >
                Nouvelle recherche
              </button>
              <button
                class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                @click="step = 'filters'"
              >
                Ajuster les filtres
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { places } from "../data/places";
import ChatBubble from "./ChatBubble.vue";
import ResultCard from "./ResultCard.vue";

const open = ref(true);
const step = ref("choose-category"); // choose-category | filters | results
const category = ref(null);
const conversation = ref([]);

const filters = ref({ type: null, budget: null, maxWalk: 10 });

const typeOptions = computed(() => {
  if (category.value === "restaurant") {
    return [
      { label: "Italien", value: "italian" },
      { label: "Sud-ouest", value: "southwest" },
      { label: "Français", value: "french" },
      { label: "Asiatique", value: "asian" },
    ];
  }
  if (category.value === "bar") {
    return [
      { label: "Bar à vin", value: "wine" },
      { label: "Cocktail", value: "cocktail" },
      { label: "Brasserie", value: "brasserie" },
    ];
  }
  return [
    { label: "Musée", value: "museum" },
    { label: "Patrimoine", value: "heritage" },
    { label: "Parc/Jardin", value: "park" },
  ];
});

function pushBot(text) {
  conversation.value.push({ who: "bot", text });
}
function pushUser(text) {
  conversation.value.push({ who: "user", text });
}

function selectCategory(cat) {
  category.value = cat;
  pushUser(
    cat === "restaurant"
      ? "Je cherche un restaurant."
      : cat === "bar"
      ? "Je cherche un bar."
      : "Je cherche une activité."
  );
  pushBot("Très bien. Précisez vos préférences ci-dessous, s’il vous plaît :");
  step.value = "filters";
}

const results = ref([]);
const displayResults = computed(() => results.value.slice(0, 6));

function showResults() {
  const list = places[category.value] || [];
  let filtered = list.filter((p) => {
    const okType = !filters.value.type || p.type === filters.value.type;
    const okBudget = !filters.value.budget || p.budget === filters.value.budget;
    const okWalk =
      !filters.value.maxWalk || p.distanceMinutes <= filters.value.maxWalk;
    return okType && okBudget && okWalk;
  });

  if (filtered.length === 0) {
    filtered = list
      .filter((p) => !filters.value.type || p.type === filters.value.type)
      .sort((a, b) => a.distanceMinutes - b.distanceMinutes);
  }

  results.value = filtered;
  pushUser("Voir les recommandations.");
  pushBot("Voici ce que je peux vous proposer :");
  step.value = "results";
}

function resetAll() {
  step.value = "choose-category";
  category.value = null;
  filters.value = { type: null, budget: null, maxWalk: 10 };
  results.value = [];
  conversation.value.push({
    who: "bot",
    text: "Souhaitez-vous un restaurant, un bar ou une activité ?",
  });
}

const scrollArea = ref(null);
watch(conversation, async () => {
  await nextTick();
  if (scrollArea.value)
    scrollArea.value.scrollTop = scrollArea.value.scrollHeight;
});

onMounted(() => {
  open.value = true;
});
</script>
