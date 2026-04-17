// src/api/client.ts

// 這裡預設使用相對路徑，因為你的前端 Vite 部署在 Pages，後端在同一個網域下
const BASE_URL = ''; 

export const apiClient = {
  /**
   * 核心 fetch 封裝
   */
  async fetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        // 🌟 非常重要：這行設定會讓瀏覽器自動帶上 Cookie (user_session) 到後端
        credentials: 'include', 
      });

      const data = await response.json();

      // 如果 HTTP 狀態碼不是 2xx，或是後端回傳 success: false，就拋出錯誤
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'API 請求失敗');
      }

      return data;
    } catch (error: any) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error);
      throw error;
    }
  },

  // 簡化 GET 請求
  get<T = any>(endpoint: string, options?: RequestInit) {
    return this.fetch<T>(endpoint, { ...options, method: 'GET' });
  },

  // 簡化 POST 請求
  post<T = any>(endpoint: string, body: any, options?: RequestInit) {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // 簡化 PATCH 請求
  patch<T = any>(endpoint: string, body: any, options?: RequestInit) {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  // 簡化 DELETE 請求
  delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.fetch<T>(endpoint, { ...options, method: 'DELETE' });
  }
};