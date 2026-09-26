<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { project, type Field } from "../config/project";
import { useOrdersStore, type RecordItem } from "../stores/orders";

const fields = project.fields as readonly Field[];
const statuses = [...project.statuses];
const ordersStore = useOrdersStore();

function createBlank() {
  return Object.fromEntries(fields.map((field) => [field.key, field.type === "number" ? 0 : ""]));
}

const form = reactive<Record<string, string | number>>(createBlank());
const note = ref("");
const filter = ref(project.filters[0]);

const filteredRecords = computed(() => {
  if (filter.value.startsWith("全部")) return ordersStore.records;
  return ordersStore.records.filter((record) => Object.values(record).includes(filter.value));
});

const metrics = computed(() => {
  const total = ordersStore.records.length;
  const second = ordersStore.records.filter((record) => record.status === statuses[1]).length;
  const third = ordersStore.records.filter((record) => record.status === statuses[2]).length;
  const numberValues = ordersStore.records.flatMap((record) =>
    fields.filter((field) => field.type === "number").map((field) => Number(record[field.key] || 0))
  );
  const sum = numberValues.reduce((acc, value) => acc + value, 0);
  return [total, second || sum, third || Math.round(sum / Math.max(total, 1))];
});

const chartRows = computed(() =>
  statuses.map((status) => ({
    status,
    value: ordersStore.records.filter((record) => record.status === status).length
  }))
);

const maxChart = computed(() => Math.max(1, ...chartRows.value.map((row) => row.value)));

function primaryText(record: RecordItem) {
  const first = fields[0];
  const second = fields[1];
  return [record[first.key], record[second.key]].filter(Boolean).join(" / ") || project.entityLabel;
}

function copySummary(record: RecordItem) {
  navigator.clipboard?.writeText(primaryText(record));
}

function submit() {
  ordersStore.add(form, note.value);
  Object.assign(form, createBlank());
  note.value = "";
}
</script>

<template>
  <section class="metrics">
    <article v-for="(label, index) in project.metricLabels" :key="label" class="metric">
      <span>{{ label }}</span>
      <strong>{{ metrics[index] }}</strong>
    </article>
  </section>

  <section class="workspace">
    <form class="panel" @submit.prevent="submit">
      <h2>{{ project.formTitle }}</h2>
      <div class="form-grid">
        <label v-for="field in fields" :key="field.key">
          {{ field.label }}
          <select v-if="field.type === 'select'" v-model="form[field.key]" required>
            <option value="">请选择</option>
            <option v-for="option in field.options" :key="option">{{ option }}</option>
          </select>
          <input v-else v-model="form[field.key]" :type="field.type || 'text'" required />
        </label>
        <label>
          备注
          <textarea v-model="note" placeholder="填写处理说明或现场备注" />
        </label>
        <button type="submit">{{ project.primaryAction }}</button>
      </div>
    </form>

    <section class="list-panel">
      <div class="toolbar">
        <h2>{{ project.entityLabel }}列表</h2>
        <select v-model="filter">
          <option v-for="item in project.filters" :key="item">{{ item }}</option>
        </select>
      </div>

      <div class="record-grid">
        <div v-if="filteredRecords.length === 0" class="empty">暂无匹配数据</div>
        <article v-for="record in filteredRecords" :key="record.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ primaryText(record) }}</p>
            <span class="status">{{ record.status }}</span>
          </div>
          <div class="details">
            <span v-for="field in fields" :key="field.key">{{ field.label }}: {{ record[field.key] }}</span>
          </div>
          <p class="note">{{ record.notes }}</p>
          <div class="actions">
            <button type="button" @click="ordersStore.flow(record)">流转状态</button>
            <button class="secondary" type="button" @click="copySummary(record)">复制摘要</button>
            <button class="danger" type="button" @click="ordersStore.remove(record.id)">删除</button>
          </div>
        </article>
      </div>

      <div class="mini-chart">
        <div v-for="row in chartRows" :key="row.status" class="bar">
          <span>{{ row.status }}</span>
          <div class="bar-track"><div class="bar-fill" :style="{ width: `${(row.value / maxChart) * 100}%` }" /></div>
          <strong>{{ row.value }}</strong>
        </div>
      </div>
    </section>
  </section>
</template>
