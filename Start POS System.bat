@echo off
title Ddotsmedia POS System - Starting...
color 1F
cls

echo.
echo  ============================================
echo    Ddotsmedia POS System - Launcher
echo  ============================================
echo.

SET ROOT=%~dp0
SET SERVER_DIR=%ROOT%server
SET CLIENT_DIR=%ROOT%client
SET DESKTOP_DIR=%ROOT%desktop

REM ── Step 1: Docker / PostgreSQL ───────────────────────────────────────────
echo  [1/4] Checking database...
docker start pos-db >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo       Starting PostgreSQL via Docker Compose...
  cd /d "%ROOT%"
  docker-compose up -d postgres >nul 2>&1
  timeout /t 5 /nobreak >nul
)
echo       Database OK

REM ── Step 2: Backend API ───────────────────────────────────────────────────
echo  [2/4] Starting backend API (port 5100)...
REM Check if already running
curl -s http://localhost:5100/health >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
  echo       Backend already running
) ELSE (
  cd /d "%SERVER_DIR%"
  IF EXIST dist\src\main.js (
    start "POS Backend" /MIN cmd /c "node dist/src/main.js"
  ) ELSE (
    start "POS Backend" /MIN cmd /c "npm run start:prod"
  )
  echo       Waiting for backend...
  :wait_backend
  timeout /t 2 /nobreak >nul
  curl -s http://localhost:5100/health >nul 2>&1
  IF %ERRORLEVEL% NEQ 0 GOTO wait_backend
  echo       Backend started
)

REM ── Step 3: Admin Panel ───────────────────────────────────────────────────
echo  [3/4] Starting admin panel (port 3001)...
curl -s http://localhost:3001 >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
  echo       Admin panel already running
) ELSE (
  cd /d "%CLIENT_DIR%"
  IF EXIST .next\BUILD_ID (
    start "POS Admin Panel" /MIN cmd /c "npm run start -- -p 3001"
  ) ELSE (
    start "POS Admin Panel" /MIN cmd /c "npm run dev -- -p 3001"
  )
  echo       Admin panel starting...
  timeout /t 6 /nobreak >nul
)

REM ── Step 4: Desktop App ───────────────────────────────────────────────────
echo  [4/4] Launching POS Desktop App...
cd /d "%DESKTOP_DIR%"
echo.
echo  ============================================
echo    All services running:
echo    POS Desktop   : This window
echo    Admin Panel   : http://localhost:3001
echo    API           : http://localhost:5100
echo  ============================================
echo.
node launch.js
