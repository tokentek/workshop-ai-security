#!/bin/bash
# Runs as root when the container is built. The option "version" arrives as $VERSION.
# Downloads directly from nodejs.org (the official Node feature uses nvm from raw.githubusercontent.com).
set -euo pipefail

case "$(uname -m)" in
  x86_64) arch=x64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

base="https://nodejs.org/dist/latest-v${VERSION}.x"
file=$(curl -fsSL "$base/SHASUMS256.txt" | awk -v a="linux-${arch}.tar.gz" '$2 ~ a"$" {print $2}')
curl -fsSL "$base/$file" -o "/tmp/$file"
(cd /tmp && curl -fsSL "$base/SHASUMS256.txt" | grep " $file\$" | sha256sum -c -)
tar -xzf "/tmp/$file" -C /usr/local --strip-components=1 --exclude='*.md' --exclude=LICENSE
rm "/tmp/$file"

echo "Installed Node.js $(node --version) and npm $(npm --version)."
