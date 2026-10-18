@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Summary admin ^(အနှစ်ချုပ် ထည့်ရန်^) is starting ...
echo  A page opens in your browser. Close this window to stop.
echo.
python scripts\library\summary_admin.py
pause
