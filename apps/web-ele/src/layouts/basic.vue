<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

import { BasicLayout, UserDropdown } from '@vben/layouts';
import { useUserStore } from '@vben/stores';

import { useAuthStore } from '#/store';
const users = useUserStore();
const auth = useAuthStore();
const router = useRouter();
const menus = computed(() =>
  users.userInfo?.isSuper
    ? [
        {
          text: '恢复权限节点',
          icon: 'lucide:rotate-ccw',
          handler: () => router.push('/access-recovery'),
        },
      ]
    : [],
);
function onFocus() {
  void auth.refreshAccess().catch(() => {});
}
onMounted(() => window.addEventListener('focus', onFocus));
onUnmounted(() => window.removeEventListener('focus', onFocus));
</script>
<template>
  <BasicLayout @clear-preferences-and-logout="auth.logout">
    <template #user-dropdown>
      <UserDropdown
        :menus="menus"
        :text="users.userInfo?.realName"
        :description="users.userInfo?.username"
        avatar=""
        @logout="auth.logout"
        @clear-preferences-and-logout="auth.logout"
      />
    </template>
  </BasicLayout>
</template>
