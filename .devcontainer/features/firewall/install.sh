#!/bin/bash
# Runs as root when the container is built. The option "allowedSites" arrives as $ALLOWEDSITES.
set -euo pipefail

# Tools for the firewall
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends iptables
rm -rf /var/lib/apt/lists/*

# Save the allowlist, so that the firewall can read it at each start
mkdir -p /usr/local/etc
echo "${ALLOWEDSITES}" > /usr/local/etc/firewall-allowlist

# The firewall script itself runs at each start (postStartCommand)
install -m 755 "$(dirname "$0")/firewall.sh" /usr/local/bin/firewall.sh

# The base image lets the container user run every command with sudo. Then an agent could
# switch the firewall off with "sudo iptables -F". Allow sudo for the firewall script only.
user="${_REMOTE_USER:-vscode}"
echo "$user ALL=(root) NOPASSWD: /usr/local/bin/firewall.sh \"\"" > "/etc/sudoers.d/$user"
chmod 440 "/etc/sudoers.d/$user"
visudo -cf "/etc/sudoers.d/$user"
