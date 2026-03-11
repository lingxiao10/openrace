#!/bin/bash
cd "$(dirname "$0")/backend"
npx ts-node src/tools/GenerateSchemaTool.ts
if [ $? -ne 0 ]; then
    echo
    echo "[ERROR] Schema generation failed."
    exit 1
fi
echo
echo "[OK] Done. Check backend/schema_generated.sql"
