// ============================================================
// Action.ts — Frontend action executor.
// Receives action_list from backend responses and dispatches
// each action to a registered handler by name.
// ============================================================

import { LogCenter } from "../log/LogCenter";

export interface ActionItem {
  name: string;
  params: Record<string, unknown>;
  wait_time?: number;
}

type ActionHandler = (params: Record<string, unknown>) => void;

export class ActionExecutor {
  private static _handlers: Map<string, ActionHandler> = new Map();

  /** Register a handler for an action name */
  static register(name: string, handler: ActionHandler): void {
    ActionExecutor._handlers.set(name, handler);
  }

  /** Execute a list of actions from a backend response */
  static execute(actionList: ActionItem[]): void {
    for (const action of actionList) {
      ActionExecutor.scheduleOne(action);
    }
  }

  private static scheduleOne(action: ActionItem): void {
    const delay = action.wait_time ?? 0;
    if (delay > 0) {
      setTimeout(() => ActionExecutor.runOne(action), delay);
    } else {
      ActionExecutor.runOne(action);
    }
  }

  private static runOne(action: ActionItem): void {
    const handler = ActionExecutor._handlers.get(action.name);
    if (!handler) {
      LogCenter.warn("ActionExecutor", `No handler for action: ${action.name}`);
      return;
    }
    LogCenter.debug("ActionExecutor", `Execute: ${action.name}`, action.params);
    handler(action.params);
  }

  /** Register all built-in action handlers */
  static registerBuiltins(): void {
    ActionExecutor.register("alert", (p) => {
      alert(p.message as string);
    });

    ActionExecutor.register("success", (p) => {
      ActionExecutor.showToast(p.message as string, "success");
    });

    ActionExecutor.register("navigate", (p) => {
      window.location.hash = p.path as string;
    });

    ActionExecutor.register("refresh", () => {
      window.location.reload();
    });

    ActionExecutor.register("update_html", (p) => {
      const html = p.html as Record<string, unknown>;
      for (const [id, value] of Object.entries(html)) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value);
      }
    });

    ActionExecutor.register("fire_event", (p) => {
      window.dispatchEvent(
        new CustomEvent(p.event_name as string, { detail: p.params })
      );
    });

    ActionExecutor.register("syn_trans", (p) => {
      // Handled in AppLogic.handleInitResponse
      LogCenter.debug("ActionExecutor", "syn_trans received", p);
    });

    ActionExecutor.register("syn_config", (p) => {
      // Handled in AppLogic.handleInitResponse
      LogCenter.debug("ActionExecutor", "syn_config received", p);
    });

    ActionExecutor.register("sync_data", (p) => {
      // Store data in window for immediate access
      const key = p.key as string;
      const value = p.value;
      if (key && value !== undefined) {
        (window as any)[`__sync_${key}`] = value;
        LogCenter.debug("ActionExecutor", `sync_data: ${key}`, value);
      }
    });

    ActionExecutor.register("call_function", (p) => {
      const fn = (window as unknown as Record<string, unknown>)[p.function_name as string];
      if (typeof fn === "function") fn(p.params);
    });

    ActionExecutor.register("confirm", (p) => {
      if (window.confirm(p.title as string)) {
        window.dispatchEvent(
          new CustomEvent("action_confirm", {
            detail: { action_name: p.action_name, params: p.params },
          })
        );
      }
    });
  }

  private static showToast(message: string, type: string): void {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}
