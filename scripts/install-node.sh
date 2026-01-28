#!/usr/bin/env bash

# Install a specific version of Node.js
# Usage: install-node.sh <version> [<base-install-path>]
set -e

# Check for required commands
for cmd in curl tar jq; do
    if ! command -v $cmd &> /dev/null; then
        echo "Error: '$cmd' is not installed." >&2
        exit 1
    fi
done

VERSION=${1:-24} # Default to version 24 if not specified

# https://nodejs.org/dist/index.json lists all available versions, and is already sorted
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version> [<base-install-path>]"
    echo "Example: $0 24.12.0 /usr/local"
    echo "Example: $0 20"
    exit 1
fi

VERSION=$(curl -sSL https://nodejs.org/dist/index.json |
    jq -r --arg version "$VERSION" 'map(select(.version | test("^v" + $version))) | if length == 0 then empty else .[0].version end') || {
    echo "Version $VERSION not found."
    exit 1
}

echo "Installing Node.js version: $VERSION"

BASE_INSTALL_PATH=${2:-/opt}
ARCH=$(uname -m)
PLATFORM=$(uname -s)

# Make ARCH and PLATFORM lowercase for URL construction
ARCH=${ARCH,,}
PLATFORM=${PLATFORM,,}

# Convert architecture to Node.js naming
case $ARCH in
    amd64|x86_64|x64) ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Convert platform to Node.js naming
case $PLATFORM in
    linux) PLATFORM="linux" ;;
    darwin) PLATFORM="darwin" ;;
    *) echo "Unsupported platform: $PLATFORM"; exit 1 ;;
esac

DOWNLOAD_URL="https://nodejs.org/dist/${VERSION}/node-${VERSION}-${PLATFORM}-${ARCH}.tar.xz"

TMP_DIR=$(mktemp -d)
trap "rm -rf ${TMP_DIR}" EXIT

echo "Downloading Node.js version ${VERSION} from ${DOWNLOAD_URL}..."
curl -SLo "${TMP_DIR}/node.tar.xz" "${DOWNLOAD_URL}"

# Create or update the 'node' symlink to point to the installed version
if [[ -L "${BASE_INSTALL_PATH}/node" ]]; then
    sudo rm -f "${BASE_INSTALL_PATH}/node"
elif [[ -d "${BASE_INSTALL_PATH}/node" ]]; then
    sudo rm -rf "${BASE_INSTALL_PATH}/node"
fi

sudo tar -C "${BASE_INSTALL_PATH}" --no-same-owner --no-same-permissions -xf "${TMP_DIR}/node.tar.xz"
sudo ln -sf "${BASE_INSTALL_PATH}/node-${VERSION}-${PLATFORM}-${ARCH}" "${BASE_INSTALL_PATH}/node"

echo "Node.js version ${VERSION} installed to ${BASE_INSTALL_PATH}/node-${VERSION}-${PLATFORM}-${ARCH}."
sudo mkdir -p "${BASE_INSTALL_PATH}/node/etc"
cat <<EOF | sudo tee "${BASE_INSTALL_PATH}/node/etc/npmrc" > /dev/null
prefix=${BASE_INSTALL_PATH}/node-global
EOF
echo "NPM configured to use prefix ${BASE_INSTALL_PATH}/node-global"
sudo mkdir -p "${BASE_INSTALL_PATH}/node-global/bin" "${BASE_INSTALL_PATH}/node-global/lib"
sudo chmod -R 02775 "${BASE_INSTALL_PATH}/node-global"
case $PLATFORM in
    linux)
        # Create a 'nodejs' group if it doesn't exist and add the current user to it
        if ! getent group nodejs >/dev/null; then
            sudo groupadd -r nodejs
            sudo usermod -aG nodejs "$USER"
        fi
        sudo chown -R :nodejs "${BASE_INSTALL_PATH}/node-global"
        ;;
    darwin)
        sudo chown -R :"$(id -gn)" "${BASE_INSTALL_PATH}/node-global"
        ;;
esac
cat <<EOF
Installation complete!

To use this Node.js version, add the following to your shell profile:
export PATH=${BASE_INSTALL_PATH}/node/bin:${BASE_INSTALL_PATH}/node-global/bin:\$PATH
EOF
