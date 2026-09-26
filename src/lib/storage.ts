// 保存层：localStorage 读写与旧数据迁移，重开页面可恢复当天草稿、当前版和签收情况
import type { DeliveryOrder, PlanDraft, PlanVersion, SignRecord } from "../types";

const STORAGE_KEY = "hxwlfront-19-departure-plan-v1";
const LEGACY_ORDERS_KEY = "hxwlfront-19-oil-delivery";

export interface PersistedState {
  orders: DeliveryOrder[];
  draft: PlanDraft | null;
  versions: PlanVersion[];
  signs: SignRecord[];
}

const SEED_ORDERS: DeliveryOrder[] = [
  {
    id: "seed-1",
    station: "城东站",
    fuel: "92号汽油",
    tons: 18,
    arriveAt: "2026-09-26",
    status: "待发车",
    notes: "等待装车",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "seed-2",
    station: "机场站",
    fuel: "柴油",
    tons: 12,
    arriveAt: "2026-09-26",
    status: "待发车",
    notes: "客户要求上午送达",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: "seed-3",
    station: "新区站",
    fuel: "95号汽油",
    tons: 20,
    arriveAt: "2026-09-27",
    status: "待发车",
    notes: "暂无备注",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

function loadLegacyOrders(): DeliveryOrder[] | null {
  const raw = localStorage.getItem(LEGACY_ORDERS_KEY);
  if (!raw) return null;
  try {
    const list = JSON.parse(raw) as Array<Partial<DeliveryOrder>>;
    if (!Array.isArray(list) || list.length === 0) return null;
    return list.map((item, index) => ({
      id: item.id ?? `legacy-${index + 1}`,
      station: String(item.station ?? ""),
      fuel: String(item.fuel ?? ""),
      tons: Number(item.tons ?? 0),
      arriveAt: String(item.arriveAt ?? ""),
      status: (item.status as DeliveryOrder["status"]) ?? "待发车",
      notes: String(item.notes ?? ""),
      createdAt: String(item.createdAt ?? new Date().toISOString())
    }));
  } catch {
    return null;
  }
}

export function loadState(): PersistedState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        orders: parsed.orders ?? [],
        draft: parsed.draft ?? null,
        versions: parsed.versions ?? [],
        signs: parsed.signs ?? []
      };
    } catch {
      // 数据损坏时回落到种子数据
    }
  }
  return {
    orders: loadLegacyOrders() ?? SEED_ORDERS,
    draft: null,
    versions: [],
    signs: []
  };
}

export function saveState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
