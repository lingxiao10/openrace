// ============================================================
// EmailTool.ts — Email sending via Resend API
// ============================================================

import { LogCenter } from "../log/LogCenter";
import fs from "fs";
import path from "path";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface SecretJson {
  resend_api_key?: string;
  resend_from?: string;
}

function loadSecrets(): SecretJson {
  const secretPath = path.resolve(__dirname, "../../../secret_json.json");
  try {
    if (fs.existsSync(secretPath)) {
      return JSON.parse(fs.readFileSync(secretPath, "utf-8")) as SecretJson;
    }
    return {};
  } catch (err) {
    return {};
  }
}

const secrets = loadSecrets();

export class EmailTool {
  private static readonly RESEND_API_URL = "https://api.resend.com/emails";

  static async send(options: EmailOptions): Promise<boolean> {
    const apiKey = secrets.resend_api_key || "";
    const from = secrets.resend_from || "noreply@example.com";

    if (!apiKey) {
      LogCenter.error("EmailTool", "RESEND_API_KEY not configured");
      return false;
    }

    try {
      const response = await fetch(EmailTool.RESEND_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        LogCenter.error("EmailTool", `Failed to send email: ${response.status} ${text}`);
        return false;
      }

      LogCenter.info("EmailTool", `Email sent to ${options.to}`);
      return true;
    } catch (err: any) {
      LogCenter.error("EmailTool", `Email send error: ${err.message}`);
      return false;
    }
  }

  static async sendRobotSuspendedNotification(
    userEmail: string,
    robotName: string,
    reason: string
  ): Promise<boolean> {
    const subject = "Robot Suspended - AI Chess Arena";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">🤖 Robot Suspended</h2>
        <p>Your robot <strong>${robotName}</strong> has been suspended due to API errors.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Your robot has encountered 5 consecutive API failures. This usually means:</p>
        <ul>
          <li>API key is invalid or expired</li>
          <li>Insufficient balance/quota in your AI provider account</li>
          <li>Network or service issues</li>
        </ul>
        <p><strong>What to do:</strong></p>
        <ol>
          <li>Check your AI provider account balance and API key</li>
          <li>Top up your account if needed</li>
          <li>Click "Activate" button in the robot management page to test and reactivate</li>
        </ol>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
          This is an automated message from AI Chess Arena. Please do not reply to this email.
        </p>
      </div>
    `;

    return EmailTool.send({ to: userEmail, subject, html });
  }
}
