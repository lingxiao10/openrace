// ============================================================
// Router.ts — Hash-based SPA router.
// ============================================================

import { LogCenter } from "../log/LogCenter";
import { StorageTool } from "../tools/StorageTool";

export interface RouteParams {
  [key: string]: string;
}

type PageFactory = (params: RouteParams) => PageInstance;

interface PageInstance {
  mount(container: HTMLElement, params: RouteParams): void;
  unmount(): void;
}

interface Route {
  pattern: RegExp;
  keys: string[];
  factory: PageFactory;
  requireAuth?: boolean;
}

export class Router {
  private static routes: Route[] = [];
  private static current: PageInstance | null = null;
  private static container: HTMLElement;

  static init(containerId = "app"): void {
    Router.container = document.getElementById(containerId) as HTMLElement;
    window.addEventListener("hashchange", () => Router.resolve());
    Router.resolve();
  }

  static register(path: string, factory: PageFactory, requireAuth = false): void {
    const keys: string[] = [];
    const pattern = new RegExp(
      "^" + path.replace(/:([^/]+)/g, (_: string, k: string) => { keys.push(k); return "([^/]+)"; }) + "$"
    );
    Router.routes.push({ pattern, keys, factory, requireAuth });
  }

  static navigate(path: string): void {
    window.location.hash = path;
  }

  static refresh(): void {
    Router.resolve();
  }

  private static resolve(): void {
    const hash = window.location.hash.slice(1) || "/";
    for (const route of Router.routes) {
      const match = hash.match(route.pattern);
      if (!match) continue;

      // Check auth requirement
      if (route.requireAuth && !StorageTool.get("token")) {
        LogCenter.debug("Router", `Route ${hash} requires auth, redirecting to login`);
        Router.navigate("/login");
        return;
      }

      const params: RouteParams = {};
      route.keys.forEach((k, i) => { params[k] = match[i + 1]; });
      Router.current?.unmount();
      Router.container.innerHTML = "";
      Router.current = route.factory(params);
      Router.current.mount(Router.container, params);
      LogCenter.debug("Router", `Navigated to ${hash}`);
      return;
    }
    Router.navigate("/");
  }
}
