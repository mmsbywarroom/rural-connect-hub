/** Shared limit/offset/search parsing for admin list APIs. */

export const ADMIN_LIST_DEFAULT_LIMIT = 50;
export const ADMIN_LIST_MAX_LIMIT = 200;

export type AdminPaged<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export function parseAdminListQuery(q: Record<string, unknown>): {
  limit: number;
  offset: number;
  search: string;
} {
  const limitRaw = parseInt(String(q?.limit ?? ""), 10);
  const offsetRaw = parseInt(String(q?.offset ?? ""), 10);
  const limit = Math.min(
    Math.max(Number.isFinite(limitRaw) ? limitRaw : ADMIN_LIST_DEFAULT_LIMIT, 1),
    ADMIN_LIST_MAX_LIMIT,
  );
  const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);
  const search = String(q?.search ?? "")
    .trim()
    .replace(/[%_\\]/g, "");
  return { limit, offset, search };
}
