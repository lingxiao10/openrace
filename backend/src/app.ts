// ============================================================
// app.ts — Express entry point. Wires routes to controllers.
// ============================================================

import express from "express";
import cors from "cors";
import { DbTool } from "./tools/DbTool";
import { MatchLogTool } from "./tools/MatchLogTool";
import { LogCenter } from "./log/LogCenter";
import { UserController } from "./controllers/UserController";
import { InitController } from "./controllers/InitController";
import { RobotController } from "./controllers/RobotController";
import { GameController } from "./controllers/GameController";
import { LeaderboardController } from "./controllers/LeaderboardController";
import { SettingsController } from "./controllers/SettingsController";
import { LogController } from "./controllers/LogController";
import { StatsController } from "./controllers/StatsController";
import { AdminController } from "./controllers/AdminController";
import { GameScheduler } from "./scheduler/GameScheduler";
import { AppLogic } from "./AppLogic";
import config from "./config/config";

const app = express();

// Initialize match logging directory
MatchLogTool.init();

app.use(cors({ origin: config.server.corsOrigins }));
app.use(express.json());

app.use((req, _res, next) => {
  LogCenter.request(req.method, req.path, req.body);
  next();
});

const api = config.server.apiPrefix;

// ---- Init ----
app.get(`${api}/init`, InitController.getInit);

// ---- Auth ----
app.post(`${api}/user/login`,     UserController.login);
app.post(`${api}/user/register`,  UserController.register);
app.post(`${api}/user/send-code`, UserController.sendVerificationCode);
app.get(`${api}/user/profile`,         UserController.getProfile);
app.post(`${api}/user/change-password`, UserController.changePassword);

// ---- Robot ----
app.post(`${api}/robot`,              RobotController.create);
app.get(`${api}/robot`,               RobotController.list);
app.put(`${api}/robot/:id`,           RobotController.update);
app.delete(`${api}/robot/:id`,        RobotController.remove);
app.post(`${api}/robot/:id/activate`, RobotController.activate);

// ---- Match ----
app.get(`${api}/match`,              GameController.listRecent);
app.get(`${api}/match/my`,           GameController.listMine);
app.get(`${api}/match/:id`,          GameController.getMatch);
app.get(`${api}/match/:id/moves`,    GameController.getMoves);

// ---- Leaderboard ----
app.get(`${api}/leaderboard`, LeaderboardController.get);

// ---- Balance & Settings ----
app.get(`${api}/balance`,      SettingsController.getBalance);
app.get(`${api}/balance/log`,  SettingsController.getBalanceLog);
app.get(`${api}/settings`,     SettingsController.getSettings);
app.post(`${api}/settings`,    SettingsController.saveSettings);

// ---- Stats / Game Center ----
app.get(`${api}/stats`,       StatsController.getStats);
app.get(`${api}/stats/ticks`, StatsController.getTicks);

// ---- Admin ----
app.get(`${api}/admin/users`,  AdminController.getUsers);
app.get(`${api}/admin/robots`, AdminController.getRobots);

// ---- Logs ----
app.get(`${api}/logs`, LogController.getLogs);

// ---- Example ----
app.post(`${api}/action`, (req, res) => {
  res.json(AppLogic.handleExampleAction(req.body));
});

// ---- Start ----
DbTool.init();
GameScheduler.start();

app.listen(config.server.port, () => {
  LogCenter.info("App", `Server running on port ${config.server.port}`);
});

export default app;
