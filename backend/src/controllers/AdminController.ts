// ============================================================
// AdminController.ts — HTTP adapter for admin routes.
// ============================================================

import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";

export class AdminController {
  static async getUsers(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await AppLogic.handleAdminGetUsers(req);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }

  static async getRobots(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await AppLogic.handleAdminGetRobots(req);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
}
