#!/bin/bash
# Firewall: all outgoing traffic is blocked unless the site is on the allowlist.
# The allowlist comes from the "allowedSites" option in devcontainer.json.
set -euo pipefail

ALLOWED_SITES=$(cat /usr/local/etc/firewall-allowlist)

iptables -F OUTPUT

# Always allowed: localhost, DNS, replies, and the host machine (VS Code needs this)
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
HOST_NETWORK=$(ip route | awk '/default/ {print $3}' | sed 's/\.[0-9]*$/.0\/24/')
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT

# Let each allowed site through (the IP addresses are found now, at start)
count=0
for site in $ALLOWED_SITES; do
  for address in $(getent ahostsv4 "$site" | awk '{print $1}' | sort -u); do
    iptables -A OUTPUT -d "$address" -j ACCEPT
  done
  count=$((count + 1))
done

# Everything else is rejected
iptables -A OUTPUT -j REJECT

# IPv6: allow only localhost (the allowlist is IPv4 only)
if command -v ip6tables > /dev/null && ip6tables -L OUTPUT > /dev/null 2>&1; then
  ip6tables -F OUTPUT
  ip6tables -A OUTPUT -o lo -j ACCEPT
  ip6tables -A OUTPUT -j REJECT
fi

# Self-test: one allowed site must work, one other site must be blocked
curl -s --max-time 5 https://api.anthropic.com > /dev/null \
  || { echo "ERROR: api.anthropic.com should be reachable"; exit 1; }
curl -s --max-time 5 https://example.com > /dev/null \
  && { echo "ERROR: example.com should be blocked"; exit 1; }

echo "Firewall is ON: $count sites allowed. api.anthropic.com allowed, example.com blocked."
