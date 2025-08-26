const axios = require('axios');
const { default: axiosRetry } = require('axios-retry');

// Create axios instance
const httpClient = axios.create({
  baseURL: process.env.KIXIE_API_URL || 'https://api.kixie.com',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure retry strategy
axiosRetry(httpClient, {
  retries: 3, // Number of retries
  retryDelay: (retryCount) => {
    // Exponential backoff: 1000 * 2^retryCount ms
    return 1000 * Math.pow(2, retryCount);
  },
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return (
      axiosRetry.isNetworkError(error) ||
      axiosRetry.isRetryableError(error) ||
      error.response?.status >= 500
    );
  },
  shouldResetTimeout: true, // Reset timeout between retries
});

// Request interceptor for logging
httpClient.interceptors.request.use(
  (config) => {
    console.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
httpClient.interceptors.response.use(
  (response) => {
    console.log(`Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`Error: ${error.response?.status} ${error.config?.url}`);
    return Promise.reject(error);
  }
);

module.exports = httpClient;
