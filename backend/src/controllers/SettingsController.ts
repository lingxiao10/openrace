// ============================================================
// SettingsController.ts
// ============================================================
import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";

export class SettingsController {
  static async getBalance(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetBalance(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async getBalanceLog(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetBalanceLog(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async getSettings(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetSettings(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async saveSettings(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleSaveSettings(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
}
