// ============================================================
// EventTool.ts — Independent typed event bus. No business logic.
// ============================================================

type EventCallback<T = unknown> = (data: T) => void;

export class EventTool {
  private static _listeners: Map<string, EventCallback[]> = new Map();

  static on<T>(event: string, callback: EventCallback<T>): void {
    const list = EventTool._listeners.get(event) ?? [];
    list.push(callback as EventCallback);
    EventTool._listeners.set(event, list);
  }

  static off<T>(event: string, callback: EventCallback<T>): void {
    const list = EventTool._listeners.get(event) ?? [];
    EventTool._listeners.set(
      event,
      list.filter((cb) => cb !== callback)
    );
  }

  static emit<T>(event: string, data?: T): void {
    const list = EventTool._listeners.get(event) ?? [];
    for (const cb of list) cb(data);
  }

  static once<T>(event: string, callback: EventCallback<T>): void {
    const wrapper: EventCallback<T> = (data) => {
      callback(data);
      EventTool.off(event, wrapper);
    };
    EventTool.on(event, wrapper);
  }

  static clear(event?: string): void {
    if (event) {
      EventTool._listeners.delete(event);
    } else {
      EventTool._listeners.clear();
    }
  }
}
