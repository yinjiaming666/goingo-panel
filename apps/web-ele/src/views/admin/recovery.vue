<script setup lang="ts">
import type { PermissionNode } from '#/api/admin';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElAlert, ElButton, ElCard, ElEmpty, ElMessage } from 'element-plus';

import { nodesApi } from '#/api/admin';
import { useAuthStore } from '#/store';

import { kindNames } from './list';
import { useTreeLoad } from './tree';
const rows = ref<PermissionNode[]>([]);
const { busy, failed, reload } = useTreeLoad(async () => {
  rows.value = await nodesApi.disabled();
});
const auth = useAuthStore();
async function enable(id: number) {
  await nodesApi.enable(id);
  ElMessage.success('节点已启用');
  await auth.refreshAccess();
  await reload();
}
</script>

<template>
  <Page title="恢复权限节点">
    <ElCard v-loading="busy">
      <ElAlert
        v-if="failed"
        type="error"
        title="恢复列表加载失败"
        :closable="false"
      >
        <ElButton size="small" @click="reload">重试</ElButton>
      </ElAlert>
      <div v-else-if="rows.length > 0" class="flex flex-col gap-3">
        <div
          v-for="row in rows"
          :key="row.id"
          class="flex items-center justify-between gap-4"
        >
          <span>{{ row.title }} · {{ kindNames[row.kind] }}</span>
          <ElButton @click="enable(row.id)">重新启用</ElButton>
        </div>
      </div>
      <ElEmpty v-else-if="!busy" description="没有停用的节点" />
    </ElCard>
  </Page>
</template>
