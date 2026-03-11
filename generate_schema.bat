@echo off
cd /d "%~dp0backend"
npx ts-node src/tools/GenerateSchemaTool.ts
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Schema generation failed.
    pause
    exit /b 1
)
echo.
echo [OK] Done. Check backend/schema_generated.sql
pause
