<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { ElButton, ElEmpty } from 'element-plus';

import { useAuthStore } from '#/store';

const auth = useAuthStore();
</script>

<template>
  <Page>
    <div
      class="bg-background flex min-h-80 flex-col items-center justify-center gap-4 rounded-lg"
    >
      <ElEmpty description="暂无可访问页面，请联系管理员分配查看权限。" />
      <ElButton @click="auth.refreshAccess()">重新加载授权</ElButton>
    </div>
  </Page>
</template>
