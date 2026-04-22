@echo off
title Ddotsmedia POS - Build Installer
color 1F
cls

echo.
echo  ============================================================
echo    Ddotsmedia POS System - Windows Installer Builder
echo  ============================================================
echo.

SET ROOT=%~dp0

REM ── Check Node.js ────────────────────────────────────────────────────────────
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Node.js not found. Install from https://nodejs.org
  pause & exit /b 1
)

REM ── Install dependencies ──────────────────────────────────────────────────────
echo  [1/4] Installing dependencies...
call npm install
IF %ERRORLEVEL% NEQ 0 ( echo  [ERROR] npm install failed & pause & exit /b 1 )

REM ── Build app ─────────────────────────────────────────────────────────────────
echo  [2/4] Building application...
call npm run build
IF %ERRORLEVEL% NEQ 0 ( echo  [ERROR] Build failed & pause & exit /b 1 )

REM ── Choose signing mode ───────────────────────────────────────────────────────
echo.
echo  ── Signing Options ──────────────────────────────────────────
echo   [1] Self-signed certificate (free, shows warning first run)
echo   [2] No signature (unsigned, Windows SmartScreen blocks)
echo   [3] Commercial certificate (set CSC_LINK / CSC_KEY_PASSWORD)
echo  ─────────────────────────────────────────────────────────────
echo.
set /p SIGN_CHOICE=Choose option (1/2/3):

echo.
echo  [3/4] Packaging installer...

IF "%SIGN_CHOICE%"=="1" (
  IF NOT EXIST "certs\selfsigned.pfx" (
    echo  [!] No certificate found. Running create-cert.bat first...
    call create-cert.bat
  )
  set CSC_LINK=%ROOT%certs\selfsigned.pfx
  set CSC_KEY_PASSWORD=ddotsmedia123
  call npx electron-builder --win
) ELSE IF "%SIGN_CHOICE%"=="3" (
  IF "%CSC_LINK%"=="" (
    echo  Enter path to your .pfx certificate file:
    set /p CSC_LINK=PFX Path:
    echo  Enter certificate password:
    set /p CSC_KEY_PASSWORD=Password:
  )
  call npx electron-builder --win
) ELSE (
  REM Unsigned build
  call npx electron-builder --win --config.win.sign=false
)

IF %ERRORLEVEL% NEQ 0 ( echo  [ERROR] Packaging failed & pause & exit /b 1 )

REM ── Done ──────────────────────────────────────────────────────────────────────
echo.
echo  [4/4] Done!
echo.
echo  ============================================================
echo    Output files in:  release\
echo  ============================================================
echo.

REM List output files
echo  Generated files:
dir /b release\*.exe 2>nul
echo.

REM Open release folder
explorer release

echo  Press any key to exit...
pause >nul
