Put company root certificates here as `.crt` files (PEM format). Git ignores them.

On macOS, export one from the Keychain, for example:

    security find-certificate -a -c "Cisco Umbrella Root CA" -p /Library/Keychains/System.keychain > cisco-umbrella.crt
