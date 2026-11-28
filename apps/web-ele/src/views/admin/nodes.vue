<script setup lang="ts">
import type { Definition, PermissionNode } from '#/api/admin';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElSelectV2,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { nodesApi } from '#/api/admin';
import { useAuthStore } from '#/store';

import { kindNames } from './list';
import { below, parentIds, toTree, useTreeLoad } from './tree';

const registry = ref<Definition[]>([]);
const rows = ref<PermissionNode[]>([]);
const { busy, failed, reload } = useTreeLoad(async () => {
  const data = await nodesApi.list();
  rows.value = data.items;
  registry.value = data.registry;
});
const tree = computed(() => toTree(rows.value));
const editId = ref<number>();
const editor = ref<Omit<PermissionNode, 'id'>>();
const saving = ref(false);
const impact = ref<Awaited<ReturnType<typeof nodesApi.impact>>>();
const auth = useAuthStore();
const kindOptions = Object.entries(kindNames).map(([value, label]) => ({
  label,
  value,
}));
const definitions = computed(() =>
  registry.value.filter(
    (d) =>
      d.kind === editor.value?.kind &&
      (!rows.value.some((n) => n.code === d.key) ||
        d.key === editor.value?.code),
  ),
);
const nodeParents = computed(() => parentIds(rows.value));
const parents = computed(() =>
  rows.value
    .filter(
      (n) =>
        !below(nodeParents.value, n.id, editId.value) &&
        (editor.value?.kind === 'action'
          ? n.code ===
            registry.value.find((d) => d.key === editor.value?.code)?.parent
          : n.kind === 'directory'),
    )
    .map((n) => ({ value: n.id, label: n.title })),
);
function edit(row?: PermissionNode) {
  editId.value = row?.id;
  const { id: _id, ...data } = row ?? {
    id: 0,
    parentId: null,
    kind: 'directory' as const,
    code: '',
    title: '',
    routeName: '',
    routePath: '',
    componentKey: '',
    icon: '',
    sortOrder: 0,
    enabled: true,
  };
  editor.value = { ...data };
}
function selectCode(code: string) {
  const d = registry.value.find((d) => d.key === code);
  if (d && editor.value)
    Object.assign(editor.value, {
      code: d.key,
      title: d.title,
      componentKey: d.componentKey,
      routeName: d.routeName,
      routePath: d.routePath,
      parentId:
        rows.value.find((n) => n.code === d.parent)?.id ??
        editor.value.parentId,
    });
}
function changeKind() {
  if (editor.value)
    Object.assign(editor.value, {
      code: '',
      routeName: '',
      routePath: '',
      componentKey: '',
      parentId: null,
    });
}
async function persist() {
  if (!editor.value || saving.value) return;
  saving.value = true;
  try {
    await nodesApi.save(editId.value, {
      ...editor.value,
      code: editor.value.code ?? '',
      parentId: editor.value.parentId ?? null,
      routeName: editor.value.routeName ?? '',
      routePath: editor.value.routePath ?? '',
    });
    editor.value = undefined;
    impact.value = undefined;
    ElMessage.success('节点已保存');
    await auth.refreshAccess();
    await reloadIfVisible();
  } finally {
    saving.value = false;
  }
}
async function reloadIfVisible() {
  if (useAccessStore().accessCodes.includes('system:node:view')) await reload();
}
async function save() {
  if (
    editId.value &&
    !editor.value?.enabled &&
    rows.value.find((n) => n.id === editId.value)?.enabled
  ) {
    impact.value = await nodesApi.impact(editId.value);
  } else await persist();
}
</script>

<template>
  <Page title="菜单与权限">
    <div class="flex flex-col gap-4">
      <ElAlert
        v-if="failed"
        type="error"
        title="节点加载失败"
        :closable="false"
      >
        <ElButton size="small" @click="reload">重试</ElButton>
      </ElAlert>
      <ElCard v-loading="busy">
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <span>权限节点</span>
            <ElButton
              v-access:code="'system:node:manage'"
              type="primary"
              @click="edit()"
            >
              新增节点
            </ElButton>
          </div>
        </template>
        <ElTable
          row-key="id"
          :data="tree"
          default-expand-all
          empty-text="暂无权限节点"
        >
          <ElTableColumn prop="title" label="节点" min-width="180" />
          <ElTableColumn label="类型" width="90">
            <template #default="{ row }">
              <ElTag type="info">
                {{ kindNames[row.kind as PermissionNode['kind']] }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="权限码 / 路径" min-width="200">
            <template #default="{ row }">
              <div class="flex flex-col">
                <span v-if="row.code">{{ row.code }}</span>
                <span v-if="row.routePath">{{ row.routePath }}</span>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="90">
            <template #default="{ row }">
              <ElTag :type="row.enabled ? 'success' : 'info'">
                {{ row.enabled ? '启用' : '停用' }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="90">
            <template #default="{ row }">
              <ElButton
                v-access:code="'system:node:manage'"
                link
                type="primary"
                @click="edit(rows.find((node) => node.id === row.id))"
              >
                编辑
              </ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>
    <ElDialog
      :model-value="!!editor"
      :title="editId ? '编辑节点' : '新增节点'"
      width="min(560px, 95vw)"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
      @close="editor = undefined"
    >
      <ElForm v-if="editor" label-position="top">
        <ElFormItem label="类型">
          <ElSelectV2
            v-model="editor.kind"
            :disabled="!!editId"
            :options="kindOptions"
            @change="changeKind"
          />
        </ElFormItem>
        <ElFormItem v-if="editor.kind !== 'directory'" label="登记权限码">
          <ElSelectV2
            :model-value="editor.code ?? undefined"
            :disabled="!!editId"
            :options="definitions.map((d) => ({ label: d.key, value: d.key }))"
            @change="(value) => selectCode(String(value))"
          />
        </ElFormItem>
        <ElFormItem label="标题" required>
          <ElInput v-model="editor.title" />
        </ElFormItem>
        <ElFormItem label="父节点">
          <ElSelectV2
            :model-value="editor.parentId ?? undefined"
            :clearable="editor.kind !== 'action'"
            :options="parents"
            placeholder="顶级"
            @change="
              (value) =>
                editor &&
                (editor.parentId = typeof value === 'number' ? value : null)
            "
          />
        </ElFormItem>
        <template v-if="editor.kind !== 'action'">
          <ElFormItem label="路由名">
            <ElInput
              :model-value="editor.routeName ?? ''"
              placeholder="ContentArticles"
              @update:model-value="
                (value) => editor && (editor.routeName = value)
              "
            />
          </ElFormItem>
          <ElFormItem label="路径">
            <ElInput
              :model-value="editor.routePath ?? ''"
              placeholder="/content/articles"
              @update:model-value="
                (value) => editor && (editor.routePath = value)
              "
            />
          </ElFormItem>
          <ElFormItem v-if="editor.kind === 'page'" label="登记组件">
            <ElInput :model-value="editor.componentKey" readonly />
          </ElFormItem>
          <ElFormItem label="图标">
            <ElInput v-model="editor.icon" />
          </ElFormItem>
        </template>
        <ElFormItem label="排序">
          <ElInputNumber
            :model-value="editor.sortOrder"
            :precision="0"
            @update:model-value="
              (value) => editor && (editor.sortOrder = value ?? 0)
            "
          />
        </ElFormItem>
        <ElFormItem label="启用节点">
          <ElSwitch v-model="editor.enabled" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton :disabled="saving" @click="editor = undefined">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">保存</ElButton>
      </template>
    </ElDialog>
    <ElDialog
      :model-value="!!impact"
      title="确认停用节点"
      width="min(560px, 95vw)"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
      @close="impact = undefined"
    >
      <div v-if="impact" class="flex flex-col gap-3">
        <span>受影响节点（{{ impact.nodes.length }}）</span>
        <span>{{ impact.nodes.map((n) => n.title).join('、') }}</span>
        <span>持有相关授权的角色组（{{ impact.groups.length }}）</span>
        <span>{{ impact.groups.map((g) => g.name).join('、') || '无' }}</span>
      </div>
      <template #footer>
        <ElButton :disabled="saving" @click="impact = undefined">
          返回编辑
        </ElButton>
        <ElButton type="danger" :loading="saving" @click="persist">
          确认停用
        </ElButton>
      </template>
    </ElDialog>
  </Page>
</template>
