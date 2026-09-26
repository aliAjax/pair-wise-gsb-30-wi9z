<script setup lang="ts">
import { ref } from "vue";
import { project } from "./config/project";
import OrderBoard from "./components/OrderBoard.vue";
import PlanBoard from "./components/PlanBoard.vue";

const tabs = [
  { key: "orders", label: "配送单" },
  { key: "plan", label: "当天发车计划" }
] as const;

const active = ref<(typeof tabs)[number]["key"]>("orders");
</script>

<template>
  <main class="app">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ project.industry }}行业前端最小闭环</p>
          <h1>{{ project.title }}</h1>
          <p class="subtitle">{{ project.subtitle }}</p>
        </div>
        <div class="stack">
          <span v-for="item in project.stack" :key="item" class="tag">{{ item }}</span>
        </div>
      </header>

      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: active === tab.key }"
          type="button"
          @click="active = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <OrderBoard v-if="active === 'orders'" />
      <PlanBoard v-else />
    </div>
  </main>
</template>
