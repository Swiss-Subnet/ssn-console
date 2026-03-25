#!/bin/bash
set -euo pipefail

# --- Input ---

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <env_file>"
  exit 1
fi

ENV_FILE="$1"

if [ -f "${ENV_FILE}" ]; then
  set -a
  source "${ENV_FILE}"
  set +a
else
  echo
  echo "💢 --- ${ENV_FILE} file not found! Exiting. ---"
  exit 1
fi

source "$(dirname "$BASH_SOURCE")/lib/utils.sh"
source "$(dirname "$BASH_SOURCE")/lib/remote-utils.sh"

# --- Package Updates ---

echo
echo "📦 --- Installing the latest versions of packages. ---"
ssh_run "sudo dnf update -y"

echo
echo "🧹 --- Removing orphaned dependencies. ---"
ssh_run "sudo dnf autoremove -y"

echo
echo "🗑️ --- Clearing out old, downloaded package files from the cache. ---"
ssh_run "sudo dnf clean all -y"
