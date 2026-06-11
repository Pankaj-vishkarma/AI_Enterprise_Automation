/**
 * Convert FastAPI / axios error payloads into a user-readable string.
 */
export function formatApiError(error, fallback = 'Request failed') {
  const detail = error?.response?.data?.detail;

  if (detail == null) {
    return error?.message || fallback;
  }

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const field = Array.isArray(item.loc) ? item.loc.filter((p) => p !== 'body').join('.') : '';
          const msg = item.msg || JSON.stringify(item);
          return field ? `${field}: ${msg}` : msg;
        }
        return String(item);
      })
      .join('; ');
  }

  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return String(detail);
}
