#!/usr/bin/env bash
# ChessQuest -- one-click local launcher for macOS / Linux.
# On macOS you can double-click this file (you may need to allow it the first
# time via System Settings > Privacy & Security). On Linux, run ./start.command.

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Please install the LTS version from https://nodejs.org and run this again."
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "First-time setup: installing dependencies. This may take a minute..."
  npm install
fi

URL="http://localhost:5273"
echo "Starting ChessQuest at $URL ..."

# Wait until the server actually responds before opening the browser, so the
# first run (which may still be installing) doesn't open a dead page.
( for i in $(seq 1 60); do
    if curl -s -o /dev/null "$URL" 2>/dev/null; then break; fi
    sleep 1
  done
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
  fi
) &

npm run dev
