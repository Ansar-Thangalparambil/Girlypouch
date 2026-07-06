const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('girlypouch_token');
  }
  return null;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.json();
      errorMessage = errBody.error || errBody.detail || JSON.stringify(errBody) || errorMessage;
    } catch (_) {}
    throw new Error(errorMessage);
  }

  // Handle file download response
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return response as any;
  }

  return response.json();
}

export const api = {
  // Auth API
  auth: {
    login: async (username: string, password: string) => {
      const data = await request('/api/users/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (typeof window !== 'undefined' && data.token) {
        localStorage.setItem('girlypouch_token', data.token);
      }
      return data;
    },
    register: async (payload: any) => {
      return request('/api/users/register/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getProfile: async () => {
      return request('/api/users/me/');
    },
    updateProfile: async (payload: any) => {
      return request('/api/users/me/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('girlypouch_token');
      }
    }
  },

  // Products API
  products: {
    getComponents: async () => {
      return request('/api/products/components/');
    },
    getKits: async () => {
      return request('/api/products/kits/');
    },
    getKitDetail: async (slug: string) => {
      return request(`/api/products/kits/${slug}/`);
    }
  },

  // Subscriptions (D2C) API
  subscriptions: {
    list: async () => {
      return request('/api/subscriptions/');
    },
    create: async (kitProductId: number, items: { pad_component_id: number; quantity: number }[]) => {
      return request('/api/subscriptions/', {
        method: 'POST',
        body: JSON.stringify({ kit_product_id: kitProductId, items }),
      });
    },
    getDetail: async (id: number) => {
      return request(`/api/subscriptions/${id}/`);
    },
    update: async (id: number, payload: { status?: string; items?: { pad_component_id: number; quantity: number }[] }) => {
      return request(`/api/subscriptions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    createCheckoutSession: async (subscriptionId: number, successUrl: string, cancelUrl: string) => {
      return request('/api/subscriptions/create-checkout-session/', {
        method: 'POST',
        body: JSON.stringify({ subscription_id: subscriptionId, success_url: successUrl, cancel_url: cancelUrl }),
      });
    },
    confirm: async (sessionId: string) => {
      return request('/api/subscriptions/confirm/', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      });
    }
  },

  // Orders & B2B Wholesale API
  orders: {
    list: async () => {
      return request('/api/orders/');
    },
    createWholesale: async (payload: {
      items: { pad_component_id: number; quantity: number }[];
      company_name?: string;
      vat_number?: string;
      billing_terms?: string;
      shipping_address: string;
    }) => {
      return request('/api/orders/wholesale/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    listWholesaleInvoices: async () => {
      return request('/api/orders/wholesale/invoices/');
    },
    downloadInvoice: async (invoiceId: number): Promise<Blob> => {
      const response = await fetch(`${API_URL}/api/orders/wholesale/invoices/${invoiceId}/download/`, {
        headers: {
          'Authorization': `Token ${getAuthToken() || ''}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to download invoice PDF');
      }
      return response.blob();
    }
  }
};
