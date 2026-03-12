// ============================================================
// AdminController.ts — HTTP adapter for admin routes.
// ============================================================

import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";
import { LogCenter } from "../log/LogCenter";

export class AdminController {
  static async getUsers(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await AppLogic.handleAdminGetUsers(req);
      res.json(result);
    } catch (error: any) {
      LogCenter.error("AdminController", `getUsers failed: ${error.message}`, { stack: error.stack, query: req.query });
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }

  static async getRobots(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await AppLogic.handleAdminGetRobots(req);
      res.json(result);
    } catch (error: any) {
      LogCenter.error("AdminController", `getRobots failed: ${error.message}`, { stack: error.stack, query: req.query });
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
}
