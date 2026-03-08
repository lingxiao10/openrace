// ============================================================
// GameController.ts
// ============================================================
import { Request, Response as ExpressResponse } from "express";
import { AppLogic } from "../AppLogic";

export class GameController {
  static async listRecent(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetRecentMatches(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async listMine(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetMyMatches(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async getMatch(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetMatch(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
  static async getMoves(req: Request, res: ExpressResponse): Promise<void> {
    try {
      res.json(await AppLogic.handleGetMatchMoves(req));
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message || "Internal server error", data: null });
    }
  }
}
