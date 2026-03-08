// ============================================================
// Comm.ts — Frontend communication layer.
// Wraps HttpTool, handles the standard response envelope,
// and delegates action_list to ActionExecutor.
// ============================================================

import { HttpTool, HttpResponse } from "../tools/HttpTool";
import { ActionExecutor, ActionItem } from "./Action";
import { LogCenter } from "../log/LogCenter";

export interface StandardResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
  action_list: ActionItem[];
}

export type CommCallback<T = unknown> = (res: StandardResponse<T>) => void;

export class Comm {
  /** Send a POST request and process the standard response */
  static async post<T = unknown>(
    path: string,
    body: unknown,
    onSuccess?: CommCallback<T>,
    onError?: CommCallback<T>
  ): Promise<StandardResponse<T>> {
    const http = await HttpTool.post<StandardResponse<T>>(path, body);
    return Comm.handleResponse(http, onSuccess, onError);
  }

  /** Send a GET request and process the standard response */
  static async get<T = unknown>(
    path: string,
    onSuccess?: CommCallback<T>,
    onError?: CommCallback<T>
  ): Promise<StandardResponse<T>> {
    const http = await HttpTool.get<StandardResponse<T>>(path);
    return Comm.handleResponse(http, onSuccess, onError);
  }

  /** Send a PUT request and process the standard response */
  static async put<T = unknown>(
    path: string,
    body: unknown,
    onSuccess?: CommCallback<T>,
    onError?: CommCallback<T>
  ): Promise<StandardResponse<T>> {
    const http = await HttpTool.put<StandardResponse<T>>(path, body);
    return Comm.handleResponse(http, onSuccess, onError);
  }

  /** Send a DELETE request and process the standard response */
  static async delete<T = unknown>(
    path: string,
    onSuccess?: CommCallback<T>,
    onError?: CommCallback<T>
  ): Promise<StandardResponse<T>> {
    const http = await HttpTool.delete<StandardResponse<T>>(path);
    return Comm.handleResponse(http, onSuccess, onError);
  }

  private static handleResponse<T>(
    http: HttpResponse<StandardResponse<T>>,
    onSuccess?: CommCallback<T>,
    onError?: CommCallback<T>
  ): StandardResponse<T> {
    const res = http.data;
    LogCenter.debug("Comm", `Response code=${res.code}`, res);

    // Always execute action_list regardless of code
    if (res.action_list?.length) {
      ActionExecutor.execute(res.action_list);
    }

    if (res.code === 0) {
      onSuccess?.(res);
    } else {
      LogCenter.warn("Comm", `Error response: ${res.message}`);
      onError?.(res);
    }

    return res;
  }
}
