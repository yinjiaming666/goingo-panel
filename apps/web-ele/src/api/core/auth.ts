import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

interface AdminAccessResponse {
  user: {
    homePath: string;
    isSuper: boolean;
    realName: string;
    roles: null | string[];
    userId: number;
    username: string;
  };
  codes: string[];
  menus: null | RouteRecordStringComponent[];
}

export function loginApi(data: { password: string; username: string }) {
  return requestClient.post<{ accessToken: string; expiresAt: string }>(
    '/auth/login',
    data,
  );
}

export function logoutApi() {
  return requestClient.post<null>('/auth/logout');
}

export async function getAccessApi() {
  const data = await requestClient.get<AdminAccessResponse>('/auth/access');
  return {
    ...data,
    menus: data.menus ?? [],
    user: { ...data.user, roles: data.user.roles ?? [] },
  };
}
