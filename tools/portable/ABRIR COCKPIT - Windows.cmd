@echo off
setlocal

title RCS Cockpit - Portable

set "BASE=%~dp0"
set "COCKPIT=%BASE%cockpit"
set "SERVER=%COCKPIT%\.runtime\server-windows.ps1"

if not exist "%COCKPIT%\index.html" (
  echo.
  echo RCS Cockpit no puede iniciarse.
  echo.
  echo No se encuentra la carpeta "cockpit" junto a este archivo.
  echo Descomprime el ZIP completo antes de abrirlo.
  echo.
  pause
  exit /b 1
)

if not exist "%SERVER%" (
  echo.
  echo RCS Cockpit no puede iniciarse.
  echo.
  echo Falta el servidor local de Windows.
  echo Vuelve a descargar o descomprimir el paquete completo.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SERVER%" -Root "%COCKPIT%"

if not "%ERRORLEVEL%"=="0" (
  echo.
  echo El Cockpit se ha cerrado con un error.
  echo.
  pause
)

endlocal
