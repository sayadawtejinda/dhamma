@echo off
chcp 65001 >nul
cd /d "%~dp0"
:menu
cls
echo.
echo  ============================================================
echo    ADD NEW LESSONS  (SmartStudy / Abhidhamma)
echo  ============================================================
echo.
echo    Do the steps in this order:
echo.
echo    1  Make the lessons file with Gemini   (notebook .txt  -^>  .json)
echo    2  Split the picture sheets into single pictures
echo    3  Add to the app   (upload pictures + load lessons)
echo    4  Same as 3 but only LOOK (changes nothing)
echo    5  Open the guide (Burmese, step by step)
echo    0  Exit
echo.
set /p c=  Type a number: 
if "%c%"=="1" call make-lessons.bat & goto menu
if "%c%"=="2" call split-sheets.bat & goto menu
if "%c%"=="3" call add-lessons.bat & goto menu
if "%c%"=="4" call add-lessons.bat --dry & goto menu
if "%c%"=="5" start "" notepad "%~dp0HOW_TO_ADD_LESSONS.txt" & goto menu
if "%c%"=="0" exit /b
goto menu
