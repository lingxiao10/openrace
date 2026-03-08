// ============================================================
// Toast.ts — Toast notification UI primitive.
// ============================================================

export type ToastType = "success" | "error" | "info" | "warn";

export class Toast {
  private static container: HTMLElement | null = null;

  static init(): void {
    Toast.container = document.getElementById("toast-container");
    if (!Toast.container) {
      Toast.container = document.createElement("div");
      Toast.container.id = "toast-container";
      document.body.appendChild(Toast.container);
    }
  }

  static show(message: string, type: ToastType = "info", durationMs = 3000): void {
    if (!Toast.container) Toast.init();
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    Toast.container!.appendChild(el);
    setTimeout(() => el.classList.add("toast-visible"), 10);
    setTimeout(() => {
      el.classList.remove("toast-visible");
      setTimeout(() => el.remove(), 300);
    }, durationMs);
  }

  static success(msg: string): void { Toast.show(msg, "success"); }
  static error(msg: string): void   { Toast.show(msg, "error", 5000); }
  static info(msg: string): void    { Toast.show(msg, "info"); }
}
