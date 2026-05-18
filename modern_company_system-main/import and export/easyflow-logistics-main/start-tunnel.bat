@echo off
echo Starting Easyflow Logistics Local Server and Permanent Tunnel...
echo.
echo Installing dependencies if needed...
call npm install -g localtunnel

echo.
echo Starting Vite Dev Server...
start cmd /k "npm run dev -- --host"

echo.
echo Waiting for server to start...
timeout /t 5

echo.
echo Starting Permanent Localtunnel (will stay open as long as this window is open)...
echo Your persistent URL will be: https://easyflow-app-test.loca.lt
echo (Remember to click "Click to Continue" when you open the link for the first time)
echo.
:loop
npx localtunnel --port 8083 --local-host 127.0.0.1 --subdomain easyflow-app-test
echo Tunnel disconnected. Restarting in 5 seconds...
timeout /t 5
goto loop
