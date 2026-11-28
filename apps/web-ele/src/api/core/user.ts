import { getAccessApi } from './auth';

export async function getUserInfoApi() {
  const { user } = await getAccessApi();
  return user;
}
