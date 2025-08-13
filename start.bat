@echo off
title Process Flow Designer - Local Server

echo 🚀 Starting Process Flow Designer...
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

REM Change to script directory
cd /d "%~dp0"

REM Start the server
echo 🌐 Starting server on http://localhost:3000
echo 📁 Serving files from: %CD%
echo.

REM Start server with proper error handling
node server.js
if errorlevel 1 (
    echo ❌ Server stopped with error code %errorlevel%
) else (
    echo ✅ Server stopped gracefully
)

pause