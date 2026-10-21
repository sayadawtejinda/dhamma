@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Song admin is starting ...
echo  A page opens in your browser. Close this window to stop.
echo.
python scripts\songs\songs_admin.py
pause
