// ============================================================
// TestCenter.ts — Backend test runner.
// Each tool/service registers its own test suite here.
// Run: ts-node src/test/TestCenter.ts
// ============================================================

import { AuthTool } from "../tools/AuthTool";
import { DbTool } from "../tools/DbTool";
import { Trans } from "../core/Trans";
import { Action } from "../core/Action";
import { Response } from "../core/Response";
import { LogCenter } from "../log/LogCenter";

type TestFn = () => Promise<void> | void;

interface TestCase {
  name: string;
  fn: TestFn;
}

class TestRunner {
  private cases: TestCase[] = [];
  private passed = 0;
  private failed = 0;

  add(name: string, fn: TestFn): void {
    this.cases.push({ name, fn });
  }

  assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
  }

  assertEqual<T>(a: T, b: T, message?: string): void {
    if (a !== b) throw new Error(`Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}. ${message ?? ""}`);
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
    LogCenter.info(
      "TestCenter",
      `Done. ${this.passed} passed, ${this.failed} failed.`
    );
  }
}

// ---- Test suites ----

const runner = new TestRunner();

// AuthTool tests
runner.add("AuthTool: hash and check password", () => {
  const hash = AuthTool.hashPassword("secret123");
  runner.assert(AuthTool.checkPassword("secret123", hash), "password should match");
  runner.assert(!AuthTool.checkPassword("wrong", hash), "wrong password should fail");
});

runner.add("AuthTool: create and verify token", () => {
  const token = AuthTool.createToken({ userId: 1, role: "admin" });
  const payload = AuthTool.verifyToken(token);
  runner.assert(payload !== null, "token should be valid");
  runner.assertEqual(payload!.userId, 1, "userId");
  runner.assertEqual(payload!.role, "admin", "role");
});

runner.add("AuthTool: expired token returns null", () => {
  const token = AuthTool.createToken({ userId: 1, role: "user" }, -1);
  runner.assert(AuthTool.verifyToken(token) === null, "expired token should be null");
});

// Trans tests
runner.add("Trans: translate known key", () => {
  runner.assertEqual(Trans.t("sys.success", "en"), "Success");
  runner.assertEqual(Trans.t("sys.success", "zh"), "操作成功");
});

runner.add("Trans: unknown key returns key itself", () => {
  runner.assertEqual(Trans.t("no.such.key"), "no.such.key");
});

// Action tests
runner.add("Action: flush collects and clears", () => {
  Action.clear();
  Action.alert("hello");
  Action.navigate("/home");
  const list = Action.flush();
  runner.assertEqual(list.length, 2, "should have 2 actions");
  runner.assertEqual(list[0].name, "alert");
  runner.assertEqual(list[1].name, "navigate");
  runner.assertEqual(Action.flush().length, 0, "should be empty after flush");
});

// Response tests
runner.add("Response: success wraps data and actions", () => {
  Action.clear();
  Action.success("done");
  const res = Response.success({ id: 1 });
  runner.assertEqual(res.code, 0);
  runner.assertEqual(res.action_list.length, 1);
  runner.assertEqual(res.action_list[0].name, "success");
});

runner.add("Response: error clears action list", () => {
  Action.clear();
  Action.alert("should be discarded");
  const res = Response.error(400, "sys.param_error");
  runner.assertEqual(res.code, 400);
  runner.assertEqual(res.action_list.length, 0, "error should discard actions");
});

// DbTool ping (skipped if no DB)
runner.add("DbTool: ping (skipped in CI without DB)", async () => {
  // Uncomment when DB is available:
  // const ok = await DbTool.ping();
  // runner.assert(ok, "DB should be reachable");
});

runner.run();
