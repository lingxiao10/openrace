// ============================================================
// LogController.ts
// ============================================================
import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";

export class LogController {
  static getLogs(req: Request, res: ExpressResponse): void {
    try {
      res.json(AppLogic.handleGetLogs(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
}
