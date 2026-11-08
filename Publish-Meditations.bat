@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Publishing the meditation texts and audio files ...
echo  (src\meditations and the audio folder only - nothing else is touched)
echo.

git add -A -- "src/meditations" "audio"
git diff --cached --quiet -- "src/meditations" "audio"
if not errorlevel 1 (
  echo  Nothing new to publish. All the meditation files are already up.
  echo.
  pause
  exit /b 0
)

git commit -m "Meditations: new text and audio files" -- "src/meditations" "audio"
if errorlevel 1 goto failed

git pull --rebase --autostash origin main
if errorlevel 1 goto failed

git push origin main
if errorlevel 1 goto failed

echo.
echo  DONE. The files are on GitHub.
echo  The website updates by itself in about 2-3 minutes - then close the app and open it again.
echo.
pause
exit /b 0

:failed
echo.
echo  SOMETHING WENT WRONG - nothing was lost, but the files are not published.
echo  Please copy what is written above and send it to Claude.
echo.
pause
exit /b 1
