#!/bin/bash
# Runs as root when the container is built, BEFORE the other features (see overrideFeatureInstallOrder).
# Some company networks inspect TLS traffic. Then downloads fail with
# "unable to get local issuer certificate" until the container trusts the company root certificate.
set -euo pipefail

shopt -s nullglob
certs=("$(dirname "$0")"/certs/*.crt)
if [ ${#certs[@]} -eq 0 ]; then
  echo "No company certificates in certs/. Nothing to do."
  exit 0
fi

cp "${certs[@]}" /usr/local/share/ca-certificates/
update-ca-certificates
echo "Trusted ${#certs[@]} company certificate(s)."
