// ============================================================
// HttpTool.ts — Independent HTTP client. No business logic.
// ============================================================

export interface HttpOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export class HttpTool {
  private static baseUrl = "";
  private static defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  static setBaseUrl(url: string): void {
    HttpTool.baseUrl = url.replace(/\/$/, "");
  }

  static setHeader(key: string, value: string): void {
    HttpTool.defaultHeaders[key] = value;
  }

  static removeHeader(key: string): void {
    delete HttpTool.defaultHeaders[key];
  }

  static async get<T>(path: string, opts?: HttpOptions): Promise<HttpResponse<T>> {
    return HttpTool.request<T>("GET", path, undefined, opts);
  }

  static async post<T>(
    path: string,
    body: unknown,
    opts?: HttpOptions
  ): Promise<HttpResponse<T>> {
    return HttpTool.request<T>("POST", path, body, opts);
  }

  static async delete<T>(path: string, opts?: HttpOptions): Promise<HttpResponse<T>> {
    return HttpTool.request<T>("DELETE", path, undefined, opts);
  }

  static async put<T>(path: string, body: unknown, opts?: HttpOptions): Promise<HttpResponse<T>> {
    return HttpTool.request<T>("PUT", path, body, opts);
  }

  private static async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: HttpOptions
  ): Promise<HttpResponse<T>> {
    const url = HttpTool.baseUrl + path;
    const headers = { ...HttpTool.defaultHeaders, ...(opts?.headers ?? {}) };
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      opts?.timeout ?? 30000
    );

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      console.log('[HttpTool] Response text:', text);
      const data: T = JSON.parse(text);
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timer);
    }
  }
}
