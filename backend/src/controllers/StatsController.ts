// ============================================================
// StatsController.ts
// ============================================================
import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";

export class StatsController {
  static async getStats(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetStats(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }

  static async getTicks(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetTicks(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
}
