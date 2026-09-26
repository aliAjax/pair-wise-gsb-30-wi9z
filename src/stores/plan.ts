import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  checkDepart,
  compileDraft,
  confirmDraft,
  draftFromVersion,
  effectiveVersion,
  makeSignoff,
  moveItem,
  nextVersionNo,
  normalizeSeq,
  signoffsOf,
  todayKey,
  validateDraft,
  type OrderSnapshot,
  type PlanDraft,
  type PlanItem,
  type PlanVersion,
  type SignOff
} from "../domain/plan";
import { fleet } from "../config/project";
import { loadJSON, saveJSON } from "../storage/local";

const STORAGE_KEY = "hxwlfront-19-departure-plan";

interface PlanState {
  /** 当天草稿，按日期存放，重开页面仍在 */
  drafts: Record<string, PlanDraft>;
  /** 已确认的版本，旧版只供查阅 */
  versions: PlanVersion[];
  /** 签收记录，重复签收只补记录 */
  signoffs: SignOff[];
}

function blank(): PlanState {
  return { drafts: {}, versions: [], signoffs: [] };
}

/** 当天发车计划：草稿、版本、签收的状态编排，判版规则在 domain/plan.ts */
export const usePlanStore = defineStore("plan", () => {
  const state = ref<PlanState>(loadJSON(STORAGE_KEY, blank));
  const date = todayKey();

  const draft = computed(() => state.value.drafts[date]);
  const versions = computed(() =>
    state.value.versions
      .filter((version) => version.date === date)
      .sort((a, b) => b.versionNo - a.versionNo)
  );
  const current = computed(() => effectiveVersion(state.value.versions, date));
  const history = computed(() => versions.value.filter((version) => version.id !== current.value?.id));
  const currentSignoffs = computed(() =>
    current.value ? signoffsOf(state.value.signoffs, current.value.id) : []
  );
  const depart = computed(() => checkDepart(current.value, state.value.versions, state.value.signoffs));
  const nextNo = computed(() => nextVersionNo(state.value.versions, date));

  function persist() {
    saveJSON(STORAGE_KEY, state.value);
  }

  function touch(next: PlanDraft) {
    state.value.drafts = {
      ...state.value.drafts,
      [date]: { ...next, updatedAt: new Date().toISOString() }
    };
    persist();
  }

  /** 把待发单编成一版草稿 */
  function compile(orders: OrderSnapshot[]) {
    touch(compileDraft(orders, fleet, date, current.value?.versionNo ?? null));
  }

  /** 在当前版基础上起草稿（临时换车、换站） */
  function revise() {
    if (!current.value) return;
    touch(draftFromVersion(current.value));
  }

  function setPlate(orderId: string, plate: string) {
    if (!draft.value) return;
    touch({
      ...draft.value,
      items: draft.value.items.map((item) => (item.orderId === orderId ? { ...item, plate } : item))
    });
  }

  function move(orderId: string, offset: number) {
    if (!draft.value) return;
    touch({ ...draft.value, items: moveItem(draft.value.items, orderId, offset) });
  }

  function drop(orderId: string) {
    if (!draft.value) return;
    touch({
      ...draft.value,
      items: normalizeSeq(draft.value.items.filter((item) => item.orderId !== orderId))
    });
  }

  function addOrder(order: OrderSnapshot) {
    if (!draft.value) return;
    const item: PlanItem = {
      orderId: order.id,
      plate: fleet[draft.value.items.length % fleet.length] ?? "",
      station: order.station,
      fuel: order.fuel,
      tons: order.tons,
      seq: draft.value.items.length + 1
    };
    touch({ ...draft.value, items: [...draft.value.items, item] });
  }

  function discard() {
    const drafts = { ...state.value.drafts };
    delete drafts[date];
    state.value.drafts = drafts;
    persist();
  }

  /** 确认草稿：冻结生成新版本，旧版转入历史；返回校验错误 */
  function confirm(): string | null {
    if (!draft.value) return "没有待确认的草稿";
    const error = validateDraft(draft.value);
    if (error) return error;
    const version = confirmDraft(draft.value, state.value.versions);
    state.value.versions = [...state.value.versions, version];
    discard();
    return null;
  }

  /** 司机签收当前版：重复签收只补记录；返回校验错误 */
  function sign(driver: string): string | null {
    if (!current.value) return "当天还没有生效计划";
    const name = driver.trim();
    if (!name) return "请填写司机姓名";
    state.value.signoffs = [...state.value.signoffs, makeSignoff(current.value, name)];
    persist();
    return null;
  }

  function signoffsFor(versionId: string): SignOff[] {
    return signoffsOf(state.value.signoffs, versionId);
  }

  return {
    date,
    draft,
    versions,
    current,
    history,
    currentSignoffs,
    depart,
    nextNo,
    compile,
    revise,
    setPlate,
    move,
    drop,
    addOrder,
    discard,
    confirm,
    sign,
    signoffsFor
  };
});
