@echo off
chcp 65001 >nul
cd /d "%~dp0"
:menu
cls
echo.
echo  ============================================================
echo    ADD NEW LESSONS  (SmartStudy / Abhidhamma)
echo    Do the numbers in this order, from the top.
echo  ============================================================
echo.
echo    TEXT
echo      1  Make the lessons file          (articles .md / .txt  -^>  .json)
echo.
echo    PICTURES
echo      2  Split the picture sheets into single pictures
echo      3  Save pictures one by one under the right names   (only if you make them one at a time)
echo      4  Upload the pictures to GitHub   (for lessons made in the Canvas apps)
echo.
echo    PUT THE LESSONS IN THE APP
echo      5  Look first            (changes nothing)
echo      6  Add to the app        (upload pictures + load lessons)
echo      7  Put the Canvas age versions (backup .json) into a class, with the pictures
echo.
echo      8  Open the guide  (Burmese, step by step)
echo      0  Exit
echo.
set /p c=  Type a number: 
if "%c%"=="1" call make-lessons.bat & goto menu
if "%c%"=="2" call split-sheets.bat & goto menu
if "%c%"=="3" call name-pictures.bat & goto menu
if "%c%"=="4" call add-lessons.bat --pictures-only & goto menu
if "%c%"=="5" call add-lessons.bat --dry & goto menu
if "%c%"=="6" call add-lessons.bat & goto menu
if "%c%"=="7" call merge-variants.bat & goto menu
if "%c%"=="8" start "" notepad "%~dp0Lessons\START-HERE.txt" & goto menu
if "%c%"=="0" exit /b
goto menu
