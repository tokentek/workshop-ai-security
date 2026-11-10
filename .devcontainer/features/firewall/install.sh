#!/bin/bash
# Runs as root when the container is built. The option "allowedSites" arrives as $ALLOWEDSITES.
set -euo pipefail

# Tools for the firewall
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends iptables iproute2 curl ca-certificates
rm -rf /var/lib/apt/lists/*

# Save the allowlist, so that the firewall can read it at each start
mkdir -p /usr/local/etc
echo "${ALLOWEDSITES}" > /usr/local/etc/firewall-allowlist

# The firewall script itself runs at each start (postStartCommand)
install -m 755 "$(dirname "$0")/firewall.sh" /usr/local/bin/firewall.sh
