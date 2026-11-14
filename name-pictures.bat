@echo off
chcp 65001 >nul
cd /d "%~dp0"
node scripts\name-pictures.mjs %*
echo.
pause
