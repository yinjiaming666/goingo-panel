import type { RouteRecordRaw } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';

import { AuthPageLayout, BasicLayout } from '#/layouts';

export function rootRoute(): RouteRecordRaw {
  return {
    name: 'Root',
    path: '/',
    component: BasicLayout,
    redirect: '/home',
    meta: { title: 'Goingo', hideInBreadcrumb: true },
    children: [
      {
        name: 'AdminHome',
        path: '/home',
        redirect: '/no-access',
        meta: { title: '首页', hideInTab: true },
      },
      {
        name: 'EmptyAccess',
        path: '/no-access',
        component: () => import('#/views/admin/empty.vue'),
        meta: { title: '暂无可访问页面', hideInTab: true },
      },
      {
        name: 'Recovery',
        path: '/access-recovery',
        component: () => import('#/views/admin/recovery.vue'),
        meta: { title: '恢复权限节点' },
      },
    ],
  };
}
export const routes: RouteRecordRaw[] = [
  rootRoute(),
  {
    name: 'Authentication',
    path: '/auth',
    component: AuthPageLayout,
    redirect: LOGIN_PATH,
    meta: { title: '管理后台', hideInTab: true },
    children: [
      {
        name: 'Login',
        path: 'login',
        component: () => import('#/views/_core/authentication/login.vue'),
        meta: { title: '管理员登录' },
      },
    ],
  },
  {
    name: 'FallbackNotFound',
    path: '/:path(.*)*',
    component: () => import('#/views/_core/fallback/not-found.vue'),
    meta: { title: '404', hideInTab: true },
  },
];
