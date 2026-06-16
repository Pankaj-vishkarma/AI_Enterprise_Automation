/**
 * Extract a user-facing message from axios/FastAPI error responses.
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  if (!error.response) {
    return 'Network error. Please check your connection and try again.';
  }

  const detail = error.response?.data?.detail;

  if (error.response?.data?.success === false) {
    const details = error.response.data.details;
    if (Array.isArray(details) && details.length > 0) {
      const fieldMessages = details.map((item) => item?.msg).filter(Boolean);
      if (fieldMessages.length > 0) {
        return fieldMessages.join('. ');
      }
    }
    if (error.response.data.message) {
      return error.response.data.message;
    }
  }

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

function extractApiDetail(error) {
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

  return null;
}

/** Login-specific error messages (invalid credentials, network, server errors). */
export function getLoginErrorMessage(error) {
  if (!error?.response) {
    return 'Unable to connect to server';
  }

  const status = error.response.status;
  const detail = extractApiDetail(error);

  if (status === 401) {
    return 'Invalid email or password';
  }

  if (status === 403 || status === 400) {
    return detail || 'Unable to sign in. Please try again.';
  }

  if (status >= 500) {
    return 'Server error. Please try again later.';
  }

  return detail || 'Invalid email or password';
}
