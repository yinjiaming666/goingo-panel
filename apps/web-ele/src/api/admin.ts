import { requestClient } from './request';

export interface PageResult<T> {
  items: T[];
  total: number;
}
export interface Category {
  id: number;
  title: string;
}
export interface ArticleInput {
  title: string;
  categoryId: number;
  status: 'draft' | 'published';
  content: string;
}
export interface Article extends ArticleInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}
export interface Account {
  id: number;
  username: string;
  displayName: string;
  enabled: boolean;
  isSuper: boolean;
  groupIds: number[];
}
export type AccountInput = Omit<Account, 'groupIds' | 'id' | 'isSuper'> & {
  groupIds?: number[];
  isSuper?: boolean;
  password?: string;
};
export interface Group {
  id: number;
  name: string;
  code: string;
  enabled: boolean;
  parentId: null | number;
  permissionIds: number[];
}
export interface PermissionNode {
  id: number;
  parentId: null | number;
  title: string;
  kind: 'action' | 'directory' | 'page';
  code: null | string;
  routeName: null | string;
  routePath: null | string;
  componentKey: string;
  icon: string;
  sortOrder: number;
  enabled: boolean;
}
export interface Definition {
  key: string;
  parent: string;
  kind: PermissionNode['kind'];
  title: string;
  routeName: string;
  routePath: string;
  componentKey: string;
  icon: string;
}
export interface Audit {
  id: number;
  actorAdminId: null | number;
  action: string;
  targetType: string;
  targetId: null | number;
  result: 'failure' | 'success';
  createdAt: string;
  changes?: { after: unknown; before: unknown };
}
export type GroupChoice = Pick<Group, 'enabled' | 'id' | 'name'>;
export type Query = Record<string, unknown>;
function save<T>(path: string, id: number | undefined, data: unknown) {
  return id
    ? requestClient.put<T>(`${path}/${id}`, data)
    : requestClient.post<T>(path, data);
}
export const articlesApi = {
  categories: () => requestClient.get<Category[]>('/articles/categories'),
  list: (params: Query) =>
    requestClient.get<PageResult<Omit<Article, 'content'>>>('/articles', {
      params,
    }),
  get: (id: number) => requestClient.get<Article>(`/articles/${id}`),
  save: (id: number | undefined, data: ArticleInput) =>
    save<Article>('/articles', id, data),
  remove: (id: number) => requestClient.delete<null>(`/articles/${id}`),
};
export const accountsApi = {
  async list(params: Query) {
    const result = await requestClient.get<
      PageResult<Account> & { groups: GroupChoice[] | null }
    >('/accounts', { params });
    return { ...result, groups: result.groups ?? [] };
  },
  save: (id: number | undefined, data: AccountInput) =>
    save<Account>('/accounts', id, data),
};
export const groupsApi = {
  async list() {
    const result = await requestClient.get<{
      grantableIds: number[];
      items: Group[] | null;
      nodes: PermissionNode[];
    }>('/groups');
    return { ...result, items: result.items ?? [] };
  },
  save: (id: number | undefined, data: Omit<Group, 'id'>) =>
    save<Group>('/groups', id, data),
};
export const nodesApi = {
  list: () =>
    requestClient.get<{ items: PermissionNode[]; registry: Definition[] }>(
      '/nodes',
    ),
  impact: (id: number) =>
    requestClient.get<{ groups: GroupChoice[]; nodes: PermissionNode[] }>(
      `/nodes/${id}/impact`,
    ),
  save: (id: number | undefined, data: Omit<PermissionNode, 'id'>) =>
    save<PermissionNode>('/nodes', id, data),
  async disabled() {
    return (
      (await requestClient.get<null | PermissionNode[]>('/recovery/nodes')) ??
      []
    );
  },
  enable: (id: number) =>
    requestClient.post<PermissionNode>(`/recovery/nodes/${id}/enable`),
};
export const auditApi = {
  list: (params: Query) =>
    requestClient.get<PageResult<Audit>>('/logs', { params }),
  get: (id: number) => requestClient.get<Audit>(`/logs/${id}`),
};
