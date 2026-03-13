// ============================================================
// RobotPage.ts — Robot management. Calls AppLogic only.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { Config } from "../core/Config";
import { EventTool } from "../tools/EventTool";
import { Toast } from "../ui/Toast";


export class RobotPage {
  private container!: HTMLElement;
  private robotCount: number = 0;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.renderSkeleton();
    this.populateProviders();

    AppLogic.loadRobots();
    EventTool.on("robots_loaded", (data) => this.renderRobots(data as Array<Record<string, unknown>>));
    this.bindCreateForm();
    this.bindEvents();

    // Listen for trigger from HomePage
    EventTool.on("trigger_create_robot", this.handleTriggerCreate);
  }

  private handleTriggerCreate = (): void => {
    const maxRobots = (Config.get("robot_max_per_user") as number) || 3;
    if (this.robotCount >= maxRobots) {
      Toast.error(Trans.t("robot.limit_reached", "Reached maximum robot limit."));
      return;
    }
    const modal = document.getElementById("create-robot-modal");
    if (modal) modal.classList.remove("hidden");
  };

  private populateProviders(): void {
    const providers = (window as any).__sync_providers as Array<{ id: string; name: string; isPlatformFree?: boolean; models: Array<{ id: string; name: string }>; topUpUrl?: string; supportsCustomModel?: boolean }> | undefined;
    if (!providers || !Array.isArray(providers)) {
      console.warn("Providers not loaded yet");
      return;
    }

    const providerSelect = document.getElementById("provider-select") as HTMLSelectElement;
    const modelSelect = document.getElementById("model-select") as HTMLSelectElement;
    const customModelInput = document.getElementById("custom-model-input") as HTMLInputElement;
    const baseUrlGroup = document.getElementById("base-url-group") as HTMLDivElement;
    const baseUrlInput = document.getElementById("base-url-input") as HTMLInputElement;
    const topupLink = document.getElementById("provider-topup-link") as HTMLAnchorElement;
    const apiKeyGroup = document.getElementById("api-key-group") as HTMLDivElement;
    const modelGroup = document.getElementById("model-group") as HTMLDivElement;
    const freeModelLabel = document.getElementById("free-model-label") as HTMLDivElement;

    if (!providerSelect || !modelSelect || !customModelInput || !baseUrlGroup || !baseUrlInput) return;

    // Populate providers
    providers.forEach((p) => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.name;
      providerSelect.appendChild(option);
    });

    // On provider change, update models and topup link
    providerSelect.addEventListener("change", () => {
      const selectedProvider = providers.find((p) => p.id === providerSelect.value);
      modelSelect.innerHTML = `<option value="">${Trans.t("robot.select_model", "Select Model")}</option>`;
      customModelInput.style.display = "none";
      customModelInput.value = "";
      modelSelect.removeAttribute("disabled");

      // Handle ark-free: platform provides the key for free, but user can choose model
      if (providerSelect.value === "ark-free") {
        if (apiKeyGroup) apiKeyGroup.style.display = "none";
        if (freeModelLabel) freeModelLabel.style.display = "none";
        baseUrlGroup.style.display = "none";
        topupLink.style.display = "none";
        if (modelGroup) modelGroup.style.display = "block";
        if (selectedProvider) {
          selectedProvider.models.forEach((m) => {
            const option = document.createElement("option");
            option.value = m.id;
            option.textContent = m.name;
            modelSelect.appendChild(option);
          });
        }
        modelSelect.style.display = "block";
        modelSelect.setAttribute("required", "required");
        return;
      }

      // Restore API key field for non-free providers
      if (apiKeyGroup) apiKeyGroup.style.display = "block";
      if (modelGroup) modelGroup.style.display = "block";
      if (freeModelLabel) freeModelLabel.style.display = "none";

      // Handle OpenAI Compatible special case
      if (providerSelect.value === "openai-compatible") {
        baseUrlGroup.style.display = "block";
        baseUrlInput.setAttribute("required", "required");
        // For OpenAI Compatible, directly show custom model input
        modelSelect.style.display = "none";
        modelSelect.removeAttribute("required");
        customModelInput.style.display = "block";
        customModelInput.setAttribute("required", "required");
        customModelInput.placeholder = Trans.t("robot.model_name_placeholder", "Enter model name (e.g., gpt-4)");
        topupLink.style.display = "none";
        return;
      } else {
        baseUrlGroup.style.display = "none";
        baseUrlInput.removeAttribute("required");
        baseUrlInput.value = "";
        modelSelect.style.display = "block";
        modelSelect.setAttribute("required", "required");
      }

      if (selectedProvider) {
        selectedProvider.models.forEach((m) => {
          const option = document.createElement("option");
          option.value = m.id;
          option.textContent = m.name;
          modelSelect.appendChild(option);
        });

        // Add "Custom" option only if provider supports custom models
        if (selectedProvider.supportsCustomModel !== false) {
          const customOption = document.createElement("option");
          customOption.value = "__custom__";
          customOption.textContent = Trans.t("robot.custom_model", "Custom");
          modelSelect.appendChild(customOption);
        }

        if (selectedProvider.topUpUrl) {
          topupLink.href = selectedProvider.topUpUrl;
          topupLink.style.display = "block";
        } else {
          topupLink.style.display = "none";
        }
      } else {
        topupLink.style.display = "none";
      }
    });

    // On model change, show/hide custom input
    modelSelect.addEventListener("change", () => {
      if (modelSelect.value === "__custom__") {
        customModelInput.style.display = "block";
        customModelInput.setAttribute("required", "required");
        customModelInput.placeholder = Trans.t("robot.custom_model_placeholder", "Enter custom model name");
      } else {
        customModelInput.style.display = "none";
        customModelInput.removeAttribute("required");
        customModelInput.value = "";
      }
    });
  }

  unmount(): void {
    EventTool.clear("robots_loaded");
    EventTool.clear("trigger_create_robot");
  }

  private renderSkeleton(): string {
    const lang = Trans.getLang();
    const defaultGameType = lang === "zh" ? "doudizhu" : "chess";

    return `
<div class="page">
  <div class="robots-header">
    <h2>${Trans.t("robot.title", "My Robots")}</h2>
    <button class="btn btn-primary" id="open-create-modal">
      <span>➕</span>
      ${Trans.t("robot.create", "Create Robot")}
    </button>
  </div>

  <div id="robot-list"><div class="loading-pulse"></div></div>
</div>

<!-- Create Robot Modal -->
<div class="modal-overlay hidden" id="create-robot-modal">
  <div class="modal-box">
    <div class="modal-header">
      <h3>${Trans.t("robot.create", "Create Robot")}</h3>
      <button class="modal-close" id="close-create-modal">✕</button>
    </div>
    <form id="create-robot-form">
      <div class="form-group">
        <label>${Trans.t("robot.name", "Robot Name")}</label>
        <input name="name" required placeholder="e.g. DeepBlue Jr." />
      </div>
      <div class="form-group">
        <label>${Trans.t("robot.game_type", "Game Type")}</label>
        <select name="game_type" id="game-type-select">
          <option value="chess"${defaultGameType === "chess" ? " selected" : ""}>${Trans.t("robot.chess", "Chess")}</option>
          <option value="doudizhu"${defaultGameType === "doudizhu" ? " selected" : ""}>${Trans.t("robot.doudizhu", "Doudizhu")}</option>
        </select>
      </div>
      <div class="form-group">
        <label>${Trans.t("robot.provider", "AI Provider")}</label>
        <select name="provider" id="provider-select" required>
          <option value="">${Trans.t("robot.select_provider", "Select Provider")}</option>
        </select>
        <a href="#" id="provider-topup-link" target="_blank" style="display:none; font-size: 12px; color: #3498db; margin-top: 4px;">
          ${Trans.t("robot.topup", "Top up balance")} →
        </a>
      </div>
      <div class="form-group" id="base-url-group" style="display: none;">
        <label>${Trans.t("robot.base_url", "Base URL")}</label>
        <input type="text" name="base_url" id="base-url-input" placeholder="https://api.example.com/v1" />
        <small style="color: #7f8c8d; font-size: 11px;">${Trans.t("robot.base_url_hint", "Custom API endpoint for OpenAI-compatible services")}</small>
      </div>
      <div class="form-group" id="api-key-group">
        <label>${Trans.t("robot.api_key", "API Key")}</label>
        <input type="password" name="api_key" placeholder="${Trans.t("robot.api_key_placeholder", "Enter your API key")}" />
        <small style="color: #7f8c8d; font-size: 11px;">${Trans.t("robot.api_key_hint", "Your API key is encrypted and stored securely. Cannot be modified after creation.")}</small>
      </div>
      <div class="form-group" id="model-group">
        <label>${Trans.t("robot.model", "AI Model")}</label>
        <select name="model" id="model-select">
          <option value="">${Trans.t("robot.select_model", "Select Model")}</option>
        </select>
        <input type="text" id="custom-model-input" name="custom_model" placeholder="${Trans.t("robot.custom_model_placeholder", "Enter custom model name")}" style="display: none; margin-top: 8px;" />
      </div>
      <div class="form-group" id="free-model-label" style="display:none;">
        <label>${Trans.t("robot.model", "AI Model")}</label>
        <div style="padding: 8px 12px; background: #eafaf1; border: 1px solid #2ecc71; border-radius: 6px; font-size: 13px; color: #27ae60;">
          ✅ DeepSeek V3 — ${Trans.t("robot.free_provided", "免费，由平台提供")}
        </div>
      </div>
      <div class="form-group">
        <label id="strategy-label">${Trans.t("robot.chess_strategy", "Chess Strategy")}</label>
        <textarea name="strategy" rows="4" placeholder="${Trans.t("robot.strategy_placeholder", "Describe your robot's game strategy...")}"></textarea>
        <button type="button" class="btn btn-sm btn-outline mt-1" id="use-default-strategy">
          ${Trans.t("robot.use_default", "Use Default Strategy")}
        </button>
      </div>
      <button type="submit" id="create-robot-submit" class="btn btn-primary btn-full">${Trans.t("robot.create_btn", "Create Robot")}</button>
    </form>
  </div>
</div>`;
  }

  private bindCreateForm(): void {
    // Open modal
    this.container.querySelector("#open-create-modal")?.addEventListener("click", () => {
      const maxRobots = (Config.get("robot_max_per_user") as number) || 3;
      if (this.robotCount >= maxRobots) {
        Toast.error(Trans.t("robot.limit_reached", "Reached maximum robot limit."));
        return;
      }

      const modal = document.getElementById("create-robot-modal");
      if (modal) modal.classList.remove("hidden");

      // 设置默认游戏类型和策略标签
      const lang = Trans.getLang();
      const gameTypeSelect = document.getElementById("game-type-select") as HTMLSelectElement;
      const label = document.querySelector("#strategy-label");

      if (gameTypeSelect && label) {
        const defaultGameType = lang === "zh" ? "doudizhu" : "chess";
        gameTypeSelect.value = defaultGameType;
        label.textContent = defaultGameType === "doudizhu"
          ? Trans.t("robot.doudizhu_strategy", "Doudizhu Strategy")
          : Trans.t("robot.chess_strategy", "Chess Strategy");
      }
    });

    // Close modal
    const closeModal = () => {
      const modal = document.getElementById("create-robot-modal");
      if (modal) modal.classList.add("hidden");
    };

    document.getElementById("close-create-modal")?.addEventListener("click", closeModal);

    // 移除点击遮罩层关闭的功能，只能点叉关闭

    // Game type change handler
    this.container.querySelector("#game-type-select")?.addEventListener("change", (e) => {
      const gameType = (e.target as HTMLSelectElement).value;
      const label = document.querySelector("#strategy-label");
      if (label) {
        label.textContent = gameType === "doudizhu"
          ? Trans.t("robot.doudizhu_strategy", "Doudizhu Strategy")
          : Trans.t("robot.chess_strategy", "Chess Strategy");
      }
    });

    document.querySelector("#create-robot-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const modelSelect = document.getElementById("model-select") as HTMLSelectElement;
      const customModelInput = document.getElementById("custom-model-input") as HTMLInputElement;
      const providerSelect = document.getElementById("provider-select") as HTMLSelectElement;

      // If custom model is selected, use the custom input value
      if ((modelSelect.value === "__custom__" || providerSelect.value === "openai-compatible") && customModelInput.value.trim()) {
        const customOption = document.createElement("option");
        customOption.value = customModelInput.value.trim();
        customOption.selected = true;
        modelSelect.appendChild(customOption);
      }

      AppLogic.onCreateRobot(form);
    });

    document.querySelector("#use-default-strategy")?.addEventListener("click", () => {
      const ta = document.querySelector<HTMLTextAreaElement>("textarea[name=strategy]");
      const gameTypeSelect = document.getElementById("game-type-select") as HTMLSelectElement;
      if (!ta) return;
      const gameType = gameTypeSelect?.value || "chess";
      ta.value = gameType === "doudizhu"
        ? Trans.t("robot.default_strategy_doudizhu", "")
        : Trans.t("robot.default_strategy_chess", "");
    });
  }

  private bindEvents(): void {
    const btn = document.getElementById("create-robot-submit") as HTMLButtonElement;
    const form = document.getElementById("create-robot-form") as HTMLFormElement;
    const customModelInput = document.getElementById("custom-model-input") as HTMLInputElement;

    EventTool.on("robot_create_start", () => {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="loading-spinner"></span> ${Trans.t("robot.creating", "Creating...")}`;
      }
    });

    EventTool.on("robot_create_success", () => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = Trans.t("robot.create_btn", "Create Robot");
      }
      // Success: close and reset
      const modal = document.getElementById("create-robot-modal");
      if (modal) modal.classList.add("hidden");
      if (form) form.reset();
      if (customModelInput) customModelInput.style.display = "none";
    });

    EventTool.on("robot_create_error", () => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = Trans.t("robot.create_btn", "Create Robot");
      }
      // Error: keep modal open
    });
  }

  private renderRobots(robots: Array<Record<string, unknown>>): void {
    this.robotCount = robots.length;
    const el = this.container.querySelector("#robot-list");
    if (!el) return;
    if (!robots.length) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🤖</div>
          <div class="empty-title">${Trans.t("robot.empty_title", "还没有机器人")}</div>
          <div class="empty-text">${Trans.t("robot.empty_text", "点击上方按钮创建你的第一个 AI 机器人")}</div>
        </div>`;
      return;
    }
    el.innerHTML = `<div class="robots-grid">${robots.map((r) => this.renderRobotCard(r)).join("")}</div>`;
    this.bindRobotActions();
  }

  private renderRobotCard(r: Record<string, unknown>): string {
    const suspended = r.status === "suspended";
    const inGame = r.in_game as boolean;
    const gameType = r.game_type as string;
    const gameIcon = gameType === "doudizhu" ? "🃏" : "♟";
    const gameLabel = gameType === "doudizhu" ? Trans.t("robot.doudizhu", "斗地主") : Trans.t("robot.chess", "国际象棋");
    const todayMatches = r.today_matches as number || 0;
    const maxDailyMatches = r.max_daily_matches as number || 30;
    const errorCount = r.error_count as number || 0;
    const provider = r.provider as string || "unknown";

    const currentMatchId = r.current_match_id as number | null;
    let statusText = "";
    let statusClass = "";
    if (suspended) {
      statusText = Trans.t("robot.status_stopped", "已暂停");
      statusClass = "status-text-stopped";
    } else if (inGame) {
      const label = Trans.t("robot.status_in_game", "对局中");
      statusText = currentMatchId
        ? `<a href="#/match/${currentMatchId}" style="color:inherit;text-decoration:underline;cursor:pointer;">${label} →</a>`
        : label;
      statusClass = "status-text-ingame";
    } else {
      statusText = Trans.t("robot.status_waiting", "已启用，正在等待对局匹配");
      statusClass = "status-text-waiting";
    }

    return `
<div class="robot-card-new ${suspended ? 'robot-suspended' : ''}" data-id="${r.id}">
  <div class="robot-card-header">
    <div class="robot-game-badge ${gameType}">${gameIcon}</div>
    <div class="robot-status-badge ${suspended ? 'status-suspended' : 'status-active'}">
      ${suspended ? '⏸' : '▶'}
    </div>
  </div>

  <div class="robot-card-body">
    <h3 class="robot-name">${r.name}</h3>
    <div class="robot-game-type">${gameLabel}</div>

    ${suspended && errorCount >= 5 ? `
    <div class="robot-error-notice" style="background: #fee; border: 1px solid #fcc; padding: 8px; border-radius: 4px; margin: 8px 0; font-size: 12px; color: #c33;">
      ⚠️ ${Trans.t("robot.api_error", "API连续失败5次，已暂停")}
    </div>
    ` : ''}

    <div class="robot-daily-limit">
      <span class="daily-limit-label">${Trans.t("robot.today_matches", "今日对局")}</span>
      <span class="daily-limit-value">${todayMatches}/${maxDailyMatches}</span>
    </div>

    <div class="robot-meta">
      <div class="robot-meta-item">
        <span class="robot-meta-label">${Trans.t("robot.provider", "Provider")}</span>
        <span class="robot-meta-value">${provider}</span>
      </div>
      <div class="robot-meta-item">
        <span class="robot-meta-label">${Trans.t("robot.model", "Model")}</span>
        <span class="robot-meta-value">${r.model}</span>
      </div>
      <div class="robot-meta-item">
        <span class="robot-meta-label">${Trans.t("robot.elo", "ELO")}</span>
        <span class="robot-meta-value">${r.elo}</span>
      </div>
      <div class="robot-meta-item">
        <span class="robot-meta-label">${Trans.t("robot.record", "战绩")}</span>
        <span class="robot-meta-value">${r.wins}W ${r.losses}L ${r.draws}D</span>
      </div>
    </div>

    ${r.strategy ? `<div class="robot-strategy-wrapper">
      <button class="btn-strategy-toggle" data-id="${r.id}" title="${Trans.t("robot.view_strategy", "查看策略")}">🔒</button>
      <div class="robot-strategy-preview" id="strategy-${r.id}" style="display:none">"${(r.strategy as string).slice(0, 80)}${(r.strategy as string).length > 80 ? '...' : ''}"</div>
    </div>` : ''}
    <div class="robot-status-row ${statusClass}">${statusText}</div>
  </div>

  <div class="robot-card-footer">
    ${suspended
        ? `<button class="btn-card btn-card-primary activate-btn" data-id="${r.id}">
          <span>▶</span> ${Trans.t("robot.activate", "启用")}
        </button>`
        : `<button class="btn-card btn-card-secondary suspend-btn" data-id="${r.id}">
          <span>⏸</span> ${Trans.t("robot.suspend", "暂停")}
        </button>`
      }
    <button class="btn-card btn-card-danger delete-btn" data-id="${r.id}">
      <span>🗑</span> ${Trans.t("robot.delete", "删除")}
    </button>
  </div>
</div>`;
  }

  private bindRobotActions(): void {
    this.container.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        AppLogic.onDeleteRobot(Number((btn as HTMLElement).dataset.id));
      });
    });
    this.container.querySelectorAll(".activate-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        AppLogic.onActivateRobot(Number((btn as HTMLElement).dataset.id));
      });
    });
    this.container.querySelectorAll(".suspend-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        AppLogic.onSuspendRobot(Number((btn as HTMLElement).dataset.id));
      });
    });
    this.container.querySelectorAll(".btn-strategy-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.id;
        const preview = document.getElementById(`strategy-${id}`);
        if (!preview) return;
        const hidden = preview.style.display === "none";
        preview.style.display = hidden ? "block" : "none";
        (btn as HTMLElement).textContent = hidden ? "🔓" : "🔒";
      });
    });
  }
}
