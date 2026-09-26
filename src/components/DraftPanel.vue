<script setup lang="ts">
// 页面：当天计划草稿——改动先存草稿，确认后才生成新版本
import { computed, ref } from "vue";
import { FUELS, STATIONS } from "../types";
import { usePlanStore } from "../stores/plan";

const store = usePlanStore();
const note = ref("");
const confirmErrors = ref<string[]>([]);
const confirmed = ref(false);

const sortedItems = computed(() =>
  store.draft ? [...store.draft.items].sort((a, b) => a.seq - b.seq) : []
);

function confirm() {
  const errors = store.confirmDraft(note.value);
  confirmErrors.value = errors;
  if (errors.length === 0) {
    note.value = "";
    confirmed.value = true;
    setTimeout(() => (confirmed.value = false), 3000);
  }
}
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2>当天发车计划 · 草稿</h2>
      <span v-if="store.draft" class="badge" :class="store.isDraftDirty ? 'warn' : 'ok'">
        {{ store.isDraftDirty ? "与当前版不一致" : "与当前版一致" }}
      </span>
    </div>

    <div class="actions draft-actions">
      <button type="button" @click="store.compileDraft()">
        {{ store.draft ? "补充新待发单" : "把待发单编成草稿" }}
      </button>
      <span class="hint">待发单 {{ store.pendingOrders.length }} 张</span>
    </div>

    <div v-if="!store.draft" class="empty">还没有草稿，点击上方按钮把待发单编进来</div>

    <template v-else>
      <p class="meta">
        计划日期 {{ store.draft.date }} ·
        基于 {{ store.draft.baseVersion ? `V${store.draft.baseVersion}` : "无历史版本" }} ·
        更新于 {{ new Date(store.draft.updatedAt).toLocaleTimeString() }}
      </p>

      <div v-if="sortedItems.length === 0" class="empty">草稿为空，请编入待发单</div>
      <div v-for="item in sortedItems" :key="item.orderId" class="draft-item">
        <div class="seq">
          <strong>{{ item.seq }}</strong>
          <div class="seq-btns">
            <button type="button" title="上移" @click="store.moveDraftItem(item.orderId, -1)">↑</button>
            <button type="button" title="下移" @click="store.moveDraftItem(item.orderId, 1)">↓</button>
          </div>
        </div>
        <div class="draft-fields">
          <label>
            站点
            <select :value="item.station" @change="store.updateDraftItem(item.orderId, { station: ($event.target as HTMLSelectElement).value })">
              <option v-for="station in STATIONS" :key="station">{{ station }}</option>
            </select>
          </label>
          <label>
            油品
            <select :value="item.fuel" @change="store.updateDraftItem(item.orderId, { fuel: ($event.target as HTMLSelectElement).value })">
              <option v-for="fuel in FUELS" :key="fuel">{{ fuel }}</option>
            </select>
          </label>
          <label>
            吨数
            <input
              type="number"
              min="0"
              step="0.5"
              :value="item.tons"
              @input="store.updateDraftItem(item.orderId, { tons: Number(($event.target as HTMLInputElement).value) })"
            />
          </label>
          <label>
            车牌
            <input
              type="text"
              placeholder="如 鲁A12345"
              :value="item.plate"
              @input="store.updateDraftItem(item.orderId, { plate: ($event.target as HTMLInputElement).value })"
            />
          </label>
        </div>
        <button class="danger remove" type="button" @click="store.removeDraftItem(item.orderId)">移出</button>
      </div>

      <label class="version-note">
        版本说明
        <input v-model="note" type="text" placeholder="如：机场站临时换车" />
      </label>

      <ul v-if="confirmErrors.length > 0 || store.draftErrors.length > 0" class="errors">
        <li v-for="error in [...new Set([...confirmErrors, ...store.draftErrors])]" :key="error">{{ error }}</li>
      </ul>
      <p v-if="confirmed" class="ok-text">已生成新版本，旧版已归档</p>

      <div class="actions">
        <button type="button" :disabled="!store.isDraftDirty && store.currentVersion" @click="confirm">
          确认生成新版本
        </button>
        <button class="secondary" type="button" @click="store.discardDraft()">放弃草稿</button>
      </div>
    </template>
  </section>
</template>
