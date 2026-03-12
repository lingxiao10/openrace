// ============================================================
// UserController.ts — HTTP adapter for user routes.
// Calls AppLogic (the index). Never contains business logic.
// ============================================================

import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";

export class UserController {
  static async login(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await AppLogic.handleUserLogin(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message || "Internal server error",
        data: null
      });
    }
  }

  static async register(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await AppLogic.handleUserRegister(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message || "Internal server error",
        data: null
      });
    }
  }

  static async sendVerificationCode(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await AppLogic.handleSendVerificationCode(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }

  static async getProfile(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await AppLogic.handleGetProfile(req);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }

  static async changePassword(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await AppLogic.handleChangePassword(req);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
}
