// ============================================================
// RobotController.ts
// ============================================================
import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";

export class RobotController {
  static async create(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleCreateRobot(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async list(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetRobots(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async update(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleUpdateRobot(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async remove(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleDeleteRobot(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async activate(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleActivateRobot(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
}
