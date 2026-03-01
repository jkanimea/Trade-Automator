@echo off
echo Starting AlgoTrade Pro Development Environment...
echo.
echo Backend (API) will be available at http://localhost:5000
echo Frontend will be available at http://localhost:3000
echo.
echo Press Ctrl+C to stop all services
echo.

cd server
start "Backend Server" cmd /k "node test-server.js"
timeout /t 2 /nobreak >nul

cd ..\client
start "Frontend Server" cmd /k "vite"
timeout /t 2 /nobreak >nul

echo.
echo Services started! Check the browser windows that opened.
echo.
echo To stop: close the terminal windows or press Ctrl+C in each window.