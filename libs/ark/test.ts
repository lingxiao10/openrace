// 运行: cd libs/ark && npx ts-node test.ts
import * as fs from "fs";
import * as path from "path";
import { ArkClient, ARK_MODELS } from "./ArkClient";

const secretPath = path.resolve(__dirname, "../../secret_json.json");
const secrets = JSON.parse(fs.readFileSync(secretPath, "utf-8"));
const API_KEY: string = secrets.ark_api_key;
if (!API_KEY) throw new Error("ark_api_key not found in secret_json.json");

async function main() {
  const client = new ArkClient(API_KEY);

  console.log("Testing Ark API...\n");

  const result = await client.ask(
    ARK_MODELS.SEED_2_0_MINI,
    "You are a helpful assistant.",
    "请直接输出数字：42"
  );

  console.log("Response:", result.content);
  console.log(`Tokens: ${result.promptTokens} in / ${result.completionTokens} out`);
  console.log(`Cost: $${result.costUsd.toFixed(6)}`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
