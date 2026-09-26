// 资料层：当天发车计划涉及的全部数据结构与常量

export type OrderStatus = "待发车" | "运输中" | "已到站";

export const ORDER_STATUSES: OrderStatus[] = ["待发车", "运输中", "已到站"];

export const STATIONS = ["城东站", "机场站", "新区站"] as const;

export const FUELS = ["92号汽油", "95号汽油", "柴油"] as const;

/** 配送单：按单张保存，是发车计划的来源 */
export interface DeliveryOrder {
  id: string;
  station: string;
  fuel: string;
  tons: number;
  arriveAt: string;
  status: OrderStatus;
  notes: string;
  createdAt: string;
}

/** 计划条目：确认后冻结车牌、油品、吨数和站点顺序 */
export interface PlanItem {
  orderId: string;
  plate: string;
  fuel: string;
  tons: number;
  station: string;
  seq: number;
}

/** 草稿：调度员改动先落在这里，不影响已生效版本 */
export interface PlanDraft {
  date: string;
  items: PlanItem[];
  baseVersion: number | null;
  updatedAt: string;
}

/** 计划版本：确认后生成，旧版只供查阅 */
export interface PlanVersion {
  id: string;
  date: string;
  versionNo: number;
  items: PlanItem[];
  note: string;
  status: "current" | "archived";
  createdAt: string;
}

/** 签收记录：首次为“签收”，重复签收只补“补记” */
export interface SignRecord {
  id: string;
  versionId: string;
  versionNo: number;
  driver: string;
  kind: "签收" | "补记";
  signedAt: string;
}
