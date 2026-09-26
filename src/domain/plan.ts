/**
 * 当天发车计划：领域模型与判版逻辑。
 * 本文件只有类型和纯函数，不碰存储、不碰页面。
 */

/** 编版时需要的配送单快照 */
export interface OrderSnapshot {
  id: string;
  status: string;
  station: string;
  fuel: string;
  tons: number;
}

/** 计划条目：版本确认后冻结车牌、油品、吨数、站点顺序 */
export interface PlanItem {
  orderId: string;
  plate: string;
  station: string;
  fuel: string;
  tons: number;
  seq: number;
}

/** 已确认的版本：生成后不再改动，旧版只供查阅 */
export interface PlanVersion {
  id: string;
  date: string;
  versionNo: number;
  items: PlanItem[];
  createdAt: string;
}

/** 草稿：调度员的改动先落在这里，确认后才生成新版本 */
export interface PlanDraft {
  date: string;
  baseVersionNo: number | null;
  items: PlanItem[];
  updatedAt: string;
}

/** 签收记录：重复签收只补记录，不去重 */
export interface SignOff {
  id: string;
  versionId: string;
  driver: string;
  signedAt: string;
}

export type DepartCheck = { ok: true } | { ok: false; reason: string };

/** 当天日期键，计划按天隔离 */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 把待发单编成一版草稿：按顺序排站点序，车牌按车队轮排作为默认 */
export function compileDraft(
  orders: OrderSnapshot[],
  fleet: readonly string[],
  date: string,
  baseVersionNo: number | null,
  now: Date = new Date()
): PlanDraft {
  const items = orders.map((order, index) => ({
    orderId: order.id,
    plate: fleet[index % fleet.length] ?? "",
    station: order.station,
    fuel: order.fuel,
    tons: order.tons,
    seq: index + 1
  }));
  return { date, baseVersionNo, items, updatedAt: now.toISOString() };
}

/** 在生效版本基础上起草稿（临时换车、换站），确认后成为下一版 */
export function draftFromVersion(version: PlanVersion, now: Date = new Date()): PlanDraft {
  return {
    date: version.date,
    baseVersionNo: version.versionNo,
    items: version.items.map((item) => ({ ...item })),
    updatedAt: now.toISOString()
  };
}

export function nextVersionNo(versions: PlanVersion[], date: string): number {
  return versions
    .filter((version) => version.date === date)
    .reduce((max, version) => Math.max(max, version.versionNo), 0) + 1;
}

/** 确认草稿：冻结条目，生成当天的新版本 */
export function confirmDraft(
  draft: PlanDraft,
  versions: PlanVersion[],
  now: Date = new Date()
): PlanVersion {
  return {
    id: crypto.randomUUID(),
    date: draft.date,
    versionNo: nextVersionNo(versions, draft.date),
    items: normalizeSeq(draft.items).map((item) => ({ ...item })),
    createdAt: now.toISOString()
  };
}

/** 判版：当天版本号最大的一版生效，其余只供查阅 */
export function effectiveVersion(versions: PlanVersion[], date: string): PlanVersion | undefined {
  return versions
    .filter((version) => version.date === date)
    .sort((a, b) => b.versionNo - a.versionNo)[0];
}

export function isEffective(version: PlanVersion, versions: PlanVersion[]): boolean {
  return effectiveVersion(versions, version.date)?.id === version.id;
}

export function signoffsOf(signoffs: SignOff[], versionId: string): SignOff[] {
  return signoffs
    .filter((signoff) => signoff.versionId === versionId)
    .sort((a, b) => b.signedAt.localeCompare(a.signedAt));
}

export function makeSignoff(version: PlanVersion, driver: string, now: Date = new Date()): SignOff {
  return {
    id: crypto.randomUUID(),
    versionId: version.id,
    driver,
    signedAt: now.toISOString()
  };
}

/** 出车判定：必须是当天生效版，且该版已有签收；旧版或未签收都不能发车 */
export function checkDepart(
  version: PlanVersion | undefined,
  versions: PlanVersion[],
  signoffs: SignOff[]
): DepartCheck {
  if (!version) return { ok: false, reason: "当天还没有生效计划" };
  if (!isEffective(version, versions)) return { ok: false, reason: "该版本已作废，只供查阅" };
  if (signoffsOf(signoffs, version.id).length === 0) {
    return { ok: false, reason: "新版本未签收，不能发车" };
  }
  return { ok: true };
}

/** 发布前校验：至少一条计划，且每条都指派了车牌 */
export function validateDraft(draft: PlanDraft): string | null {
  if (draft.items.length === 0) return "计划至少包含一条配送单";
  if (draft.items.some((item) => !item.plate)) return "每条计划都要指派车牌";
  return null;
}

/** 调整顺序或删减后，站点顺序重新从 1 编号 */
export function normalizeSeq(items: PlanItem[]): PlanItem[] {
  return items.map((item, index) => ({ ...item, seq: index + 1 }));
}

export function moveItem(items: PlanItem[], orderId: string, offset: number): PlanItem[] {
  const index = items.findIndex((item) => item.orderId === orderId);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return normalizeSeq(next);
}
