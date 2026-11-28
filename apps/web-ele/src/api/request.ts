import { useAppConfig } from '@vben/hooks';
import {
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { useAuthStore } from '#/store';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
export const requestClient = new RequestClient({
  baseURL: apiURL,
  responseReturn: 'data',
});
requestClient.addRequestInterceptor({
  fulfilled(config) {
    const token = useAccessStore().accessToken;
    if (token && config.url !== '/auth/login') config.headers.Token = token;
    return config;
  },
});
requestClient.addResponseInterceptor(
  defaultResponseInterceptor({
    codeField: 'code',
    dataField: 'data',
    successCode: 200,
  }),
);
requestClient.addResponseInterceptor({
  async rejected(error) {
    const token = useAccessStore().accessToken;
    if (token && error.config?.headers?.Token === token) {
      if (error.response?.status === 401) await useAuthStore().expire();
      if (error.response?.status === 403 && error.config.url !== '/auth/access')
        await useAuthStore().refreshAccess();
    }
    throw error;
  },
});
requestClient.addResponseInterceptor(
  errorMessageResponseInterceptor((msg, error) => {
    ElMessage.error(error?.response?.data?.msg || msg);
  }),
);
