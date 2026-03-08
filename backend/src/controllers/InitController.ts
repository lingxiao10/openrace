// ============================================================
// InitController.ts — Sends config + i18n to the frontend.
// Called once on app startup by the frontend.
// ============================================================

import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";

export class InitController {
  static async getInit(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const lang = (req.query.lang as string) || undefined;
      const result = AppLogic.handleInit(lang);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message || "Internal server error",
        data: null
      });
    }
  }
}
