import type { Router } from 'vue-router';

import type { RouteRecordStringComponent } from '@vben/types';

import { generateAccessible } from '@vben/access';

import { rootRoute } from './routes';

// Explicit import map shared by all backend-driven routes.
const pageMap = {
  '/admin/articles.vue': () => import('#/views/admin/articles.vue'),
  '/admin/accounts.vue': () => import('#/views/admin/accounts.vue'),
  '/admin/groups.vue': () => import('#/views/admin/groups.vue'),
  '/admin/nodes.vue': () => import('#/views/admin/nodes.vue'),
  '/admin/audit.vue': () => import('#/views/admin/audit.vue'),
};
export function resetAccessRoutes(router: Router) {
  router.removeRoute('Root');
  router.addRoute(rootRoute());
}
export function installMenus(
  router: Router,
  menus: RouteRecordStringComponent[],
) {
  resetAccessRoutes(router);
  return generateAccessible('backend', {
    router,
    routes: [],
    pageMap,
    fetchMenuListAsync: async () => menus,
  });
}
