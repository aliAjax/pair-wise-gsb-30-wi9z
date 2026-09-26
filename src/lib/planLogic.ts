// 判版层：纯函数，不碰页面也不碰存储，方便单测和替换
import type { DeliveryOrder, PlanDraft, PlanItem, PlanVersion, SignRecord } from "../types";

export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 把待发单编成计划条目（站点顺序按列表顺序生成） */
export function itemsFromPendingOrders(orders: DeliveryOrder[]): PlanItem[] {
  return orders
    .filter((order) => order.status === "待发车")
    .map((order, index) => ({
      orderId: order.id,
      plate: "",
      fuel: order.fuel,
      tons: order.tons,
      station: order.station,
      seq: index + 1
    }));
}

/** 重排站点顺序，保证 seq 连续从 1 开始 */
export function normalizeSeq(items: PlanItem[]): PlanItem[] {
  return items.map((item, index) => ({ ...item, seq: index + 1 }));
}

export function moveItem(items: PlanItem[], orderId: string, dir: -1 | 1): PlanItem[] {
  const sorted = [...items].sort((a, b) => a.seq - b.seq);
  const index = sorted.findIndex((item) => item.orderId === orderId);
  const target = index + dir;
  if (index < 0 || target < 0 || target >= sorted.length) return sorted;
  [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  return normalizeSeq(sorted);
}

/** 比较两组条目在冻结字段上是否一致（车牌、油品、吨数、站点、顺序） */
export function sameFrozenItems(a: PlanItem[], b: PlanItem[]): boolean {
  if (a.length !== b.length) return false;
  const bySeq = (list: PlanItem[]) => [...list].sort((x, y) => x.seq - y.seq);
  const left = bySeq(a);
  const right = bySeq(b);
  return left.every((item, i) => {
    const other = right[i];
    return (
      item.orderId === other.orderId &&
      item.plate === other.plate &&
      item.fuel === other.fuel &&
      item.tons === other.tons &&
      item.station === other.station &&
      item.seq === other.seq
    );
  });
}

/** 判版：草稿相对当前版是否有改动 */
export function draftDirty(draft: PlanDraft | null, current: PlanVersion | null): boolean {
  if (!draft) return false;
  if (!current) return draft.items.length > 0;
  return !sameFrozenItems(draft.items, current.items);
}

/** 确认前校验，返回错误列表（空数组表示可确认） */
export function validateDraft(draft: PlanDraft | null): string[] {
  const errors: string[] = [];
  if (!draft || draft.items.length === 0) {
    errors.push("草稿为空，请先编入待发单");
    return errors;
  }
  draft.items.forEach((item) => {
    const label = `第${item.seq}站（${item.station || "未选站点"}）`;
    if (!item.station) errors.push(`${label}：缺少站点`);
    if (!item.plate.trim()) errors.push(`${label}：缺少车牌`);
    if (!item.fuel) errors.push(`${label}：缺少油品`);
    if (!(item.tons > 0)) errors.push(`${label}：吨数必须大于 0`);
  });
  return errors;
}

export function nextVersionNo(versions: PlanVersion[]): number {
  return versions.reduce((max, v) => Math.max(max, v.versionNo), 0) + 1;
}

/** 由草稿生成新版本（调用方负责把旧版归档） */
export function buildVersion(draft: PlanDraft, versions: PlanVersion[], note: string): PlanVersion {
  return {
    id: crypto.randomUUID(),
    date: draft.date,
    versionNo: nextVersionNo(versions),
    items: normalizeSeq(draft.items).map((item) => ({ ...item })),
    note: note.trim(),
    status: "current",
    createdAt: new Date().toISOString()
  };
}

export function currentVersionOf(versions: PlanVersion[]): PlanVersion | null {
  return versions.find((v) => v.status === "current") ?? null;
}

export function signsOfVersion(signs: SignRecord[], versionId: string): SignRecord[] {
  return signs
    .filter((sign) => sign.versionId === versionId)
    .sort((a, b) => a.signedAt.localeCompare(b.signedAt));
}

/** 判版：当前版是否已被签收 */
export function isSigned(current: PlanVersion | null, signs: SignRecord[]): boolean {
  if (!current) return false;
  return signs.some((sign) => sign.versionId === current.id);
}

/** 判版：能否发车——必须存在当前版且当前版已签收 */
export function canDepart(current: PlanVersion | null, signs: SignRecord[]): boolean {
  return isSigned(current, signs);
}

/** 生成签收记录：已签收过的版本重复签收只补记录 */
export function makeSignRecord(
  current: PlanVersion,
  signs: SignRecord[],
  driver: string
): SignRecord {
  const already = isSigned(current, signs);
  return {
    id: crypto.randomUUID(),
    versionId: current.id,
    versionNo: current.versionNo,
    driver: driver.trim(),
    kind: already ? "补记" : "签收",
    signedAt: new Date().toISOString()
  };
}
