#!/bin/bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <unprivileged_port_start>"
  exit 1
fi

UNPRIVILEGED_PORT_START="$1"

SYSCTL_FILE="/etc/sysctl.conf"
KEY="net.ipv4.ip_unprivileged_port_start"
DESIRED_SETTING="${KEY}=${UNPRIVILEGED_PORT_START}"

echo
echo "🔎 --- Checking if unprivileged port start setting already exists. ---"
if grep -qE "^\s*#?\s*${KEY}" "${SYSCTL_FILE}"; then
  echo
  echo "✅ --- Found existing sysctl setting. Updating. ---"
  sudo sed -i "s|^\s*#?\s*${KEY}.*|${DESIRED_SETTING}|" "${SYSCTL_FILE}"
else
  echo
  echo "💢 --- No existing sysctl setting found. Adding new setting. ---"
  echo "${DESIRED_SETTING}" | sudo tee -a "${SYSCTL_FILE}"
fi

echo
echo "♻️ --- Applying sysctl settings. ---"
sudo sysctl -p
