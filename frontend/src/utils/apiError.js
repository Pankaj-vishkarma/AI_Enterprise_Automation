/**
 * Extract a user-facing message from axios/FastAPI error responses.
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  if (!error.response) {
    return 'Network error. Please check your connection and try again.';
  }

  const detail = error.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || JSON.stringify(item))
      .join('. ');
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.status === 401) {
    return 'Invalid credentials. Please try again.';
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  return fallback;
}

/** @deprecated Use getApiErrorMessage — kept for modules that import formatApiError */
export const formatApiError = getApiErrorMessage;
