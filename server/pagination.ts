/** Shared list pagination for admin/API list endpoints (PostgreSQL LIMIT/OFFSET). */

export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 200;

export type ListParams = {
  limit: number;
  offset: number;
  /** 1-based page index */
  page: number;
};

/**
 * Parse `page` (1-based) and/or `limit` and/or `offset` from query.
 * Precedence: `page` + `limit` → offset = (page-1)*limit. Else `offset` + `limit`.
 */
export function parseListParams(query: Record<string, unknown>): ListParams {
  let limit = DEFAULT_LIST_LIMIT;
  if (query.limit != null) {
    const n = Number(query.limit);
    if (Number.isFinite(n) && n > 0) limit = Math.min(Math.floor(n), MAX_LIST_LIMIT);
  }

  let offset = 0;
  let page = 1;

  if (query.page != null) {
    const p = Number(query.page);
    if (Number.isFinite(p) && p >= 1) {
      page = Math.floor(p);
      offset = (page - 1) * limit;
    }
  } else if (query.offset != null) {
    const o = Number(query.offset);
    if (Number.isFinite(o) && o >= 0) {
      offset = Math.floor(o);
      page = Math.floor(offset / limit) + 1;
    }
  }

  return { limit, offset, page };
}

export function listResponse<T>(items: T[], total: number, p: ListParams) {
  return {
    items,
    total,
    limit: p.limit,
    offset: p.offset,
    page: p.page,
  };
}
