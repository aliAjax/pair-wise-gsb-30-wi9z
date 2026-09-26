<script setup lang="ts">
// 页面：计划版本——当前版冻结展示，旧版只供查阅
import { usePlanStore } from "../stores/plan";

const store = usePlanStore();

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <section class="panel">
    <h2>计划版本</h2>

    <div v-if="!store.currentVersion" class="empty">还没有生效的版本，请先在草稿中确认一版</div>

    <article v-else class="version current">
      <div class="record-head">
        <p class="record-title">当前版 V{{ store.currentVersion.versionNo }} · {{ store.currentVersion.date }}</p>
        <span class="badge" :class="store.departureReady ? 'ok' : 'warn'">
          {{ store.departureReady ? "已签收可发车" : "未签收禁止发车" }}
        </span>
      </div>
      <p class="meta">生成于 {{ fmt(store.currentVersion.createdAt) }}<template v-if="store.currentVersion.note"> · {{ store.currentVersion.note }}</template></p>
      <table class="frozen">
        <thead>
          <tr><th>顺序</th><th>站点</th><th>油品</th><th>吨数</th><th>车牌</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in store.currentVersion.items" :key="item.orderId">
            <td>{{ item.seq }}</td>
            <td>{{ item.station }}</td>
            <td>{{ item.fuel }}</td>
            <td>{{ item.tons }}</td>
            <td>{{ item.plate }}</td>
          </tr>
        </tbody>
      </table>
    </article>

    <div v-if="store.historyVersions.length > 0" class="history">
      <h3>历史版本（只读）</h3>
      <details v-for="version in store.historyVersions" :key="version.id" class="version archived">
        <summary>
          V{{ version.versionNo }} · {{ version.date }} · 生成于 {{ fmt(version.createdAt) }}
          <template v-if="version.note"> · {{ version.note }}</template>
        </summary>
        <table class="frozen">
          <thead>
            <tr><th>顺序</th><th>站点</th><th>油品</th><th>吨数</th><th>车牌</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in version.items" :key="item.orderId">
              <td>{{ item.seq }}</td>
              <td>{{ item.station }}</td>
              <td>{{ item.fuel }}</td>
              <td>{{ item.tons }}</td>
              <td>{{ item.plate }}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  </section>
</template>
