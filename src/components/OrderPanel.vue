<script setup lang="ts">
// 页面：配送单——按单张保存，是发车计划的来源
import { reactive, ref } from "vue";
import { FUELS, STATIONS } from "../types";
import { usePlanStore } from "../stores/plan";

const store = usePlanStore();

const form = reactive({
  station: "",
  fuel: "",
  tons: 0,
  arriveAt: "",
  notes: ""
});

const filter = ref("全部油站");
const filters = ["全部油站", ...STATIONS];

function filteredOrders() {
  if (filter.value === "全部油站") return store.orders;
  return store.orders.filter((order) => order.station === filter.value);
}

function submit() {
  store.addOrder({
    station: form.station,
    fuel: form.fuel,
    tons: Number(form.tons),
    arriveAt: form.arriveAt,
    notes: form.notes || "暂无备注"
  });
  Object.assign(form, { station: "", fuel: "", tons: 0, arriveAt: "", notes: "" });
}
</script>

<template>
  <section class="panel">
    <h2>配送单</h2>
    <form class="form-grid" @submit.prevent="submit">
      <label>
        目标油站
        <select v-model="form.station" required>
          <option value="">请选择</option>
          <option v-for="station in STATIONS" :key="station">{{ station }}</option>
        </select>
      </label>
      <label>
        油品
        <select v-model="form.fuel" required>
          <option value="">请选择</option>
          <option v-for="fuel in FUELS" :key="fuel">{{ fuel }}</option>
        </select>
      </label>
      <label>
        配送吨数
        <input v-model.number="form.tons" type="number" min="0" step="0.5" required />
      </label>
      <label>
        计划到达
        <input v-model="form.arriveAt" type="date" required />
      </label>
      <label>
        备注
        <textarea v-model="form.notes" placeholder="填写处理说明或现场备注" />
      </label>
      <button type="submit">保存配送单</button>
    </form>

    <div class="toolbar sub-list">
      <h3>单据传票</h3>
      <select v-model="filter">
        <option v-for="item in filters" :key="item">{{ item }}</option>
      </select>
    </div>
    <div class="record-grid">
      <div v-if="filteredOrders().length === 0" class="empty">暂无匹配数据</div>
      <article v-for="order in filteredOrders()" :key="order.id" class="record">
        <div class="record-head">
          <p class="record-title">{{ order.station }} / {{ order.fuel }}</p>
          <span class="status" :class="{ pending: order.status === '待发车' }">{{ order.status }}</span>
        </div>
        <div class="details">
          <span>吨数: {{ order.tons }}</span>
          <span>计划到达: {{ order.arriveAt }}</span>
        </div>
        <p class="note">{{ order.notes }}</p>
        <div class="actions">
          <button type="button" @click="store.flowOrder(order.id)">流转状态</button>
          <button class="danger" type="button" @click="store.removeOrder(order.id)">删除</button>
        </div>
      </article>
    </div>
  </section>
</template>
