#!/bin/bash

set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
COCKPIT_DIR="${BASE_DIR}/cockpit"
RUNTIME_DIR="${COCKPIT_DIR}/.runtime"

show_error() {
  clear
  echo ""
  echo "RCS Cockpit no puede iniciarse."
  echo ""
  echo "$1"
  echo ""
  read -r -p "Pulsa Intro para cerrar..." _
  exit 1
}

find_port() {
  local port

  for port in $(seq 5500 5510); do
    if ! lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "${port}"
      return 0
    fi
  done

  return 1
}

open_cockpit() {
  local url="$1"

  (
    sleep 1
    open "${url}"
  ) >/dev/null 2>&1 &
}

if [ ! -f "${COCKPIT_DIR}/index.html" ]; then
  show_error "No se encuentra la carpeta 'cockpit' junto a este archivo. Descomprime el ZIP completo antes de abrirlo."
fi

PORT="$(find_port)" || show_error "No hay un puerto disponible entre 5500 y 5510. Cierra otra instancia del Cockpit y vuelve a intentarlo."
URL="http://127.0.0.1:${PORT}/"

clear

echo ""
echo "============================================================"
echo " RCS Cockpit - versión portable"
echo "============================================================"
echo ""
echo " Carpeta: ${COCKPIT_DIR}"
echo " URL:     ${URL}"
echo ""
echo " El navegador se abrirá automáticamente."
echo " Mantén esta ventana abierta mientras uses el Cockpit."
echo " Pulsa Ctrl+C o cierra esta ventana para detenerlo."
echo ""

if command -v python3 >/dev/null 2>&1; then
  open_cockpit "${URL}"
  exec python3 -m http.server "${PORT}" --bind 127.0.0.1 --directory "${COCKPIT_DIR}"
fi

if [ -x /usr/bin/ruby ]; then
  open_cockpit "${URL}"
  exec /usr/bin/ruby -run -e httpd "${COCKPIT_DIR}" --bind-address=127.0.0.1 --port="${PORT}"
fi

ARCH="$(uname -m)"

case "${ARCH}" in
  arm64)
    SERVER="${RUNTIME_DIR}/rcs-cockpit-server-macos-apple-silicon"
    ;;
  x86_64)
    SERVER="${RUNTIME_DIR}/rcs-cockpit-server-macos-intel"
    ;;
  *)
    show_error "Este Mac utiliza una arquitectura no soportada: ${ARCH}"
    ;;
esac

if [ ! -f "${SERVER}" ]; then
  show_error "No se ha encontrado un servidor local compatible. Vuelve a descargar o descomprimir el paquete completo."
fi

chmod +x "${SERVER}" 2>/dev/null || true

exec "${SERVER}" --root "${COCKPIT_DIR}"
