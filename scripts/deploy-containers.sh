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

# --- Common Variables ---

export ROOT_DIR=$(cd "$(dirname $BASH_SOURCE)/.." && pwd)

export TMP_DIRNAME="tmp"
export IMAGE_DIRNAME="images"
export POLICY_DIRNAME="policies"
export QUADLET_DIRNAME="quadlets"
export CONFIG_DIRNAME="config"

export CONFIG_INPUT_DIR="${ROOT_DIR}/${CONFIG_DIRNAME}"
export QUADLET_INPUT_DIR="${CONFIG_INPUT_DIR}/${QUADLET_DIRNAME}"

export TMP_OUTPUT_DIR="${ROOT_DIR}/${TMP_DIRNAME}"
export IMAGE_OUTPUT_DIR="${TMP_OUTPUT_DIR}/${IMAGE_DIRNAME}"
export QUADLET_OUTPUT_DIR="${TMP_OUTPUT_DIR}/${QUADLET_DIRNAME}"

export REMOTE_HOME_DIR="/home/$REMOTE_USER"
export REMOTE_QUADLET_DIR="${REMOTE_HOME_DIR}/.config/containers/systemd"
export REMOTE_VOLUME_DIR="${REMOTE_HOME_DIR}/.config/containers/volumes"
export REMOTE_IMAGE_DIR="${REMOTE_HOME_DIR}/${IMAGE_DIRNAME}"
export REMOTE_POLICY_DIR="${REMOTE_HOME_DIR}/${POLICY_DIRNAME}"

# --- Caddy Variables ---

export CADDY_IMAGE_NAMESPACE="localhost"
export CADDY_IMAGE_NAME="caddy"
export CADDY_SERVICE_NAME="caddy"

export CADDY_TAR_NAME="${CADDY_SERVICE_NAME}.tar"
export CADDY_TAR_PATH="${IMAGE_OUTPUT_DIR}/${CADDY_TAR_NAME}"

export CADDYFILE_NAME="Caddyfile"
export CADDYFILE_PATH="${CONFIG_INPUT_DIR}/${CADDYFILE_NAME}"
export TMP_CADDYFILE_PATH="${TMP_OUTPUT_DIR}/${CADDYFILE_NAME}"
export CADDY_CONTAINER_PATH="${CONFIG_INPUT_DIR}/caddy.containerfile"

export CADDY_POLICY_FILE_NAME="caddy.cil"
export CADDY_POLICY_PATH="${CONFIG_INPUT_DIR}/${CADDY_POLICY_FILE_NAME}"

export REMOTE_CADDY_TAR_PATH="${REMOTE_IMAGE_DIR}/${CADDY_TAR_NAME}"
export REMOTE_CADDY_DIR="${REMOTE_VOLUME_DIR}/caddy"
export REMOTE_CADDY_CONFIG_DIR="${REMOTE_CADDY_DIR}"
export REMOTE_CADDYFILE_PATH="${REMOTE_CADDY_CONFIG_DIR}/${CADDYFILE_NAME}"
export REMOTE_CADDY_DATA_DIR="${REMOTE_CADDY_DIR}/data"

# --- Offchain Service Variables ---

export OFFCHAIN_SERVICE_IMAGE_NAMESPACE="localhost"
export OFFCHAIN_SERVICE_IMAGE_NAME="offchain-service"
export OFFCHAIN_SERVICE_SERVICE_NAME="offchain-service"

export OFFCHAIN_SERVICE_TAR_NAME="${OFFCHAIN_SERVICE_SERVICE_NAME}.tar"
export OFFCHAIN_SERVICE_TAR_PATH="${IMAGE_OUTPUT_DIR}/${OFFCHAIN_SERVICE_TAR_NAME}"

export OFFCHAIN_SERVICE_POLICY_FILE_NAME="offchain-service.cil"
export OFFCHAIN_SERVICE_POLICY_PATH="${CONFIG_INPUT_DIR}/${OFFCHAIN_SERVICE_POLICY_FILE_NAME}"

export OFFCHAIN_CONTAINER_PATH="${ROOT_DIR}/config/offchain-service.containerfile"

export REMOTE_OFFCHAIN_SERVICE_TAR_PATH="${REMOTE_IMAGE_DIR}/${OFFCHAIN_SERVICE_TAR_NAME}"

# --- Grafana Alloy Variables ---

export ALLOY_CONFIG_FILENAME="config.alloy"
export ALLOY_CONFIG_PATH="${CONFIG_INPUT_DIR}/${ALLOY_CONFIG_FILENAME}"
export TMP_ALLOY_CONFIG_PATH="${TMP_OUTPUT_DIR}/${ALLOY_CONFIG_FILENAME}"

export REMOTE_ALLOY_DIR="/etc/alloy"
export REMOTE_TMP_ALLOY_CONFIG_PATH="${REMOTE_HOME_DIR}/${ALLOY_CONFIG_FILENAME}"
export REMOTE_ALLOY_CONFIG_PATH="${REMOTE_ALLOY_DIR}/${ALLOY_CONFIG_FILENAME}"

# --- Setup Remote Directories ---

echo
echo "📂 --- Ensuring the remote volume directory exists. ---"
ssh_run "mkdir -p ${REMOTE_VOLUME_DIR}"

echo
echo "📂 --- Ensuring the remote image directory exists. ---"
ssh_run "mkdir -p ${REMOTE_IMAGE_DIR}"

echo
echo "📂 --- Ensuring the remote quadlet directory exists. ---"
ssh_run "mkdir -p ${REMOTE_QUADLET_DIR}"

echo
echo "📂 --- Ensuring the remote policy directory exists. ---"
ssh_run "mkdir -p ${REMOTE_POLICY_DIR}"

echo
echo "📂 --- Ensuring the remote Caddy config directory exists. ---"
ssh_run "mkdir -p ${REMOTE_CADDY_CONFIG_DIR}"

echo
echo "📂 --- Ensuring the remote Caddy data directory exists. ---"
ssh_run "mkdir -p ${REMOTE_CADDY_DATA_DIR}"

# --- Clean Local Directories ---

echo
echo "🧹 --- Cleaning local tmp directory. ---"
rm -rf "${TMP_OUTPUT_DIR}"

# --- Setup Local Directories ---

echo
echo "📂 --- Ensuring the local tmp directory exists. ---"
mkdir -p "${TMP_OUTPUT_DIR}"

echo
echo "📂 --- Ensuring the local image directory exists. ---"
mkdir -p "${IMAGE_OUTPUT_DIR}"

echo
echo "📂 --- Ensuring the local quadlet directory exists. ---"
mkdir -p "${QUADLET_OUTPUT_DIR}"

# --- Build Caddy Image ---

echo
echo "🛠️ --- Building the ${CADDY_SERVICE_NAME} container image. ---"
docker build -t "${CADDY_IMAGE_NAMESPACE}/${CADDY_IMAGE_NAME}" -f "${CADDY_CONTAINER_PATH}" "${ROOT_DIR}"

echo
echo "💾 --- Saving the ${CADDY_SERVICE_NAME} container image to ${CADDY_TAR_PATH}. ---"
docker save "${CADDY_IMAGE_NAMESPACE}/${CADDY_IMAGE_NAME}" > "${CADDY_TAR_PATH}"

# --- Build Offchain-Service Image ---

echo
echo "🛠️ --- Building the ${OFFCHAIN_SERVICE_SERVICE_NAME} container image. ---"
docker build -t "${OFFCHAIN_SERVICE_IMAGE_NAMESPACE}/${OFFCHAIN_SERVICE_IMAGE_NAME}" -f "${OFFCHAIN_CONTAINER_PATH}" "${ROOT_DIR}"

echo
echo "💾 --- Saving the ${OFFCHAIN_SERVICE_SERVICE_NAME} container image to ${OFFCHAIN_SERVICE_TAR_PATH}. ---"
docker save "${OFFCHAIN_SERVICE_IMAGE_NAMESPACE}/${OFFCHAIN_SERVICE_IMAGE_NAME}" > "${OFFCHAIN_SERVICE_TAR_PATH}"

echo
echo "🔎 --- Verifying local offchain-service image and tar. ---"
docker image inspect "${OFFCHAIN_SERVICE_IMAGE_NAMESPACE}/${OFFCHAIN_SERVICE_IMAGE_NAME}" >/dev/null 2>&1 || fail "Docker image not found: ${OFFCHAIN_SERVICE_IMAGE_NAMESPACE}/${OFFCHAIN_SERVICE_IMAGE_NAME}"
[ -s "${OFFCHAIN_SERVICE_TAR_PATH}" ] || fail "Offchain-service tar not created: ${OFFCHAIN_SERVICE_TAR_PATH}"

# --- Transfer Images ---

echo
echo "📦 --- Transferring the ${IMAGE_OUTPUT_DIR} directory to ${REMOTE_HOST}. ---"
scp_run "${IMAGE_OUTPUT_DIR}/." "${REMOTE_IMAGE_DIR}"

echo
echo "🔎 --- Verifying remote images tar files exist. ---"
remote_assert_contains "test -s ${REMOTE_CADDY_TAR_PATH} && echo ok || true" "ok"
remote_assert_contains "test -s ${REMOTE_OFFCHAIN_SERVICE_TAR_PATH} && echo ok || true" "ok"

# --- Substitute Quadlet Files ---

echo
echo "♻️ --- Substituting environment variables in the Quadlet files. ---"
for file in "${QUADLET_INPUT_DIR}"/*; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    strict_envsubst "$file" "${QUADLET_OUTPUT_DIR}/${filename}"
    echo
    echo "✅ --- Processed: ${filename}. ---"
  fi
done

echo
echo "📦 --- Transferring the ${QUADLET_OUTPUT_DIR} directory to ${REMOTE_HOST}. ---"
scp_run "${QUADLET_OUTPUT_DIR}/." "${REMOTE_QUADLET_DIR}"

# --- Generate Caddyfile ---

echo
echo "♻️ --- Substituting environment variables in the Caddyfile. ---"
strict_envsubst "${CADDYFILE_PATH}" "${TMP_CADDYFILE_PATH}"

echo
echo "📦 --- Transferring the substituted Caddyfile to ${REMOTE_HOST}. ---"
scp_run "${TMP_CADDYFILE_PATH}" "${REMOTE_CADDYFILE_PATH}"

echo
echo "🔎 --- Verifying remote Caddyfile exists. ---"
remote_assert_contains "test -s ${REMOTE_CADDYFILE_PATH} && echo ok || true" "ok"

# --- Generate Grafana Alloy Config

echo
echo "♻️ --- Substituting environment variables in the Grafana Alloy config. ---"
strict_envsubst "${ALLOY_CONFIG_PATH}" "${TMP_ALLOY_CONFIG_PATH}"

echo
echo "📦 --- Transferring the substituted Grafana Alloy config to ${REMOTE_HOST}. ---"
scp_run "${TMP_ALLOY_CONFIG_PATH}" "${REMOTE_TMP_ALLOY_CONFIG_PATH}"
ssh_run "sudo mv ${REMOTE_TMP_ALLOY_CONFIG_PATH} ${REMOTE_ALLOY_CONFIG_PATH}"

echo
echo "🔎 --- Verifying remote Grafana Alloy config exists. ---"
remote_assert_contains "sudo test -s ${REMOTE_ALLOY_CONFIG_PATH} && echo ok || true" "ok"

# --- Transfer Policies ---

echo
echo "📦 --- Transferring the ${CADDY_POLICY_PATH} file to ${REMOTE_HOST}. ---"
scp_run "${CADDY_POLICY_PATH}" "${REMOTE_POLICY_DIR}/"

echo
echo "📦 --- Transferring the ${OFFCHAIN_SERVICE_POLICY_PATH} file to ${REMOTE_HOST}. ---"
scp_run "${OFFCHAIN_SERVICE_POLICY_PATH}" "${REMOTE_POLICY_DIR}/"

# --- Load Policies ---

POLICY_LIST="${REMOTE_POLICY_DIR}/${CADDY_POLICY_FILE_NAME}"
POLICY_LIST+=" ${REMOTE_POLICY_DIR}/${OFFCHAIN_SERVICE_POLICY_FILE_NAME}"

echo
echo "🔐 --- Loading SELinux policies on ${REMOTE_HOST}. ---"
ssh_run "sudo semodule -i ${POLICY_LIST} /usr/share/udica/templates/{base_container.cil,net_container.cil}"

# --- Restart Services ---

echo
echo "📦 --- Loading ${CADDY_SERVICE_NAME} image from ${REMOTE_CADDY_TAR_PATH}. ---"
ssh_run "podman load < ${REMOTE_CADDY_TAR_PATH}"

echo
echo "📦 --- Loading ${OFFCHAIN_SERVICE_SERVICE_NAME} image from ${REMOTE_OFFCHAIN_SERVICE_TAR_PATH}. ---"
ssh_run "podman load < ${REMOTE_OFFCHAIN_SERVICE_TAR_PATH}"

echo
echo "🔄 --- Reloading the systemd user daemon. ---"
ssh_run "systemctl --user daemon-reload"

echo
echo "🚀 --- Restarting the ${CADDY_SERVICE_NAME} service on ${REMOTE_HOST}. ---"
ssh_run "systemctl --user restart ${CADDY_SERVICE_NAME}.service"

echo
echo "🚀 --- Restarting the ${OFFCHAIN_SERVICE_SERVICE_NAME} service on ${REMOTE_HOST}. ---"
ssh_run "systemctl --user restart ${OFFCHAIN_SERVICE_SERVICE_NAME}.service"

echo
echo "🚀 --- Restarting the Grafana Alloy service on ${REMOTE_HOST}. ---"
ssh_run "sudo systemctl restart alloy.service"

echo
echo "🔎 --- Verifying services are active. ---"
remote_assert_equals "systemctl --user is-active ${CADDY_SERVICE_NAME}.service" "active"
remote_assert_equals "systemctl --user is-active ${OFFCHAIN_SERVICE_SERVICE_NAME}.service" "active"
remote_assert_equals "sudo systemctl is-active alloy.service" "active"

echo
echo "🔎 --- Verifying services are reachable from the remote host. ---"

remote_assert_contains "podman ps --format '{{.Names}}' || true" "${CADDY_SERVICE_NAME}"
remote_assert_contains "podman ps --format '{{.Names}}' || true" "${OFFCHAIN_SERVICE_SERVICE_NAME}"

remote_assert_contains "curl -sSL --connect-timeout 5 -I http://127.0.0.1:2019 || true" "HTTP/"
remote_assert_contains "curl -sSL --connect-timeout 5 -H \"Host: ${OFFCHAIN_SERVICE_DOMAIN}\" http://127.0.0.1/status || true" "ok"
remote_assert_contains "curl -sSL --connect-timeout 5 -I http://127.0.0.1:12345/ || true" "HTTP/"

echo
echo "🔎 --- Verifying services are reachable from the local machine. ---"

local_assert_contains "curl -sSL --connect-timeout 5 -H \"Host: ${OFFCHAIN_SERVICE_DOMAIN}\" http://${REMOTE_HOST}/status || true" "ok"

echo
echo "🧹 --- Cleaning up old images. ---"
ssh_run "podman image prune -f"

echo
echo "🔎 --- Verifying podman is functional after prune. ---"
remote_assert_contains "podman images || true" "REPOSITORY"

# --- Finalise ---

echo
echo "🥳 --- Remote execution finished. ---"
