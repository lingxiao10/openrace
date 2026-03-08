// ============================================================
// TestCenter.ts — Frontend test runner (runs in Node via ts-node).
// Each tool registers its own tests here.
// Run: ts-node src/test/TestCenter.ts
// ============================================================

// Polyfill browser globals for Node testing
(global as Record<string, unknown>).localStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
})();
(global as Record<string, unknown>).window = global;
(global as Record<string, unknown>).alert = (msg: string) => console.log("[alert]", msg);

import { StorageTool } from "../tools/StorageTool";
import { EventTool } from "../tools/EventTool";
import { Trans } from "../core/Trans";
import { Config } from "../core/Config";
import { ActionExecutor } from "../core/Action";
import { LogCenter } from "../log/LogCenter";

type TestFn = () => Promise<void> | void;

class TestRunner {
  private cases: Array<{ name: string; fn: TestFn }> = [];
  private passed = 0;
  private failed = 0;

  add(name: string, fn: TestFn): void {
    this.cases.push({ name, fn });
  }

  assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
  }

  assertEqual<T>(a: T, b: T, msg?: string): void {
    if (a !== b) throw new Error(`Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}. ${msg ?? ""}`);
  }

  async run(): Promise<void> {
    LogCenter.info("TestCenter", `Running ${this.cases.length} tests...`);
    for (const tc of this.cases) {
      try {
        await tc.fn();
        LogCenter.info("TestCenter", `  ✓ ${tc.name}`);
        this.passed++;
      } catch (err) {
        LogCenter.error("TestCenter", `  ✗ ${tc.name}: ${(err as Error).message}`);
        this.failed++;
      }
    }
    LogCenter.info("TestCenter", `Done. ${this.passed} passed, ${this.failed} failed.`);
  }
}

const runner = new TestRunner();

// StorageTool
runner.add("StorageTool: set and get", () => {
  StorageTool.set("test_key", { value: 42 });
  const v = StorageTool.get<{ value: number }>("test_key");
  runner.assertEqual(v?.value, 42);
});

runner.add("StorageTool: remove", () => {
  StorageTool.set("rm_key", "hello");
  StorageTool.remove("rm_key");
  runner.assert(StorageTool.get("rm_key") === null, "should be null after remove");
});

// EventTool
runner.add("EventTool: emit and receive", () => {
  let received: unknown = null;
  EventTool.on("test_event", (data) => { received = data; });
  EventTool.emit("test_event", { msg: "hi" });
  runner.assertEqual((received as Record<string, string>)?.msg, "hi");
  EventTool.clear("test_event");
});

runner.add("EventTool: once fires only once", () => {
  let count = 0;
  EventTool.once("once_event", () => { count++; });
  EventTool.emit("once_event");
  EventTool.emit("once_event");
  runner.assertEqual(count, 1, "once should fire only once");
});

// Trans
runner.add("Trans: load and translate", () => {
  Trans.load({ "hello": "你好", "bye": "再见" }, "zh");
  runner.assertEqual(Trans.t("hello"), "你好");
  runner.assertEqual(Trans.t("bye"), "再见");
  runner.assertEqual(Trans.t("missing"), "missing");
});

// Config
runner.add("Config: load and get", () => {
  Config.load({ app_name: "TestApp", version: "2.0", default_lang: "en", supported_langs: ["en", "zh"] });
  runner.assertEqual(Config.get("app_name"), "TestApp");
  runner.assertEqual(Config.getLang(), "en");
});

// ActionExecutor
runner.add("ActionExecutor: register and execute", () => {
  let fired = false;
  ActionExecutor.register("test_action", () => { fired = true; });
  ActionExecutor.execute([{ name: "test_action", params: {} }]);
  runner.assert(fired, "handler should have been called");
});

runner.run();
