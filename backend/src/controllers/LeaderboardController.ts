// ============================================================
// LeaderboardController.ts
// ============================================================
import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";

export class LeaderboardController {
  static async get(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetLeaderboard(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
}
