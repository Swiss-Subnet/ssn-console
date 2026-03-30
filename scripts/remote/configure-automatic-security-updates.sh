#!/bin/bash
set -euo pipefail

# Configure dnf-automatic for security updates
echo "Configuring dnf-automatic for security updates"
sudo tee /etc/dnf/automatic.conf > /dev/null <<EOF
[commands]
upgrade_type = security
random_sleep = 300
apply_updates = yes
EOF

# Enable automatic security updates
echo "Enabling automatic security updates"
sudo systemctl enable --now dnf-automatic.timer
