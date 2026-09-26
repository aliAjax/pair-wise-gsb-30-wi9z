<script setup lang="ts">
import { computed, ref } from "vue";
import { fleet } from "../config/project";
import type { OrderSnapshot } from "../domain/plan";
import { useOrdersStore } from "../stores/orders";
import { usePlanStore } from "../stores/plan";

const ordersStore = useOrdersStore();
const planStore = usePlanStore();

const driver = ref("");
const error = ref("");
const notice = ref("");

/** 待发单快照，编版、补单都用它 */
const pendingOrders = computed<OrderSnapshot[]>(() =>
  ordersStore.pending.map((order) => ({
    id: order.id,
    status: order.status,
    station: String(order.station ?? ""),
    fuel: String(order.fuel ?? ""),
    tons: Number(order.tons ?? 0)
  }))
);

const draftOrderIds = computed(
  () => new Set((planStore.draft?.items ?? []).map((item) => item.orderId))
);

/** 还没排进草稿的待发单 */
const unplanned = computed(() =>
  pendingOrders.value.filter((order) => !draftOrderIds.value.has(order.id))
);

function fmt(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

function compile() {
  planStore.compile(pendingOrders.value);
  error.value = "";
  notice.value = "已把待发单编成草稿，确认后才会生效";
}

function revise() {
  planStore.revise();
  error.value = "";
  notice.value = "已基于当前版起草稿，改动确认后生成新版本";
}

function confirm() {
  const message = planStore.confirm();
  error.value = message ?? "";
  notice.value = message ? "" : `已发布第 ${planStore.current?.versionNo} 版，旧版转入历史只供查阅，司机签收后方可发车`;
}

function discard() {
  planStore.discard();
  error.value = "";
  notice.value = "草稿已放弃，当前版不变";
}

function sign() {
  const message = planStore.sign(driver.value);
  error.value = message ?? "";
  if (!message) {
    notice.value = `${driver.value.trim()} 已签收第 ${planStore.current?.versionNo} 版（重复签收只补记录）`;
    driver.value = "";
  } else {
    notice.value = "";
  }
}

function depart() {
  if (!planStore.depart.ok || !planStore.current) return;
  ordersStore.markDeparted(planStore.current.items.map((item) => item.orderId));
  notice.value = `第 ${planStore.current.versionNo} 版已发车，计划内配送单转入运输中`;
  error.value = "";
}
</script>

<template>
  <section class="plan-head panel">
    <div>
      <h2>当天发车计划 · {{ planStore.date }}</h2>
      <p class="hint">
        当前生效：
        <template v-if="planStore.current">第 {{ planStore.current.versionNo }} 版（{{ fmt(planStore.current.createdAt) }} 发布）</template>
        <template v-else>暂无版本</template>
        ，司机出车前请核对版本号
      </p>
    </div>
    <div class="depart-state">
      <span v-if="planStore.depart.ok" class="badge ok">已签收 · 可发车</span>
      <span v-else class="badge warn">{{ planStore.depart.reason }}</span>
    </div>
  </section>

  <p v-if="notice" class="flash ok-bg">{{ notice }}</p>
  <p v-if="error" class="flash warn-bg">{{ error }}</p>

  <section class="plan-grid">
    <div class="panel">
      <h2>草稿（未发布）</h2>

      <template v-if="planStore.draft">
        <p class="hint">
          {{ planStore.draft.baseVersionNo ? `基于第 ${planStore.draft.baseVersionNo} 版修改` : "首次编版" }}
          · 更新于 {{ fmt(planStore.draft.updatedAt) }}，改动只存在草稿里，确认后才生效
        </p>
        <table class="plan-table">
          <thead>
            <tr>
              <th>顺序</th><th>站点</th><th>油品</th><th>吨数</th><th>车牌</th><th>调整</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in planStore.draft.items" :key="item.orderId">
              <td>{{ item.seq }}</td>
              <td>{{ item.station }}</td>
              <td>{{ item.fuel }}</td>
              <td>{{ item.tons }}</td>
              <td>
                <select :value="item.plate" @change="planStore.setPlate(item.orderId, ($event.target as HTMLSelectElement).value)">
                  <option value="">未派车</option>
                  <option v-for="plate in fleet" :key="plate" :value="plate">{{ plate }}</option>
                </select>
              </td>
              <td class="row-actions">
                <button class="mini secondary" type="button" @click="planStore.move(item.orderId, -1)">上移</button>
                <button class="mini secondary" type="button" @click="planStore.move(item.orderId, 1)">下移</button>
                <button class="mini danger" type="button" @click="planStore.drop(item.orderId)">移除</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="unplanned.length" class="chips">
          <span class="hint">待发单未排入：</span>
          <span v-for="order in unplanned" :key="order.id" class="chip">
            {{ order.station }} / {{ order.fuel }} / {{ order.tons }}吨
            <button class="mini" type="button" @click="planStore.addOrder(order)">加入</button>
          </span>
        </div>

        <div class="actions">
          <button type="button" @click="confirm">确认发布为第 {{ planStore.nextNo }} 版</button>
          <button class="secondary" type="button" @click="discard">放弃草稿</button>
        </div>
      </template>

      <template v-else-if="planStore.current">
        <p class="hint">当前没有未发布的改动。临时换车、换站请先起草稿，确认后生成新版本。</p>
        <div class="actions">
          <button type="button" @click="revise">修改当前版（生成草稿）</button>
        </div>
      </template>

      <template v-else>
        <p class="hint">今天还没有发车计划。把待发单编成一版，冻结车牌、油品、吨数和站点顺序。</p>
        <div class="actions">
          <button type="button" :disabled="pendingOrders.length === 0" @click="compile">
            把待发单编成一版（{{ pendingOrders.length }} 单）
          </button>
        </div>
        <p v-if="pendingOrders.length === 0" class="hint">暂无待发车配送单，请先在「配送单」页创建。</p>
      </template>
    </div>

    <div class="panel">
      <h2>当前生效版</h2>

      <template v-if="planStore.current">
        <p class="version-line">
          <span class="badge ok">第 {{ planStore.current.versionNo }} 版 · 生效中</span>
          <span class="hint">已冻结，改动请走草稿</span>
        </p>
        <table class="plan-table">
          <thead>
            <tr>
              <th>顺序</th><th>站点</th><th>油品</th><th>吨数</th><th>车牌</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in planStore.current.items" :key="item.orderId">
              <td>{{ item.seq }}</td>
              <td>{{ item.station }}</td>
              <td>{{ item.fuel }}</td>
              <td>{{ item.tons }}</td>
              <td>{{ item.plate }}</td>
            </tr>
          </tbody>
        </table>

        <div class="sign-box">
          <h3>司机签收</h3>
          <div class="sign-form">
            <input v-model="driver" placeholder="司机姓名" @keyup.enter="sign" />
            <button type="button" @click="sign">签收第 {{ planStore.current.versionNo }} 版</button>
          </div>
          <ul v-if="planStore.currentSignoffs.length" class="sign-list">
            <li v-for="record in planStore.currentSignoffs" :key="record.id">
              {{ record.driver }} · {{ fmt(record.signedAt) }}
            </li>
          </ul>
          <p v-else class="hint">本版还没有签收记录，未签收不能发车。</p>
        </div>

        <div class="actions">
          <button type="button" :disabled="!planStore.depart.ok" @click="depart">确认发车</button>
          <span v-if="!planStore.depart.ok" class="hint">{{ planStore.depart.reason }}</span>
        </div>
      </template>

      <p v-else class="hint">还没有生效版本，请先在左侧编版并确认发布。</p>
    </div>
  </section>

  <section class="panel">
    <h2>历史版本（只供查阅）</h2>
    <div v-if="planStore.history.length === 0" class="empty">暂无历史版本</div>
    <article v-for="version in planStore.history" :key="version.id" class="record">
      <div class="record-head">
        <p class="record-title">第 {{ version.versionNo }} 版</p>
        <span class="badge muted">已作废 · {{ fmt(version.createdAt) }}</span>
      </div>
      <table class="plan-table">
        <thead>
          <tr>
            <th>顺序</th><th>站点</th><th>油品</th><th>吨数</th><th>车牌</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in version.items" :key="item.orderId">
            <td>{{ item.seq }}</td>
            <td>{{ item.station }}</td>
            <td>{{ item.fuel }}</td>
            <td>{{ item.tons }}</td>
            <td>{{ item.plate }}</td>
          </tr>
        </tbody>
      </table>
      <p class="hint">签收 {{ planStore.signoffsFor(version.id).length }} 次；该版已作废，不能签收、不能发车。</p>
    </article>
  </section>
</template>
