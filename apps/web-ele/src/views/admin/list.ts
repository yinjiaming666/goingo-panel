import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { PageResult, Query } from '#/api/admin';

import { ref } from 'vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

export function useAdminList<T extends Record<string, any>>(
  columns: VxeTableGridOptions<T>['columns'],
  schema: VbenFormSchema[],
  fetch: (params: Query) => Promise<PageResult<T>>,
) {
  const failed = ref(false);
  const [Grid, grid] = useVbenVxeGrid<T>({
    formOptions: {
      schema,
      collapsed: false,
      showCollapseButton: false,
      submitOnEnter: true,
    },
    gridOptions: {
      columns,
      height: 'auto',
      align: 'left',
      rowConfig: { keyField: 'id' },
      pagerConfig: { pageSize: 20, pageSizes: [10, 20, 50, 100] },
      toolbarConfig: { refresh: true },
      proxyConfig: {
        ajax: {
          async query(
            { page }: { page: { currentPage: number; pageSize: number } },
            values: Query,
          ) {
            failed.value = false;
            try {
              return await fetch({
                ...values,
                page: page.currentPage,
                pageSize: page.pageSize,
              });
            } catch (error) {
              failed.value = true;
              throw error;
            }
          },
        },
      },
    },
  });
  return { Grid, grid, failed };
}
export function dateText(date: string) {
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
}
export const stateOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
];
export const kindNames = { action: '操作', directory: '目录', page: '页面' };
