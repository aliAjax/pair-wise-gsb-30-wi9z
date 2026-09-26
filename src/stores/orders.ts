import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { project } from "../config/project";
import { loadJSON, saveJSON } from "../storage/local";

export type RecordItem = {
  id: string;
  status: string;
  notes: string;
  createdAt: string;
  [key: string]: string | number;
};

const statuses: string[] = [...project.statuses];

function seed(): RecordItem[] {
  return project.records.map((record, index) => ({
    ...record,
    id: `seed-${index + 1}`,
    createdAt: new Date(Date.now() - index * 86400000).toISOString()
  }));
}

/** 配送单资料：按单张保存，状态在待发车、运输中、已到站之间流转 */
export const useOrdersStore = defineStore("orders", () => {
  const records = ref<RecordItem[]>(loadJSON(project.storageKey, seed));

  const pending = computed(() => records.value.filter((record) => record.status === statuses[0]));

  function persist() {
    saveJSON(project.storageKey, records.value);
  }

  function add(form: Record<string, string | number>, note: string) {
    records.value = [
      {
        ...form,
        id: crypto.randomUUID(),
        status: statuses[0],
        notes: note || "暂无备注",
        createdAt: new Date().toISOString()
      } as RecordItem,
      ...records.value
    ];
    persist();
  }

  function flow(record: RecordItem) {
    const index = statuses.indexOf(record.status);
    record.status = statuses[(index + 1) % statuses.length];
    persist();
  }

  function remove(id: string) {
    records.value = records.value.filter((record) => record.id !== id);
    persist();
  }

  /** 发车：把版本内的待发单转入运输中，已在途的不动 */
  function markDeparted(orderIds: string[]) {
    const ids = new Set(orderIds);
    records.value = records.value.map((record) =>
      ids.has(record.id) && record.status === statuses[0]
        ? { ...record, status: statuses[1] }
        : record
    );
    persist();
  }

  return { records, pending, add, flow, remove, markDeparted };
});
