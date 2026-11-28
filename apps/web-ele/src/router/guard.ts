import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { useAccessStore, useUserStore } from '@vben/stores';

import { useAuthStore } from '#/store';

export function createRouterGuard(router: Router) {
  router.beforeEach(async (to) => {
    const access = useAccessStore();
    if (!access.accessToken)
      return to.path === LOGIN_PATH || { path: LOGIN_PATH, replace: true };
    const auth = useAuthStore();
    try {
      await auth.loadAccess();
    } catch (error) {
      if (!access.accessToken) return LOGIN_PATH;
      throw error;
    }
    if (!access.accessToken) return LOGIN_PATH;
    const user = useUserStore().userInfo;
    const home = user?.homePath || '/no-access';
    if (
      to.path === LOGIN_PATH ||
      (to.path === '/no-access' && home !== to.path) ||
      (to.path === '/access-recovery' && !user?.isSuper)
    )
      return home;
    const resolved = router.resolve(to.fullPath);
    if (
      resolved.name === 'FallbackNotFound' &&
      (home === '/no-access' || to.path.startsWith('/manage/'))
    )
      return home;
    if (resolved.name !== to.name) return { path: to.fullPath, replace: true };
    return true;
  });
}
