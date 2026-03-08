// ============================================================
// Response.ts — Standard HTTP response envelope.
// Every API response uses this shape so the frontend can
// handle it uniformly via the action protocol.
// ============================================================

import { Action, ActionItem } from "./Action";
import { Trans } from "./Trans";

export interface StandardResponse<T = unknown> {
  code: number;          // 0 = success, non-zero = error
  message: string;       // i18n message
  data: T | null;        // business payload
  action_list: ActionItem[]; // frontend instructions
}

export class Response {
  static success<T>(data: T | null = null, messageKey = "sys.success"): StandardResponse<T> {
    return {
      code: 0,
      message: Trans.t(messageKey),
      data,
      action_list: Action.flush(),
    };
  }

  static error(
    code: number,
    messageKey: string,
    data: unknown = null
  ): StandardResponse<null> {
    Action.clear(); // discard any queued actions on error
    return {
      code,
      message: Trans.t(messageKey),
      data: null,
      action_list: [],
    };
  }

  static unauthorized(): StandardResponse<null> {
    return Response.error(401, "sys.unauthorized");
  }

  static notFound(): StandardResponse<null> {
    return Response.error(404, "sys.not_found");
  }

  static paramError(): StandardResponse<null> {
    return Response.error(400, "sys.param_error");
  }

  static forbidden(): StandardResponse<null> {
    return Response.error(403, "sys.forbidden");
  }
}
