<script setup lang="ts" generic="T extends Record<string, any>">
import type { VbenFormSchema } from '#/adapter/form';

import { ref } from 'vue';

import { ElButton, ElDialog, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
const props = defineProps<{
  save: (values: T) => Promise<unknown>;
  schema: VbenFormSchema[];
  title: string;
  values: Partial<T>;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();
const busy = ref(false);
const [Form, form] = useVbenForm({
  schema: props.schema.map((field) => ({
    ...field,
    defaultValue: props.values[field.fieldName] ?? field.defaultValue,
  })),
  layout: 'vertical',
  wrapperClass: 'grid-cols-1',
  showDefaultActions: false,
});
async function submit() {
  if (busy.value) return;
  busy.value = true;
  try {
    const { valid } = await form.validate();
    if (!valid) return;
    await props.save(await form.getValues<T>());
    ElMessage.success('已保存');
    emit('saved');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <ElDialog
    :model-value="true"
    :title="title"
    width="min(560px, 95vw)"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!busy"
    :show-close="!busy"
    @close="emit('close')"
  >
    <Form />
    <template #footer>
      <ElButton :disabled="busy" @click="emit('close')">取消</ElButton>
      <ElButton type="primary" :loading="busy" @click="submit">保存</ElButton>
    </template>
  </ElDialog>
</template>
