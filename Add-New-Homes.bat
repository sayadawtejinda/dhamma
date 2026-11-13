@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem ===== PRICES (change the numbers here, then save) ==================================
rem  Every new house costs this many coins:
set HOME_COST=12000
rem  OPTIONAL: one price per new picture, in order (oldest picture first). Leave empty to use the price above.
rem  Example:  set HOME_PRICES=10000 12000 15000
set HOME_PRICES=
rem =====================================================================================

echo.
echo  Adding the new house pictures from the Pic folder to the Avatar shop ...
echo  Price for each new house: %HOME_COST% coins   (list: %HOME_PRICES%)
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
