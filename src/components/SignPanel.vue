<script setup lang="ts">
// 页面：司机签收——新版本未签收不能发车，重复签收只补记录
import { ref } from "vue";
import { usePlanStore } from "../stores/plan";

const store = usePlanStore();
const driver = ref("");
const error = ref("");

function sign() {
  const result = store.signCurrent(driver.value);
  error.value = result ?? "";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <section class="panel">
    <h2>出车签收</h2>

    <div v-if="!store.currentVersion" class="empty">还没有生效的计划版本</div>

    <template v-else>
      <div class="gate" :class="store.departureReady ? 'open' : 'closed'">
        <strong>{{ store.departureReady ? "可以发车" : "禁止发车" }}</strong>
        <span>
          当前版 V{{ store.currentVersion.versionNo }}
          {{ store.departureReady ? "已签收，出车前请核对版本号" : "尚未签收，签收后才能发车" }}
        </span>
      </div>

      <div class="sign-form">
        <input v-model="driver" type="text" placeholder="司机姓名" @keyup.enter="sign" />
        <button type="button" @click="sign">{{ store.signed ? "补记签收" : "签收当前版" }}</button>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>

      <div v-if="store.currentSigns.length > 0" class="sign-list">
        <h3>签收记录</h3>
        <p v-for="record in store.currentSigns" :key="record.id" class="sign-row">
          <span class="badge" :class="record.kind === '签收' ? 'ok' : 'muted'">{{ record.kind }}</span>
          {{ record.driver }} · V{{ record.versionNo }} · {{ fmt(record.signedAt) }}
        </p>
      </div>
    </template>
  </section>
</template>
