// ============================================================
// main.ts — Frontend entry point.
// ============================================================

import { AppLogic } from "./AppLogic";
import { Router } from "./core/Router";
import { StorageTool } from "./tools/StorageTool";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RobotPage } from "./pages/RobotPage";
import { GamePage } from "./pages/GamePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LogPage } from "./pages/LogPage";
import { GameCenterPage } from "./pages/GameCenterPage";
import { RunningMatchesPage } from "./pages/RunningMatchesPage";

function requireAuth(): boolean {
  return Boolean(StorageTool.get("token"));
}

window.addEventListener("DOMContentLoaded", async () => {
  await AppLogic.boot();

  // Update nav buttons based on auth state
  updateNavButtons();

  // Show welcome modal on first visit
  const hasSeenWelcome = StorageTool.get("hasSeenWelcome");
  if (!hasSeenWelcome) {
    const overlay = document.getElementById("welcome-overlay");
    const btn = document.getElementById("welcome-btn");
    if (overlay && btn) {
      overlay.style.display = "flex";
      btn.addEventListener("click", () => {
        overlay.style.display = "none";
        StorageTool.set("hasSeenWelcome", "true");
      });
    }
  }

  // Register routes
  Router.register("/",                () => new GameCenterPage());
  Router.register("/login",           () => new LoginPage());
  Router.register("/register",        () => new RegisterPage());
  Router.register("/running-matches", () => new RunningMatchesPage());
  Router.register("/dashboard",       () => new DashboardPage(), true);
  Router.register("/robots",          () => new RobotPage(), true);
  Router.register("/match/:id",       () => new GamePage());
  Router.register("/leaderboard",     () => new LeaderboardPage());
  Router.register("/history",         () => new HistoryPage(), true);
  Router.register("/settings",        () => new SettingsPage(), true);
  Router.register("/logs",            () => new LogPage(), true);

  // Default redirect
  if (!requireAuth() && !["#/login", "#/register", "#/"].includes(window.location.hash)) {
    Router.navigate("/");
  }

  Router.init("app");

  // Logout button
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    AppLogic.onLogout();
    updateNavButtons();
  });

  // Login button
  document.getElementById("btn-login")?.addEventListener("click", () => {
    Router.navigate("/login");
  });

  // Language switcher
  document.getElementById("lang-select")?.addEventListener("change", (e) => {
    AppLogic.onSwitchLang((e.target as HTMLSelectElement).value);
  });

  // 语言切换后立即刷新当前页面（由 Trans.switch 触发）
  document.addEventListener("lang_changed", () => {
    Router.refresh();
  });

  // Listen for login events to update nav buttons
  document.addEventListener("user_logged_in", () => {
    updateNavButtons();
  });
});

function updateNavButtons(): void {
  const isLoggedIn = requireAuth();
  const btnLogout = document.getElementById("btn-logout");
  const btnLogin = document.getElementById("btn-login");
  const navBalance = document.getElementById("nav-balance");

  if (btnLogout) btnLogout.style.display = isLoggedIn ? "block" : "none";
  if (btnLogin) btnLogin.style.display = isLoggedIn ? "none" : "block";
  if (navBalance) navBalance.style.display = isLoggedIn ? "block" : "none";
}
