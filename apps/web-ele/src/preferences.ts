import { defineOverridesPreferences } from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    defaultHomePath: '/home',
    accessMode: 'backend',
    loginExpiredMode: 'page',
    enablePreferences: false,
    enableCheckUpdates: false,
    authPageLayout: 'panel-center',
  },
  widget: { notification: false, lockScreen: false },
  copyright: { enable: false },
  theme: { mode: 'light' },
});
