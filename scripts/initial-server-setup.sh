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

# --- Package Installation ---

echo
echo "📦 --- Installing packages on ${REMOTE_HOST}. ---"
ssh_run "sudo dnf install -y podman epel-release dnf-automatic udica container-selinux setools-console policycoreutils-python-utils gpg"

echo
echo "📦 --- Installing additional (epel-release) packages on ${REMOTE_HOST}. ---"
ssh_run "sudo dnf install -y fail2ban fail2ban-firewalld"

# --- Grafana Alloy Installation ---

echo
echo "⚙️ --- Configuring the grafana repositories on ${REMOTE_HOST}. ---"
ssh_run "wget -q -O gpg.key https://rpm.grafana.com/gpg.key"
ssh_run "sudo rpm --import gpg.key"
ssh_run "rm -f gpg.key"
ssh_run "echo -e '[grafana]\nname=grafana\nbaseurl=https://rpm.grafana.com\nrepo_gpgcheck=1\nenabled=1\ngpgcheck=1\ngpgkey=https://rpm.grafana.com/gpg.key\nsslverify=1\nsslcacert=/etc/pki/tls/certs/ca-bundle.crt' | sudo tee /etc/yum.repos.d/grafana.repo"

echo
echo "🚀 --- Installing Grafana Alloy on ${REMOTE_HOST}. ---"
ssh_run "sudo dnf install -y alloy"

echo
echo "☑️ --- Enabling the Grafana Alloy service on ${REMOTE_HOST}. ---"
ssh_run "sudo systemctl enable alloy.service"

echo
echo "🔎 --- Verifying Grafana Alloy service on ${REMOTE_HOST}. ---"
remote_assert_equals "sudo systemctl is-enabled alloy.service" "enabled"
echo "✅ --- Grafana Alloy service verified! ---"

# --- Unprivileged Port Configuration ---

echo
echo "🔧 --- Setting unprivileged port start on ${REMOTE_HOST}. ---"
ssh_run 'bash -s' -- 80 < ./scripts/remote/set-unprivileged-port-start.sh

echo
echo "🔎 --- Verifying unprivileged port config. ---"
remote_assert_equals "sysctl -n net.ipv4.ip_unprivileged_port_start" "80"
echo "✅ --- Unprivileged port config verified! ---"

# --- Firewall Configuration ---

echo
echo "🔥 --- Setting up firewall on ${REMOTE_HOST}. ---"
ssh_run "sudo firewall-cmd --permanent --zone=public --add-port=80/tcp"
ssh_run "sudo firewall-cmd --permanent --zone=public --add-port=443/tcp"
ssh_run "sudo firewall-cmd --permanent --zone=public --add-port=443/udp"
ssh_run "sudo firewall-cmd --reload"
ssh_run "sudo firewall-cmd --zone=public --list-ports"

echo
echo "🔎 --- Verifying firewall ports on ${REMOTE_HOST}. ---"
remote_assert_contains "sudo firewall-cmd --zone=public --list-ports" "80/tcp"
remote_assert_contains "sudo firewall-cmd --zone=public --list-ports" "443/tcp"
remote_assert_contains "sudo firewall-cmd --zone=public --list-ports" "443/udp"
echo "✅ --- Firewall ports verified! ---"

# --- fail2ban Configuration ---

echo
echo "🔧 --- Configuring fail2ban SSH jail on ${REMOTE_HOST}. ---"
ssh_run 'echo -e "[sshd]\nenabled = true" | sudo tee /etc/fail2ban/jail.d/sshd.local'

echo
echo "🔧 --- Enabling fail2ban on ${REMOTE_HOST}. ---"
ssh_run "sudo systemctl enable --now fail2ban"

echo
echo "♻️ --- Reloading fail2ban config on ${REMOTE_HOST}. ---"
ssh_run "sudo systemctl reload fail2ban"

echo
echo "🔎 --- Verifying fail2ban config and service on ${REMOTE_HOST}. ---"
remote_assert_contains "sudo cat /etc/fail2ban/jail.d/sshd.local" "[sshd]"
remote_assert_contains "sudo cat /etc/fail2ban/jail.d/sshd.local" "enabled = true"
remote_assert_equals "sudo systemctl is-enabled fail2ban" "enabled"
remote_assert_equals "sudo systemctl is-active fail2ban" "active"
echo "✅ --- fail2ban config verified! ---"

# --- dnf-automatic Configuration ---

echo
echo "🔧 --- Setting up dnf automatic on ${REMOTE_HOST}. ---"
ssh_run 'bash -s' < ./scripts/remote/configure-automatic-security-updates.sh

echo
echo "🔎 --- Verifying dnf-automatic config and timer on ${REMOTE_HOST}. ---"
remote_assert_contains "sudo cat /etc/dnf/automatic.conf" "upgrade_type = security"
remote_assert_equals "sudo systemctl is-active dnf-automatic.timer" "active"
echo "✅ --- dnf-automatic config verified! ---"

# --- Enable Linger ---

echo
echo "🚀 --- Enabling linger for user ${REMOTE_USER} on ${REMOTE_HOST}. ---"
ssh_run "sudo loginctl enable-linger ${REMOTE_USER}"

echo
echo "🔎 --- Verifying linger for user ${REMOTE_USER} on ${REMOTE_HOST}. ---"
remote_assert_contains "loginctl show-user ${REMOTE_USER} -p Linger" "Linger=yes"
echo "✅ --- Linger for user ${REMOTE_USER} config verified! ---"

# --- Finalize ---

echo
echo "🥳 --- Remote execution finished. Rebooting remote server ---"
ssh_run 'sudo reboot'
