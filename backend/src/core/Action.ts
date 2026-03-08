// ============================================================
// Action.ts — Backend action builder.
// Actions are instructions sent to the frontend to execute.
// The frontend's ActionExecutor maps action names to handlers.
// ============================================================

export interface ActionItem {
  name: string;
  params: Record<string, unknown>;
  wait_time?: number;
}

export class Action {
  private static _list: ActionItem[] = [];

  // ---- factory helpers ----

  static add(name: string, params: Record<string, unknown> = {}, waitTime = 0): void {
    Action._list.push({ name, params, wait_time: waitTime });
  }

  /** Navigate to a page/route */
  static navigate(path: string, params: Record<string, unknown> = {}): void {
    Action.add("navigate", { path, ...params });
  }

  /** Update DOM / reactive data on the frontend */
  static updateHtml(html: Record<string, unknown>, waitTime = 0): void {
    Action.add("update_html", { html }, waitTime);
  }

  /** Show a toast/alert message */
  static alert(message: string, waitTime = 0): void {
    Action.add("alert", { message }, waitTime);
  }

  /** Show a success toast */
  static success(message: string, waitTime = 0): void {
    Action.add("success", { message }, waitTime);
  }

  /** Show a confirm dialog; on confirm, frontend calls action_name */
  static confirm(
    title: string,
    actionName: string,
    params: Record<string, unknown> = {}
  ): void {
    Action.add("confirm", { title, action_name: actionName, params });
  }

  /** Reload / refresh the current page */
  static refresh(): void {
    Action.add("refresh", {});
  }

  /** Fire a frontend event */
  static fireEvent(eventName: string, params: Record<string, unknown> = {}): void {
    Action.add("fire_event", { event_name: eventName, params });
  }

  /** Sync i18n translations to frontend */
  static syncTrans(transMap: Record<string, string>): void {
    Action.add("syn_trans", { trans_map: transMap });
  }

  /** Sync config to frontend */
  static syncConfig(configMap: Record<string, unknown>): void {
    Action.add("syn_config", { config_map: configMap });
  }

  /** Sync arbitrary data to frontend (stored in Config) */
  static syncData(key: string, value: unknown): void {
    Action.add("sync_data", { key, value });
  }

  /** Call a named function on the frontend */
  static callFunction(
    functionName: string,
    params: Record<string, unknown> = {},
    waitTime = 0
  ): void {
    Action.add("call_function", { function_name: functionName, params }, waitTime);
  }

  // ---- lifecycle ----

  /** Collect and reset the action list for this request */
  static flush(): ActionItem[] {
    const list = [...Action._list];
    Action._list = [];
    return list;
  }

  /** Peek without flushing */
  static peek(): ActionItem[] {
    return [...Action._list];
  }

  static clear(): void {
    Action._list = [];
  }
}
