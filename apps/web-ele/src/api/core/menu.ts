import { getAccessApi } from './auth';

export async function getAllMenusApi() {
  const { menus } = await getAccessApi();
  return menus;
}
