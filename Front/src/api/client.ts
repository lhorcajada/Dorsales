import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

function getErrorPageUrl(status: number | string, message: string) {
  const params = new URLSearchParams({
    status: String(status),
    message,
  });

  return `/error?${params.toString()}`;
}

function shouldRedirectToErrorPage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  return status === undefined || status >= 500;
}

function getErrorPageMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'No se pudo completar la solicitud.';
  }

  const responseData = error.response?.data;

  if (
    typeof responseData === 'object' &&
    responseData !== null &&
    'message' in responseData &&
    typeof responseData.message === 'string'
  ) {
    return responseData.message;
  }

  return error.message || 'No se pudo completar la solicitud.';
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function installApiErrorInterceptor() {
  const interceptorId = apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        typeof window !== 'undefined' &&
        shouldRedirectToErrorPage(error) &&
        window.location.pathname !== '/error'
      ) {
        const status = axios.isAxiosError(error) ? error.response?.status ?? 'network' : 'error';
        window.location.assign(getErrorPageUrl(status, getErrorPageMessage(error)));
      }

      return Promise.reject(error);
    },
  );

  return () => {
    apiClient.interceptors.response.eject(interceptorId);
  };
}