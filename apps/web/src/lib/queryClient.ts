import { QueryClient } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/api";
import { authService } from "@/lib/auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: text || res.statusText };
    }
    
    const error = new Error(errorData.message || errorData.error || `${res.status}: ${res.statusText}`) as any;
    error.status = res.status;
    error.requiresSubscription = errorData.requiresSubscription;
    error.data = errorData;
    throw error;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Overloaded function for GET requests (URL only)
export async function apiRequest(url: string): Promise<any>;
// Overloaded function for other HTTP methods
export async function apiRequest(url: string, options: { method: string; body?: any }): Promise<any>;
// Implementation
export async function apiRequest(
  url: string,
  options?: { method: string; body?: any }
): Promise<any> {
  const authHeaders = getAuthHeaders();
  const headers: Record<string, string> = {
    ...authHeaders,
  };
  
  const method = options?.method || 'GET';
  let body = options?.body;
  
  if (body) {
    headers["Content-Type"] = "application/json";
    // Convert object to JSON string if it's not already a string
    if (typeof body !== 'string') {
      body = JSON.stringify(body);
    }
  }

  const res = await fetch(buildApiUrl(url), {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T,>(options: {
  on401: UnauthorizedBehavior;
}) => async ({ queryKey }: { queryKey: readonly unknown[] }): Promise<T> => {
  const authHeaders = getAuthHeaders();
  const headers: Record<string, string> = { ...authHeaders };

  const url = buildApiUrl(queryKey[0] as string);
  const res = await fetch(url, {
    headers,
    credentials: "include",
  });

  if (options.on401 === "returnNull" && res.status === 401) {
    return null as T;
  }

  await throwIfResNotOk(res);
  return await res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      // Prevent automatic refetching of queries that might have invalid parameters
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});
