@echo off
title Ddotsmedia POS - Generate Self-Signed Certificate
color 1F
cls

echo.
echo  ============================================
echo    Ddotsmedia POS - Certificate Generator
echo  ============================================
echo.
echo  This creates a self-signed code signing
echo  certificate to avoid Windows security blocks.
echo.

REM Check if OpenSSL is available
where openssl >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] OpenSSL not found.
  echo.
  echo  Install Git for Windows (includes OpenSSL):
  echo  https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

REM Create certs folder
if not exist "certs" mkdir certs

echo  [1/3] Generating private key...
openssl genrsa -out certs\selfsigned.key 2048

echo  [2/3] Creating certificate...
openssl req -new -x509 -key certs\selfsigned.key -out certs\selfsigned.crt -days 3650 ^
  -subj "/C=AE/ST=Dubai/L=Dubai/O=Ddotsmedia/OU=Software/CN=Ddotsmedia POS"

echo  [3/3] Exporting as PFX (password: ddotsmedia123)...
openssl pkcs12 -export ^
  -out certs\selfsigned.pfx ^
  -inkey certs\selfsigned.key ^
  -in certs\selfsigned.crt ^
  -passout pass:ddotsmedia123

echo.
echo  ============================================
echo    Certificate created: certs\selfsigned.pfx
echo  ============================================
echo.
echo  Now run: build-installer.bat
echo.
pause
