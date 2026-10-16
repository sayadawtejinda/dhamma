@echo off
cd /d "%~dp0"
node scripts\add-lessons.mjs %*
echo.
pause
