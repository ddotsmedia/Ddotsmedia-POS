@echo off
title Ddotsmedia POS - First Time Setup
color 1F
cls

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   Ddotsmedia POS System - Setup Wizard    ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  This will install and configure the full POS system.
echo  Estimated time: 3-5 minutes
echo.
pause

SET ROOT=%~dp0

REM ── Install root dependencies ─────────────────────────────────────────────
echo.
echo [1/6] Installing root dependencies...
cd /d "%ROOT%"
call npm install --silent

REM ── Install server dependencies ───────────────────────────────────────────
echo [2/6] Setting up backend server...
cd /d "%ROOT%server"
call npm install --silent
IF NOT EXIST .env (
  copy .env.example .env >nul 2>&1
  echo       Created server .env from template
)

REM ── Start PostgreSQL ──────────────────────────────────────────────────────
echo [3/6] Starting PostgreSQL database...
cd /d "%ROOT%"
docker-compose up -d postgres
timeout /t 8 /nobreak >nul
echo       Database started

REM ── Run migrations and seed ───────────────────────────────────────────────
echo [4/6] Running database migrations and seeding...
cd /d "%ROOT%server"
call npx prisma migrate deploy
call npx prisma db seed
echo       Database initialized

REM ── Install and build client ──────────────────────────────────────────────
echo [5/6] Setting up admin panel...
cd /d "%ROOT%client"
call npm install --silent
IF NOT EXIST .env.local (
  echo NEXT_PUBLIC_API_URL=http://localhost:5100 > .env.local
)
call npm run build
echo       Admin panel built

REM ── Install and build desktop ─────────────────────────────────────────────
echo [6/6] Building POS desktop app...
cd /d "%ROOT%desktop"
call npm install --silent
call npm run build
echo       Desktop app built

REM ── Create desktop shortcut ───────────────────────────────────────────────
echo.
echo  Creating desktop shortcut...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.Environment]::GetFolderPath('Desktop') + '\Ddotsmedia POS.lnk'); $s.TargetPath = '%ROOT%Start POS System.bat'; $s.WorkingDirectory = '%ROOT%'; $s.IconLocation = '%ROOT%desktop\assets\icon.ico'; $s.Description = 'Ddotsmedia POS System'; $s.Save()"

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║        Setup Complete!                   ║
echo  ║                                          ║
echo  ║  Desktop shortcut created               ║
echo  ║  Double-click "Ddotsmedia POS" to start   ║
echo  ║                                          ║
echo  ║  Login credentials:                      ║
echo  ║  Admin   : admin@mystore.com / admin123  ║
echo  ║  Manager : manager@mystore.com           ║
echo  ║  Cashier : cashier@mystore.com           ║
echo  ╚══════════════════════════════════════════╝
echo.
pause
