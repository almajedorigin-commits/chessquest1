@echo off
REM ChessQuest -- one-click local launcher for Windows.
REM Double-click this file to play locally. It installs dependencies the first
REM time, starts the local server, and opens your browser automatically.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Please install the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo First-time setup: installing dependencies. This may take a minute...
  call npm install
)

echo Starting ChessQuest at http://localhost:5273 ...
REM Wait a few seconds, then open the browser to the fixed port.
start "" /b cmd /c "timeout /t 4 >nul & start "" http://localhost:5273"
call npm run dev
pause
