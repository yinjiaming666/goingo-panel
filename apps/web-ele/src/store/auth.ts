import { ref } from 'vue';

import { LOGIN_PATH } from '@vben/constants';
import {
  resetAllStores,
  useAccessStore,
  useTabbarStore,
  useUserStore,
} from '@vben/stores';

import { defineStore } from 'pinia';

import { getAccessApi, loginApi, logoutApi } from '#/api';
import { router } from '#/router';
import { installMenus, resetAccessRoutes } from '#/router/access';

export const useAuthStore = defineStore('auth', () => {
  const access = useAccessStore();
  const users = useUserStore();
  const tabs = useTabbarStore();
  const loginLoading = ref(false);
  let signature = '';
  let loading: Promise<void> | undefined;

  async function applyAccess() {
    const token = access.accessToken;
    const state = await getAccessApi();
    if (!token || token !== access.accessToken) return;
    const next = JSON.stringify(state);
    if (access.isAccessChecked && signature === next) return;
    const { accessibleMenus, accessibleRoutes } = await installMenus(
      router,
      state.menus,
    );
    if (token !== access.accessToken) return;
    users.setUserInfo({
      ...state.user,
      userId: String(state.user.userId),
      avatar: '',
    });
    access.setAccessMenus(accessibleMenus);
    access.setAccessRoutes(accessibleRoutes);
    access.setAccessCodes(state.codes);
    access.setIsAccessChecked(true);
    tabs.tabs = tabs.tabs.filter(
      (tab) =>
        router.resolve(tab.path).name === tab.name &&
        (tab.name !== 'Recovery' || state.user.isSuper),
    );
    await tabs.updateCacheTabs();
    signature = next;
  }
  function loadAccess() {
    if (!loading) {
      const pending = applyAccess().finally(() => {
        if (loading === pending) loading = undefined;
      });
      loading = pending;
    }
    return loading;
  }
  async function refreshAccess() {
    if (!access.accessToken) return;
    const previousCodes = access.accessCodes.join('|');
    await loadAccess();
    const current = router.currentRoute.value;
    const resolved = router.resolve(current.fullPath);
    if (
      resolved.name !== current.name ||
      (current.name === 'Recovery' && !users.userInfo?.isSuper) ||
      (current.name === 'EmptyAccess' &&
        users.userInfo?.homePath !== current.path)
    ) {
      await router.replace(users.userInfo?.homePath || '/no-access');
    } else if (previousCodes !== access.accessCodes.join('|')) {
      // Vben checks v-access on mount. Refresh the still-authorized page after a button permission changes.
      await tabs.refresh(router);
    }
  }
  async function expire() {
    resetAllStores();
    resetAccessRoutes(router);
    await router.replace(LOGIN_PATH);
  }
  async function authLogin(params: Record<string, any>) {
    loginLoading.value = true;
    try {
      const { accessToken } = await loginApi({
        username: params.username,
        password: params.password,
      });
      access.setAccessToken(accessToken);
      await loadAccess();
      await router.replace(users.userInfo?.homePath || '/no-access');
    } finally {
      loginLoading.value = false;
    }
  }
  async function logout() {
    if (access.accessToken) await logoutApi();
    await expire();
  }
  function $reset() {
    signature = '';
    loading = undefined;
    loginLoading.value = false;
  }
  return {
    $reset,
    authLogin,
    expire,
    loadAccess,
    loginLoading,
    logout,
    refreshAccess,
  };
});
