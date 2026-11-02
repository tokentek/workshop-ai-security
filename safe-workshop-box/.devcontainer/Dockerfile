# Base image: Microsoft's ready-made dev container with Node.js 20
FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Tools for the firewall
RUN apt-get update && apt-get install -y iptables iproute2

COPY --chmod=755 firewall.sh /usr/local/bin/firewall.sh

# Claude Code, pinned version, no auto-updates or telemetry
RUN npm install -g @anthropic-ai/claude-code@2.1.316
ENV CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
