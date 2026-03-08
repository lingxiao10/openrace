import { DbTool } from "./src/tools/DbTool";
import * as fs from "fs";

async function run() {
    try {
        const columns = await DbTool.query<any>("SHOW COLUMNS FROM robots;");
        let out = "Columns in robots table:\n";
        columns.forEach(c => out += `- ${c.Field} (${c.Type})\n`);
        fs.writeFileSync("columns_out.txt", out);
        process.exit(0);
    } catch (err: any) {
        fs.writeFileSync("columns_out.txt", "Error: " + err.message);
        process.exit(1);
    }
}

run();
