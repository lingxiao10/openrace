// ============================================================
// Trans.ts — Frontend i18n.
//
// 三种使用方式：
//   Trans.init(lang)         — 启动时用本地翻译文件初始化（即时）
//   Trans.load(map, lang)    — 后端返回翻译时合并覆盖（可选增强）
//   Trans.switch(lang)       — 切换语言，立即生效，触发 lang_changed 事件
//   Trans.t("key", fallback) — 取翻译文本
//   Trans.applyToDOM()       — 更新 [data-i18n] 元素
// ============================================================

import { zh } from "../i18n/zh";
import { en } from "../i18n/en";

const LOCAL_MAPS: Record<string, Record<string, string>> = { zh, en };

export class Trans {
  private static _map: Record<string, string> = {};
  private static _lang = "zh";

  /** 启动时立即用本地翻译初始化，无需等待后端 */
  static init(lang: string): void {
    Trans._lang = lang in LOCAL_MAPS ? lang : "zh";
    Trans._map  = { ...LOCAL_MAPS[Trans._lang] };
    Trans.applyToDOM();
  }

  /** 后端返回翻译时调用，将后端条目合并到本地翻译上（后端优先） */
  static load(map: Record<string, string>, lang: string): void {
    Trans._lang = lang in LOCAL_MAPS ? lang : "zh";
    Trans._map  = { ...LOCAL_MAPS[Trans._lang], ...map };
    Trans.applyToDOM();
  }

  /** 切换语言，立即生效（使用本地翻译，无需 API 调用），并派发 lang_changed 事件 */
  static switch(lang: string): void {
    Trans._lang = lang in LOCAL_MAPS ? lang : "zh";
    Trans._map  = { ...LOCAL_MAPS[Trans._lang] };
    Trans.applyToDOM();
    document.dispatchEvent(new CustomEvent("lang_changed", { detail: { lang: Trans._lang } }));
  }

  /** 获取翻译文本 */
  static t(key: string, fallback?: string): string {
    return Trans._map[key] ?? fallback ?? key;
  }

  static getLang(): string {
    return Trans._lang;
  }

  static isLoaded(): boolean {
    return Object.keys(Trans._map).length > 0;
  }

  /** 遍历页面中带 data-i18n 属性的元素，立即更新文本 */
  static applyToDOM(): void {
    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n!;
      const val = Trans._map[key];
      if (val !== undefined) el.textContent = val;
    });
  }
}
