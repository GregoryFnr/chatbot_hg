<template>
  <div>
    <!-- Chat Window -->
    <div
      class="w-full mx-auto max-w-full md:max-w-2xl"
      role="dialog"
      aria-label="Chatbot Hôtel Gascogne"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 px-4 py-3 bg-primary text-white">
          <!--
          <img src="/logo_hg.png" alt="Hôtel Gascogne" class="h-20" />
          -->
          <div>
            <p class="font-semibold leading-tight">Votre Concierge</p>
            <p class="text-white/80 text-xs leading-tight">
              Place de la Concorde
            </p>
          </div>
        </div>

        <!-- Messages -->
        <div
          ref="scrollArea"
          class="min-h-[60vh] max-h-[80vh] md:max-h-[70vh] overflow-y-auto p-4 space-y-3 bg-gray-50 flex flex-col"
        >
          <!-- Welcome message -->
          <ChatBubble who="bot">
            Et bonjour 👋 ! Vous souhaitez découvrir un restaurant, un bar ou
            une activité à proximité ?
          </ChatBubble>

          <!-- Conversation flow -->
          <TransitionGroup
            tag="div"
            class="flex flex-col gap-3"
            enter-from-class="opacity-0 translate-y-2"
            enter-active-class="transition duration-300 ease-out"
            leave-to-class="opacity-0"
            leave-active-class="transition duration-200 ease-in"
          >
            <ChatBubble
              v-for="(entry, idx) in conversation"
              :key="idx"
              :who="entry.who === 'bot' ? 'bot' : 'user'"
            >
              {{ entry.text }}
            </ChatBubble>
          </TransitionGroup>

          <!-- Typing indicator -->
          <ChatBubble v-if="isTyping" who="bot">
            <span class="inline-flex items-center gap-1">
              <span
                class="inline-block h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                style="animation-delay: 0ms"
              ></span>
              <span
                class="inline-block h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                style="animation-delay: 120ms"
              ></span>
              <span
                class="inline-block h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                style="animation-delay: 240ms"
              ></span>
            </span>
          </ChatBubble>

          <!-- Step: choose category -->
          <div v-if="step === 'choose-category'" class="flex flex-wrap gap-2">
            <button
              class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
              @click="selectCategory('restaurant')"
            >
              Restaurant
            </button>
            <button
              class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
              @click="selectCategory('bar')"
            >
              Bar
            </button>
            <button
              class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
              @click="selectCategory('activity')"
            >
              Activité
            </button>
          </div>

          <!-- Step: filters -->
          <div v-if="step === 'filters'" class="space-y-3">
            <div>
              <p class="text-sm font-medium mb-1">Type de cuisine</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in typeOptions"
                  :key="opt.value"
                  class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
                  :class="{
                    'ring-2 ring-accent bg-gray-200':
                      filters.type === opt.value,
                  }"
                  @click="filters.type = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div v-if="category === 'activity'">
              <p class="text-sm font-medium mb-1">Tarification</p>
              <div class="flex flex-wrap gap-2">
                <button
                  class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
                  :class="{
                    'ring-2 ring-accent bg-gray-200': filters.price === 'free',
                  }"
                  @click="filters.price = 'free'"
                >
                  Gratuit
                </button>
                <button
                  class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
                  :class="{
                    'ring-2 ring-accent bg-gray-200': filters.price === 'paid',
                  }"
                  @click="filters.price = 'paid'"
                >
                  Payant
                </button>
              </div>
            </div>
            <div>
              <p class="text-sm font-medium mb-1">Distance depuis l’hôtel</p>
              <div class="flex flex-wrap gap-2">
                <button
                  class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
                  :class="{
                    'ring-2 ring-accent bg-gray-200': filters.maxWalk === 10,
                  }"
                  @click="filters.maxWalk = 10"
                >
                  < 10 min à pied
                </button>
                <button
                  class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
                  :class="{
                    'ring-2 ring-accent bg-gray-200': filters.maxWalk === 20,
                  }"
                  @click="filters.maxWalk = 20"
                >
                  < 20 min à pied
                </button>
              </div>
            </div>
            <div class="pt-1 flex justify-between">
              <button
                class="bg-accent text-white font-medium px-4 py-2 text-sm rounded-full hover:opacity-85 ease-in-out duration-200 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center"
                :disabled="isLoading"
                @click="showResults"
              >
                <span
                  v-if="isLoading"
                  class="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                ></span>
                Voir les recommandations
              </button>
              <button
                class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
                @click="resetAll"
              >
                Nouvelle recherche
              </button>
            </div>
          </div>

          <!-- Step: results -->
          <div v-if="results.length > 0" class="space-y-3">
            <p class="text-sm text-gray-600">
              Et voilà quelques suggestions selon vos critères :
            </p>
            <div class="grid gap-3">
              <!-- Skeletons while loading -->
              <template v-if="isLoading">
                <div
                  v-for="n in 6"
                  :key="'sk-' + n"
                  class="rounded-xl border border-gray-200 p-3 bg-white animate-pulse"
                >
                  <div class="h-4 w-2/3 bg-gray-200 rounded mb-2"></div>
                  <div class="h-3 w-1/2 bg-gray-200 rounded mb-3"></div>
                  <div class="flex gap-2">
                    <div class="h-5 w-20 bg-gray-200 rounded-full"></div>
                    <div class="h-5 w-24 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </template>
              <template v-else>
                <ResultCard
                  v-for="(p, i) in displayResults"
                  :key="i"
                  :place="p"
                />
              </template>
            </div>
            <div class="flex justify-between pt-1">
              <button
                class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
                @click="resetAll"
              >
                Nouvelle recherche
              </button>
              <button
                class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 border ease-in-out duration-200"
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
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { getRecommendations } from "../services/recommendation";
import ChatBubble from "./ChatBubble.vue";
import ResultCard from "./ResultCard.vue";

const open = ref(true);
const step = ref("choose-category"); // choose-category | filters | results
const category = ref(null);
const conversation = ref([]);

const filters = ref({ type: null, price: null, maxWalk: 10 });

const typeOptions = computed(() => {
  if (category.value === "restaurant") {
    return [
      { label: "Italien", value: "italian" },
      { label: "Français", value: "french" },
      { label: "Asiatique", value: "asian" },
      { label: "Fast food", value: "fastfood" },
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

async function selectCategory(cat) {
  category.value = cat;
  pushUser(
    cat === "restaurant"
      ? "Je cherche un restaurant."
      : cat === "bar"
      ? "Je cherche un bar."
      : "Je cherche une activité."
  );
  isTyping.value = true;
  await new Promise((r) => setTimeout(r, 500));
  pushBot("Très bien. Précisez vos préférences ci-dessous, s’il vous plaît :");
  isTyping.value = false;
  step.value = "filters";
}

const results = ref([]);
const displayResults = computed(() => results.value.slice(0, 6));
const isLoading = ref(false);
const isTyping = ref(false);

async function showResults() {
  pushUser("Voir les recommandations.");
  pushBot("Je prépare des suggestions...");
  isTyping.value = true;
  isLoading.value = true;
  // Show results step immediately to render skeletons
  step.value = "results";

  try {
    const recs = await getRecommendations({
      category: category.value,
      filters: filters.value,
      limit: 6,
    });
    results.value = Array.isArray(recs) ? recs : [];
    // Replace the last bot message with the final intro
    conversation.value.pop();
    if (results.value.length === 0) {
      pushBot(
        "Désolé, aucune suggestion, veuillez faire une nouvelle recherche"
      );
    } else {
      pushBot("Voici ce que je peux vous proposer :");
    }
  } catch (e) {
    conversation.value.pop();
    pushBot(
      "Une erreur est survenue. Réessayez plus tard ou modifiez vos filtres."
    );
  } finally {
    isTyping.value = false;
    isLoading.value = false;
  }
}

function resetAll() {
  step.value = "choose-category";
  category.value = null;
  filters.value = { type: null, budget: null, price: null, maxWalk: 10 };
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
