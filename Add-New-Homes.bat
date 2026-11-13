@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Adding the new house pictures from the Pic folder to the Avatar shop ...
echo.
node scripts\add-new-homes.mjs
if errorlevel 1 goto failed
echo.
pause
exit /b 0

:failed
echo.
echo  SOMETHING WENT WRONG - please copy what is written above and send it to Claude.
echo.
pause
exit /b 1
