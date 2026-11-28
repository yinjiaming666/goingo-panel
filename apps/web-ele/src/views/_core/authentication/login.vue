<script setup lang="ts">
import type { FormInstance } from 'element-plus';

import { reactive, ref } from 'vue';

import {
  ElButton,
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElInput,
} from 'element-plus';

import { useAuthStore } from '#/store';

const auth = useAuthStore();
const rememberKey = `REMEMBER_ME_USERNAME_${location.hostname}`;
const savedUsername = localStorage.getItem(rememberKey) ?? '';
const remember = ref(!!savedUsername);
const form = reactive({ username: savedUsername, password: '' });
const formRef = ref<FormInstance>();
const rules = {
  username: [{ required: true, message: '请输入账号' }],
  password: [{ required: true, message: '请输入密码' }],
};

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || auth.loginLoading) return;
  try {
    await auth.authLogin(form);
    if (remember.value) localStorage.setItem(rememberKey, form.username);
    else localStorage.removeItem(rememberKey);
  } catch {
    // The request interceptor displays the login error.
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <span class="text-2xl font-semibold">管理员登录</span>
    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      size="large"
      @submit.prevent="submit"
    >
      <ElFormItem label="账号" prop="username">
        <ElInput v-model="form.username" autocomplete="username" />
      </ElFormItem>
      <ElFormItem label="密码" prop="password">
        <ElInput
          v-model="form.password"
          autocomplete="current-password"
          show-password
          type="password"
        />
      </ElFormItem>
      <div class="flex flex-col gap-4">
        <ElCheckbox v-model="remember">记住账号</ElCheckbox>
        <ElButton
          type="primary"
          native-type="submit"
          :loading="auth.loginLoading"
        >
          登录
        </ElButton>
      </div>
    </ElForm>
  </div>
</template>
