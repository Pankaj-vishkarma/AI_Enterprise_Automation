const REFERENCE_LIST_LIMIT = 500;
const STALE_TIME_MS = 5 * 60 * 1000;

export function parsePaginatedResponse(response) {
  const body = response?.data;
  if (body && Array.isArray(body.items)) {
    return {
      items: body.items,
      total: body.total ?? 0,
      limit: body.limit ?? 0,
      offset: body.offset ?? 0,
    };
  }
  if (Array.isArray(body)) {
    return {
      items: body,
      total: body.length,
      limit: body.length,
      offset: 0,
    };
  }
  return { items: [], total: 0, limit: 0, offset: 0 };
}

export function orgListQueryKey(resource, limit, offset) {
  return [resource, 'list', limit, offset];
}

export { REFERENCE_LIST_LIMIT, STALE_TIME_MS };
