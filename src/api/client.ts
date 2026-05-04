// src/api/client.ts

const BASE_URL = ''; 

export const apiClient = {

  async fetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', 
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        const errorMessage = data.message || data.error || 'API 請求失敗';

        if (response.status >= 500) {
          console.error(`[Server Error] ${options.method || 'GET'} ${endpoint}:`, data);
        } else {
          console.warn(`[API Notice] ${endpoint}:`, errorMessage);
        }

        throw new Error(errorMessage);
      }

      return data;
    } catch (error: any) {
      if (!error.message.includes('API 請求失敗') && !error.message) {
         console.error(`[Network Error] ${endpoint}:`, error);
      }
      throw error;
    }
  },

  get<T = any>(endpoint: string, options?: RequestInit) {
    return this.fetch<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T = any>(endpoint: string, body: any, options?: RequestInit) {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  patch<T = any>(endpoint: string, body: any, options?: RequestInit) {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.fetch<T>(endpoint, { ...options, method: 'DELETE' });
  }
};