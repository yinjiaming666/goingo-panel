<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';
import type { Article, ArticleInput, Category } from '#/api/admin';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElAlert,
  ElButton,
  ElDrawer,
  ElMessage,
  ElPopconfirm,
  ElTag,
} from 'element-plus';

import { articlesApi } from '#/api/admin';

import { dateText, stateOptions, useAdminList } from './list';
import RecordEditor from './record-editor.vue';

const categories = ref<Category[]>([]);
const categoryOptions = computed(() =>
  categories.value.map((c) => ({ label: c.title, value: c.id })),
);
const categoryProps = () => ({
  options: categoryOptions.value,
  clearable: true,
});
const categoryFailed = ref(false);
async function loadCategories() {
  try {
    categories.value = await articlesApi.categories();
    categoryFailed.value = false;
  } catch {
    categoryFailed.value = true;
  }
}
onMounted(loadCategories);
const { Grid, grid, failed } = useAdminList<Omit<Article, 'content'>>(
  [
    { field: 'title', title: '标题', minWidth: 200 },
    {
      field: 'categoryId',
      title: '分类',
      formatter: ({ cellValue }) =>
        categories.value.find((c) => c.id === cellValue)?.title || cellValue,
    },
    { field: 'status', title: '状态', slots: { default: 'status' } },
    {
      field: 'createdAt',
      title: '创建时间',
      minWidth: 160,
      formatter: ({ cellValue }) => dateText(cellValue),
    },
    { title: '操作', width: 200, slots: { default: 'actions' } },
  ],
  [
    { component: 'Input', fieldName: 'title', label: '标题' },
    {
      component: 'Select',
      fieldName: 'categoryId',
      label: '分类',
      componentProps: categoryProps,
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: { options: stateOptions, clearable: true },
    },
  ],
  articlesApi.list,
);
const schema: VbenFormSchema[] = [
  {
    component: 'Input',
    fieldName: 'title',
    label: '标题',
    rules: 'required',
    componentProps: { maxlength: 1200 },
  },
  {
    component: 'Select',
    fieldName: 'categoryId',
    label: '分类',
    rules: 'selectRequired',
    componentProps: categoryProps,
  },
  {
    component: 'Select',
    fieldName: 'status',
    label: '状态',
    rules: 'required',
    componentProps: { options: stateOptions },
  },
  {
    component: 'Input',
    fieldName: 'content',
    label: '正文（Markdown）',
    rules: 'required',
    componentProps: { type: 'textarea', rows: 9 },
  },
];
const editor = ref<{ id?: number; values: Partial<ArticleInput> }>();
const detail = ref<Article>();
function create() {
  editor.value = {
    values: { categoryId: categories.value[0]?.id, status: 'draft' },
  };
}
async function edit(id: number) {
  editor.value = { id, values: await articlesApi.get(id) };
}
async function show(id: number) {
  try {
    detail.value = await articlesApi.get(id);
  } catch {
    detail.value = undefined;
  }
}
function save(input: ArticleInput) {
  return articlesApi.save(editor.value?.id, input);
}
async function remove(id: number) {
  await articlesApi.remove(id);
  ElMessage.success('文章已删除');
  await grid.query();
}
function saved() {
  editor.value = undefined;
  void grid.query();
}
</script>

<template>
  <Page auto-content-height>
    <ElAlert
      v-if="failed"
      type="error"
      title="文章加载失败，请刷新表格重试。"
      :closable="false"
    />
    <ElAlert
      v-if="categoryFailed"
      type="error"
      title="分类加载失败"
      :closable="false"
    >
      <ElButton size="small" @click="loadCategories">重试</ElButton>
    </ElAlert>
    <Grid table-title="文章管理">
      <template #toolbar-tools>
        <ElButton
          v-access:code="'content:article:create'"
          type="primary"
          @click="create"
        >
          新增文章
        </ElButton>
      </template>
      <template #status="{ row }">
        <ElTag :type="row.status === 'published' ? 'success' : 'info'">
          {{ row.status === 'published' ? '已发布' : '草稿' }}
        </ElTag>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center gap-2">
          <ElButton link type="primary" size="small" @click="show(row.id)">
            详情
          </ElButton>
          <ElButton
            v-access:code="'content:article:update'"
            link
            type="primary"
            size="small"
            @click="edit(row.id)"
          >
            编辑
          </ElButton>
          <ElPopconfirm
            title="确认删除这篇文章？"
            confirm-button-text="删除"
            confirm-button-type="danger"
            cancel-button-text="取消"
            @confirm="remove(row.id)"
          >
            <template #reference>
              <ElButton
                v-access:code="'content:article:delete'"
                link
                type="danger"
                size="small"
              >
                删除
              </ElButton>
            </template>
          </ElPopconfirm>
        </div>
      </template>
    </Grid>
    <RecordEditor
      v-if="editor"
      :title="editor.id ? '编辑文章' : '新增文章'"
      :values="editor.values"
      :schema="schema"
      :save="save"
      @close="editor = undefined"
      @saved="saved"
    />
    <ElDrawer
      :model-value="!!detail"
      :title="detail?.title"
      size="min(560px, 95vw)"
      append-to-body
      @close="detail = undefined"
    >
      <div v-if="detail" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <ElTag>{{ detail.status === 'published' ? '已发布' : '草稿' }}</ElTag>
          <span>{{
            categories.find((c) => c.id === detail?.categoryId)?.title
          }}</span>
          <span>{{ dateText(detail.createdAt) }}</span>
        </div>
        <pre class="whitespace-pre-wrap break-words">{{ detail.content }}</pre>
      </div>
    </ElDrawer>
  </Page>
</template>
