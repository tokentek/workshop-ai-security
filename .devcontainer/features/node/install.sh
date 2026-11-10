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

# The checksum line of the file for this computer: "<sha256>  node-v22.x.y-linux-arm64.tar.gz"
checksum=$(curl -fsSL "$base/SHASUMS256.txt" | grep "linux-${arch}\.tar\.gz\$")
file=${checksum##* }

curl -fsSL "$base/$file" -o "/tmp/$file"
(cd /tmp && echo "$checksum" | sha256sum -c -)

# --no-same-owner: the files belong to root, not to the user ID in the archive
tar -xzf "/tmp/$file" -C /usr/local --strip-components=1 --no-same-owner --exclude='*.md' --exclude=LICENSE
rm "/tmp/$file"

echo "Installed Node.js $(node --version) and npm $(npm --version)."
