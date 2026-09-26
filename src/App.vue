<script setup lang="ts">
import { computed } from "vue";
import OrderPanel from "./components/OrderPanel.vue";
import DraftPanel from "./components/DraftPanel.vue";
import VersionPanel from "./components/VersionPanel.vue";
import SignPanel from "./components/SignPanel.vue";
import { usePlanStore } from "./stores/plan";

const store = usePlanStore();

const metrics = computed(() => [
  { label: "配送单", value: store.orders.length },
  { label: "待发车", value: store.pendingOrders.length },
  { label: "当前版本", value: store.currentVersion ? `V${store.currentVersion.versionNo}` : "未生成" },
  {
    label: "发车状态",
    value: !store.currentVersion ? "无计划" : store.departureReady ? "可发车" : "未签收"
  }
]);
</script>

<template>
  <main class="app">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">石油行业前端最小闭环</p>
          <h1>油品配送计划</h1>
          <p class="subtitle">
            配送单按张保存；当天待发单编成一版发车计划，冻结车牌、油品、吨数和站点顺序。
            改动先存草稿，确认后生成新版本，旧版只供查阅；司机出车前核对版本，新版本签收后才能发车。
          </p>
        </div>
        <div class="stack">
          <span v-for="item in ['Vue3', 'Vite', 'TypeScript', 'Pinia', 'Element Plus']" :key="item" class="tag">{{ item }}</span>
        </div>
      </header>

      <section class="metrics four">
        <article v-for="metric in metrics" :key="metric.label" class="metric">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </section>

      <section class="board">
        <div class="col">
          <OrderPanel />
        </div>
        <div class="col">
          <DraftPanel />
          <VersionPanel />
          <SignPanel />
        </div>
      </section>
    </div>
  </main>
</template>
