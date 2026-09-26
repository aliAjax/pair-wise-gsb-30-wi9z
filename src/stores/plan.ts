// 状态层：连接资料、判版与保存，页面只调 action、读 getter
import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { DeliveryOrder, OrderStatus, PlanDraft, PlanItem, PlanVersion, SignRecord } from "../types";
import { ORDER_STATUSES } from "../types";
import {
  buildVersion,
  canDepart,
  currentVersionOf,
  draftDirty,
  isSigned,
  itemsFromPendingOrders,
  makeSignRecord,
  moveItem,
  normalizeSeq,
  signsOfVersion,
  todayStr,
  validateDraft
} from "../lib/planLogic";
import { loadState, saveState } from "../lib/storage";

export const usePlanStore = defineStore("departure-plan", () => {
  const persisted = loadState();
  const orders = ref<DeliveryOrder[]>(persisted.orders);
  const draft = ref<PlanDraft | null>(persisted.draft);
  const versions = ref<PlanVersion[]>(persisted.versions);
  const signs = ref<SignRecord[]>(persisted.signs);

  function persist() {
    saveState({
      orders: orders.value,
      draft: draft.value,
      versions: versions.value,
      signs: signs.value
    });
  }

  // ---------- 配送单 ----------
  function addOrder(payload: Pick<DeliveryOrder, "station" | "fuel" | "tons" | "arriveAt" | "notes">) {
    orders.value = [
      {
        ...payload,
        id: crypto.randomUUID(),
        status: "待发车",
        createdAt: new Date().toISOString()
      },
      ...orders.value
    ];
    persist();
  }

  function removeOrder(id: string) {
    orders.value = orders.value.filter((order) => order.id !== id);
    if (draft.value) {
      draft.value = {
        ...draft.value,
        items: normalizeSeq(draft.value.items.filter((item) => item.orderId !== id)),
        updatedAt: new Date().toISOString()
      };
    }
    persist();
  }

  function flowOrder(id: string) {
    const order = orders.value.find((item) => item.id === id);
    if (!order) return;
    const index = ORDER_STATUSES.indexOf(order.status as OrderStatus);
    order.status = ORDER_STATUSES[(index + 1) % ORDER_STATUSES.length];
    persist();
  }

  // ---------- 草稿 ----------
  /** 把待发单编入草稿：已入草稿的保留改动，只补充新待发单 */
  function compileDraft() {
    const pending = itemsFromPendingOrders(orders.value);
    const base = currentVersion.value?.versionNo ?? null;
    if (!draft.value) {
      draft.value = { date: todayStr(), items: pending, baseVersion: base, updatedAt: new Date().toISOString() };
    } else {
      const existing = new Set(draft.value.items.map((item) => item.orderId));
      const appended = pending.filter((item) => !existing.has(item.orderId));
      draft.value = {
        ...draft.value,
        items: normalizeSeq([...draft.value.items, ...appended]),
        updatedAt: new Date().toISOString()
      };
    }
    persist();
  }

  function updateDraftItem(orderId: string, patch: Partial<Omit<PlanItem, "orderId" | "seq">>) {
    if (!draft.value) return;
    draft.value = {
      ...draft.value,
      items: draft.value.items.map((item) => (item.orderId === orderId ? { ...item, ...patch } : item)),
      updatedAt: new Date().toISOString()
    };
    persist();
  }

  function moveDraftItem(orderId: string, dir: -1 | 1) {
    if (!draft.value) return;
    draft.value = { ...draft.value, items: moveItem(draft.value.items, orderId, dir), updatedAt: new Date().toISOString() };
    persist();
  }

  function removeDraftItem(orderId: string) {
    if (!draft.value) return;
    draft.value = {
      ...draft.value,
      items: normalizeSeq(draft.value.items.filter((item) => item.orderId !== orderId)),
      updatedAt: new Date().toISOString()
    };
    persist();
  }

  function discardDraft() {
    draft.value = null;
    persist();
  }

  /** 确认草稿：生成新版本，旧版归档只供查阅；返回错误列表 */
  function confirmDraft(note: string): string[] {
    const errors = validateDraft(draft.value);
    if (errors.length > 0 || !draft.value) return errors;
    const version = buildVersion(draft.value, versions.value, note);
    versions.value = [
      version,
      ...versions.value.map((item) => (item.status === "current" ? { ...item, status: "archived" as const } : item))
    ];
    draft.value = null;
    persist();
    return [];
  }

  // ---------- 签收 ----------
  /** 签收当前版；重复签收只补记录。返回错误信息或 null */
  function signCurrent(driver: string): string | null {
    const current = currentVersion.value;
    if (!current) return "还没有生效的计划版本";
    if (!driver.trim()) return "请填写司机姓名";
    signs.value = [...signs.value, makeSignRecord(current, signs.value, driver)];
    persist();
    return null;
  }

  // ---------- 判版 getter ----------
  const currentVersion = computed(() => currentVersionOf(versions.value));
  const historyVersions = computed(() =>
    versions.value.filter((item) => item.status === "archived").sort((a, b) => b.versionNo - a.versionNo)
  );
  const pendingOrders = computed(() => orders.value.filter((order) => order.status === "待发车"));
  const currentSigns = computed(() => (currentVersion.value ? signsOfVersion(signs.value, currentVersion.value.id) : []));
  const signed = computed(() => isSigned(currentVersion.value, signs.value));
  const departureReady = computed(() => canDepart(currentVersion.value, signs.value));
  const isDraftDirty = computed(() => draftDirty(draft.value, currentVersion.value));
  const draftErrors = computed(() => validateDraft(draft.value));

  return {
    orders,
    draft,
    versions,
    signs,
    addOrder,
    removeOrder,
    flowOrder,
    compileDraft,
    updateDraftItem,
    moveDraftItem,
    removeDraftItem,
    discardDraft,
    confirmDraft,
    signCurrent,
    currentVersion,
    historyVersions,
    pendingOrders,
    currentSigns,
    signed,
    departureReady,
    isDraftDirty,
    draftErrors
  };
});
