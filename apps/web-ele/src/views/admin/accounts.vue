<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';
import type { Account, AccountInput, GroupChoice } from '#/api/admin';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';

import { ElAlert, ElButton, ElTag } from 'element-plus';

import { accountsApi } from '#/api/admin';
import { useAuthStore } from '#/store';

import { useAdminList } from './list';
import RecordEditor from './record-editor.vue';
const groups = ref<GroupChoice[]>([]);
const users = useUserStore();
const auth = useAuthStore();
const editor = ref<{ id?: number; values: Partial<AccountInput> }>();
const { Grid, grid, failed } = useAdminList<Account>(
  [
    { field: 'username', title: '账号' },
    { field: 'displayName', title: '名称' },
    {
      field: 'groupIds',
      title: '所属角色组',
      minWidth: 180,
      slots: { default: 'roles' },
    },
    {
      field: 'enabled',
      title: '状态',
      formatter: ({ cellValue }) => (cellValue ? '启用' : '停用'),
    },
    { title: '操作', slots: { default: 'actions' } },
  ],
  [{ component: 'Input', fieldName: 'username', label: '账号' }],
  async (params) => {
    const result = await accountsApi.list(params);
    groups.value = result.groups;
    return result;
  },
);
const schema = computed((): VbenFormSchema[] => [
  {
    component: 'Input',
    fieldName: 'username',
    label: '账号',
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'displayName',
    label: '名称',
    rules: 'required',
  },
  {
    component: 'Input',
    fieldName: 'password',
    label: editor.value?.id ? '新密码（留空保留原密码）' : '密码',
    rules: editor.value?.id ? undefined : 'required',
    componentProps: {
      autocomplete: 'new-password',
      showPassword: true,
      type: 'password',
    },
  },
  {
    component: 'Select',
    fieldName: 'groupIds',
    label: '所属角色组',
    componentProps: () => ({
      multiple: true,
      filterable: true,
      options: groups.value.map((g) => ({ label: g.name, value: g.id })),
    }),
  },
  { component: 'Switch', fieldName: 'enabled', label: '启用账号' },
  ...(users.userInfo?.isSuper
    ? [
        {
          component: 'Switch' as const,
          fieldName: 'isSuper',
          label: '超级管理员',
        },
      ]
    : []),
]);
function edit(row?: Account) {
  editor.value = row
    ? { id: row.id, values: { ...row, groupIds: [...row.groupIds] } }
    : { values: { enabled: true, groupIds: [], isSuper: false } };
}
async function save(values: AccountInput) {
  const old = editor.value;
  const selected = values.groupIds ?? [];
  const original = old?.values.groupIds ?? [];
  if (
    old?.id &&
    selected.length === original.length &&
    selected.every((id) => original.includes(id))
  )
    delete values.groupIds;
  else values.groupIds = selected;
  await accountsApi.save(old?.id, values);
}
async function saved() {
  editor.value = undefined;
  await auth.refreshAccess();
  if (useAccessStore().accessCodes.includes('system:account:view'))
    await grid.query();
}
</script>

<template>
  <Page auto-content-height>
    <ElAlert
      v-if="failed"
      type="error"
      title="管理员加载失败，请刷新表格重试。"
      :closable="false"
    />
    <Grid table-title="管理员">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'system:account:create'"
          type="primary"
          @click="edit()"
        >
          新增管理员
        </ElButton>
      </template>
      <template #roles="{ row }">
        <div class="flex flex-wrap items-center gap-2">
          <ElTag v-if="row.isSuper" type="primary">超级管理员</ElTag>
          <span>{{
            groups
              .filter((group) => row.groupIds.includes(group.id))
              .map((group) => group.name)
              .join('、') || '无组'
          }}</span>
        </div>
      </template>
      <template #actions="{ row }">
        <ElButton
          v-access:code="'system:account:update'"
          link
          type="primary"
          @click="edit(row)"
        >
          编辑
        </ElButton>
      </template>
    </Grid>
    <RecordEditor
      v-if="editor"
      :title="editor.id ? '编辑管理员' : '新增管理员'"
      :schema="schema"
      :values="editor.values"
      :save="save"
      @close="editor = undefined"
      @saved="saved"
    />
  </Page>
</template>
