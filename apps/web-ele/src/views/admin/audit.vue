<script setup lang="ts">
import type { Audit } from '#/api/admin';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElAlert,
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDrawer,
} from 'element-plus';

import { auditApi } from '#/api/admin';

import { dateText, useAdminList } from './list';
const detail = ref<Audit>();
const { Grid, failed } = useAdminList<Audit>(
  [
    {
      field: 'createdAt',
      title: '时间',
      minWidth: 160,
      formatter: ({ cellValue }) => dateText(cellValue),
    },
    {
      field: 'actorAdminId',
      title: '操作者 ID',
      formatter: ({ cellValue }) => cellValue ?? '未认证',
    },
    { field: 'action', title: '动作', minWidth: 180 },
    {
      field: 'targetType',
      title: '对象',
      formatter: ({ row }) =>
        [row.targetType, row.targetId].filter(Boolean).join(' #'),
    },
    {
      field: 'result',
      title: '结果',
      formatter: ({ cellValue }) => (cellValue === 'success' ? '成功' : '失败'),
    },
    { title: '操作', slots: { default: 'actions' } },
  ],
  [
    {
      component: 'InputNumber',
      fieldName: 'actorId',
      label: '操作者 ID',
      componentProps: { min: 1, precision: 0 },
    },
    {
      component: 'Input',
      fieldName: 'action',
      label: '动作',
      componentProps: { placeholder: '如 system:group:update' },
    },
    {
      component: 'DatePicker',
      fieldName: 'dates',
      label: '时间',
      componentProps: { type: 'datetimerange' },
    },
  ],
  (params) => {
    const { dates, ...query } = params;
    const range = dates as [Date, Date] | undefined;
    return auditApi.list({
      ...query,
      from: range?.[0]?.toISOString(),
      to: range?.[1]?.toISOString(),
    });
  },
);
async function show(id: number) {
  detail.value = await auditApi.get(id);
}
</script>

<template>
  <Page auto-content-height>
    <ElAlert
      v-if="failed"
      type="error"
      title="日志加载失败，请刷新表格重试。"
      :closable="false"
    />
    <Grid table-title="操作日志">
      <template #actions="{ row }">
        <ElButton link type="primary" @click="show(row.id)">详情</ElButton>
      </template>
    </Grid>
    <ElDrawer
      :model-value="!!detail"
      title="操作详情"
      size="min(640px, 95vw)"
      append-to-body
      @close="detail = undefined"
    >
      <ElDescriptions v-if="detail" border :column="1">
        <ElDescriptionsItem label="操作者">
          {{ detail.actorAdminId ?? '未认证' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="动作">
          {{ detail.action }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="对象">
          {{ detail.targetType }} {{ detail.targetId }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="时间">
          {{ dateText(detail.createdAt) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="结果">
          {{ detail.result === 'success' ? '成功' : '失败' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="变更前">
          <pre class="whitespace-pre-wrap">{{
            JSON.stringify(detail.changes?.before, null, 2)
          }}</pre>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="变更后">
          <pre class="whitespace-pre-wrap">{{
            JSON.stringify(detail.changes?.after, null, 2)
          }}</pre>
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElDrawer>
  </Page>
</template>
