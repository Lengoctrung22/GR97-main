import axios from "axios";

export const ADMIN_TOKEN_KEY = "healthyai_admin_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  timeout: 20000,
});

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAdminToken = (token) => {
  if (!token) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return;
  }
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

// Add token to request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors and auto-refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If it's a 401 error and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if this is already the refresh request
      if (originalRequest.url?.includes("/auth/refresh")) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        window.location.href = "/login";
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Get current token
        const currentToken = localStorage.getItem(ADMIN_TOKEN_KEY);
        
        if (!currentToken) {
          throw new Error("No token available");
        }

        // Call refresh endpoint
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5001/api"}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );

        // Store the new token
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        
        // Process queued requests
        processQueue(null, data.token);

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and reject all queued requests
        processQueue(refreshError, null);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        
        // Redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
