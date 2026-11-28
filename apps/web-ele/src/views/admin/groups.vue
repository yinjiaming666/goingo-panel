<script setup lang="ts">
import type { Group, PermissionNode } from '#/api/admin';

import { computed, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElCheckbox,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElSelectV2,
  ElSwitch,
  ElTag,
  ElTree,
} from 'element-plus';

import { groupsApi } from '#/api/admin';
import { useAuthStore } from '#/store';

import { below, parentIds, toTree, useTreeLoad } from './tree';

const grantable = ref<number[]>([]);
const nodes = ref<PermissionNode[]>([]);
const rows = ref<Group[]>([]);
const mode = ref<'create' | 'edit' | 'read'>('read');
const saving = ref(false);
const selected = ref<number>();
const auth = useAuthStore();
const users = useUserStore();
const form = reactive<Omit<Group, 'id'>>({
  name: '',
  code: '',
  enabled: true,
  parentId: null,
  permissionIds: [],
});
const current = computed(() => rows.value.find((g) => g.id === selected.value));
function choose(row?: Group) {
  selected.value = row?.id;
  mode.value = 'read';
  Object.assign(form, {
    name: row?.name ?? '',
    code: row?.code ?? '',
    parentId: row?.parentId ?? null,
    enabled: row?.enabled ?? true,
    permissionIds: [...(row?.permissionIds ?? [])],
  });
}
const { busy, failed, reload } = useTreeLoad(async () => {
  const data = await groupsApi.list();
  rows.value = data.items;
  nodes.value = data.nodes;
  grantable.value = data.grantableIds;
  choose(current.value ?? rows.value[0]);
});
const groupTree = computed(() =>
  toTree(
    rows.value.map((g) => ({
      ...g,
      title: g.name + (g.enabled ? '' : '（停用）'),
    })),
  ),
);
const groupParents = computed(() => parentIds(rows.value));
const nodeParents = computed(() => parentIds(nodes.value));
const parentOptions = computed(() =>
  rows.value
    .filter(
      (g) =>
        mode.value !== 'edit' ||
        !below(groupParents.value, g.id, selected.value),
    )
    .map((g) => ({ label: g.name, value: g.id })),
);
const parent = computed(() => rows.value.find((g) => g.id === form.parentId));
const parentActive = computed(() => {
  const parentId = form.parentId;
  return (
    parentId === null ||
    !rows.value.some(
      (group) =>
        !group.enabled && below(groupParents.value, parentId, group.id),
    )
  );
});
const parentGrants = computed(() =>
  form.parentId === null ? null : new Set(parent.value?.permissionIds),
);
const allowed = computed(
  () =>
    new Set(
      grantable.value.filter(
        (id) => parentActive.value && (parentGrants.value?.has(id) ?? true),
      ),
    ),
);
const ruleTree = computed(() =>
  toTree(
    nodes.value.map((n) => ({
      ...n,
      checkboxDisabled:
        mode.value === 'read' ||
        n.kind === 'directory' ||
        !allowed.value.has(n.id),
    })),
  ),
);
const savedPermissions = computed(() =>
  mode.value === 'create' ? [] : (current.value?.permissionIds ?? []),
);
const selectedPermissions = computed(() => {
  if (mode.value === 'read') return savedPermissions.value;

  const selected = new Set(
    form.permissionIds.filter((id) => allowed.value.has(id)),
  );
  const disabledNodes = nodes.value.filter((node) => !node.enabled);
  for (const id of savedPermissions.value) {
    if (parentGrants.value && !parentGrants.value.has(id)) continue;
    if (
      !parentActive.value ||
      disabledNodes.some((node) => below(nodeParents.value, id, node.id))
    ) {
      selected.add(id);
    }
  }
  return [...selected];
});
function labels(ids: number[]) {
  return (
    nodes.value
      .filter((n) => ids.includes(n.id))
      .map((n) => n.title)
      .join('、') || '无'
  );
}
const added = computed(() =>
  labels(
    selectedPermissions.value.filter(
      (id) => !savedPermissions.value.includes(id),
    ),
  ),
);
const removed = computed(() =>
  labels(
    savedPermissions.value.filter(
      (id) => !selectedPermissions.value.includes(id),
    ),
  ),
);
const checked = computed(() => {
  const checked = new Set(selectedPermissions.value);
  const halfChecked = new Set<number>();
  for (const n of nodes.value) {
    const descendants = nodes.value.filter(
      (child) =>
        child.id !== n.id &&
        child.kind !== 'directory' &&
        below(nodeParents.value, child.id, n.id),
    );
    const count = descendants.filter((child) =>
      selectedPermissions.value.includes(child.id),
    ).length;
    if (!count || checked.has(n.id)) continue;
    if (n.kind === 'directory' && count === descendants.length)
      checked.add(n.id);
    else halfChecked.add(n.id);
  }
  return { checked, halfChecked };
});
function checkPermission(id: number, enabled: boolean) {
  const permissions = form.permissionIds.filter(
    (permission) => permission !== id,
  );
  if (enabled) permissions.push(id);
  form.permissionIds = permissions;
}
function create() {
  const parentId = current.value?.id ?? null;
  mode.value = 'create';
  Object.assign(form, {
    name: '',
    code: '',
    enabled: true,
    parentId,
    permissionIds: [],
  });
}
async function submit() {
  if (saving.value) return;
  saving.value = true;
  try {
    const result = await groupsApi.save(
      mode.value === 'edit' ? current.value?.id : undefined,
      {
        ...form,
        parentId: form.parentId ?? null,
        permissionIds: selectedPermissions.value,
      },
    );
    selected.value = result.id;
    ElMessage.success('角色组已保存');
    await auth.refreshAccess();
    if (useAccessStore().accessCodes.includes('system:group:view'))
      await reload();
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Page title="角色组">
    <div v-loading="busy" class="flex flex-col gap-4">
      <ElAlert
        v-if="failed"
        title="角色组加载失败"
        type="error"
        :closable="false"
      >
        <ElButton size="small" @click="reload">重试</ElButton>
      </ElAlert>
      <div class="flex flex-col gap-4 lg:flex-row">
        <ElCard class="lg:w-1/3">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <span>角色组树</span>
              <ElButton
                v-access:code="'system:group:create'"
                type="primary"
                @click="create"
              >
                新增角色组
              </ElButton>
            </div>
          </template>
          <ElTree
            v-if="rows.length > 0"
            :data="groupTree"
            :props="{ label: 'title' }"
            node-key="id"
            :current-node-key="selected"
            :expand-on-click-node="false"
            default-expand-all
            highlight-current
            @node-click="
              (row) => choose(rows.find((group) => group.id === row.id))
            "
          />
          <ElEmpty v-else-if="!busy && !failed" description="暂无角色组" />
        </ElCard>
        <ElCard class="min-w-0 flex-1">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <span>角色组授权</span>
              <ElButton
                v-if="current && mode === 'read'"
                v-access:code="'system:group:update'"
                @click="mode = 'edit'"
              >
                编辑授权
              </ElButton>
            </div>
          </template>
          <div v-if="current || mode === 'create'" class="flex flex-col gap-4">
            <ElForm label-position="top" :disabled="mode === 'read'">
              <ElFormItem label="组名称" required>
                <ElInput v-model="form.name" />
              </ElFormItem>
              <ElFormItem label="组编码" required>
                <ElInput v-model="form.code" />
              </ElFormItem>
              <ElFormItem label="父组">
                <ElSelectV2
                  :model-value="form.parentId ?? undefined"
                  :options="parentOptions"
                  :clearable="!!users.userInfo?.isSuper"
                  placeholder="顶级组"
                  @change="
                    (value) =>
                      (form.parentId = typeof value === 'number' ? value : null)
                  "
                />
              </ElFormItem>
              <ElFormItem label="启用角色组">
                <ElSwitch v-model="form.enabled" />
              </ElFormItem>
            </ElForm>
            <span class="font-medium">权限节点</span>
            <ElTree
              v-if="nodes.length > 0"
              :data="ruleTree"
              :props="{ label: 'title' }"
              :expand-on-click-node="false"
              node-key="id"
              default-expand-all
            >
              <template #default="{ data }">
                <ElCheckbox
                  :model-value="checked.checked.has(data.id)"
                  :indeterminate="checked.halfChecked.has(data.id)"
                  :disabled="data.checkboxDisabled"
                  @change="(value) => checkPermission(data.id, value === true)"
                >
                  {{ data.title }}
                </ElCheckbox>
              </template>
            </ElTree>
            <template v-if="mode !== 'read'">
              <div class="flex items-center gap-2">
                <ElTag type="success">将授予</ElTag><span>{{ added }}</span>
              </div>
              <div class="flex items-center gap-2">
                <ElTag type="warning">将收回</ElTag><span>{{ removed }}</span>
              </div>
              <span v-if="removed !== '无'">收回的权限也会从后代组移除。</span>
              <div class="flex items-center gap-2">
                <ElButton
                  v-access:code="
                    mode === 'create'
                      ? 'system:group:create'
                      : 'system:group:update'
                  "
                  type="primary"
                  :loading="saving"
                  @click="submit"
                >
                  保存授权
                </ElButton>
                <ElButton :disabled="saving" @click="choose(current)">
                  取消
                </ElButton>
              </div>
            </template>
          </div>
          <ElEmpty
            v-else-if="!busy && !failed"
            description="请选择或新增角色组"
          />
        </ElCard>
      </div>
    </div>
  </Page>
</template>
