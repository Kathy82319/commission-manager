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

      // 嘗試解析 JSON，若解析失敗則給予空物件
      const data = await response.json().catch(() => ({}));

      // 🌟 優化邏輯：處理失敗請求
      if (!response.ok || data.success === false) {
        // 1. 抓取錯誤訊息：優先抓 message，其次是 error，最後才是通用字串
        const errorMessage = data.message || data.error || 'API 請求失敗';

        // 2. 控制台顯示優化：
        // 只有 500 以上的伺服器錯誤才用 console.error (噴紅字)
        // 400 系列（如一人限發一篇）屬於「預期內的業務攔截」，用 console.warn 即可
        if (response.status >= 500) {
          console.error(`[Server Error] ${options.method || 'GET'} ${endpoint}:`, data);
        } else {
          console.warn(`[API Notice] ${endpoint}:`, errorMessage);
        }

        // 3. 拋出錯誤，讓頁面的 try-catch 能抓到這份精準的 message
        throw new Error(errorMessage);
      }

      return data;
    } catch (error: any) {
      // 如果是網路斷掉或其他的拋錯，保持原始拋出
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