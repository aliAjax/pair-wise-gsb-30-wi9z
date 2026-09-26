/** 项目资料：表单字段、状态、油站油品选项、车队车牌 */

export const project = {
  number: 19,
  folder: "hxwl/frontend/hxwlfront-19",
  framework: "vue",
  title: "油品配送计划",
  subtitle: "创建配送单，把当天待发单编成发车计划版本，司机签收后按版发车。",
  industry: "石油",
  stack: ["Vue3", "Vite", "TypeScript", "Pinia", "Element Plus"],
  storageKey: "hxwlfront-19-oil-delivery",
  formTitle: "创建配送单",
  primaryAction: "保存配送单",
  entityLabel: "配送单",
  statuses: ["待发车", "运输中", "已到站"],
  filters: ["全部油站", "城东站", "机场站", "新区站"],
  fields: [
    {
      key: "station",
      label: "目标油站",
      type: "select",
      options: ["城东站", "机场站", "新区站"]
    },
    {
      key: "fuel",
      label: "油品",
      type: "select",
      options: ["92号汽油", "95号汽油", "柴油"]
    },
    {
      key: "tons",
      label: "配送吨数",
      type: "number"
    },
    {
      key: "arriveAt",
      label: "计划到达",
      type: "date"
    }
  ],
  records: [
    {
      station: "城东站",
      fuel: "92号汽油",
      tons: 18,
      arriveAt: "2026-07-01",
      status: "运输中",
      notes: "车辆已出库"
    },
    {
      station: "机场站",
      fuel: "柴油",
      tons: 12,
      arriveAt: "2026-07-01",
      status: "待发车",
      notes: "等待装车"
    },
    {
      station: "新区站",
      fuel: "95号汽油",
      tons: 20,
      arriveAt: "2026-07-01",
      status: "待发车",
      notes: "待编入发车计划"
    }
  ],
  metricLabels: ["配送单", "运输中", "总吨数"]
} as const;

/** 车队车牌，编版时轮排作为默认，调度员可在草稿里换车 */
export const fleet = ["沪A10293", "沪B77521", "沪C33018", "沪D55607"] as const;

export interface Field {
  key: string;
  label: string;
  type?: "number" | "date" | "select";
  options?: readonly string[];
}
