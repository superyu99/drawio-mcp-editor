#!/usr/bin/env bash
set -euo pipefail

# One-time vendor step on a network-connected build machine.
# The runtime package subsequently needs NO editor download.
EDITOR_REPO='https://github.com/jgraph/drawio.git'
EDITOR_COMMIT='9034053fba80a435e27d68d374bc564b83917ae9'  # draw.io 32.4.1, 2026-10-08
RELEASE_VERSION='0.1.10'
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$ROOT_DIR/mcp-app-server/vendor/drawio-webapp"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$WORK_DIR/repo"
git -C "$WORK_DIR/repo" init -q
git -C "$WORK_DIR/repo" remote add origin "$EDITOR_REPO"
git -C "$WORK_DIR/repo" sparse-checkout init --cone
git -C "$WORK_DIR/repo" sparse-checkout set src/main/webapp
git -C "$WORK_DIR/repo" -c protocol.version=2 fetch -q --depth 1 --filter=blob:none origin "$EDITOR_COMMIT"
git -C "$WORK_DIR/repo" checkout -q --detach FETCH_HEAD

SOURCE="$WORK_DIR/repo/src/main/webapp"
test -f "$SOURCE/index.html" && test -f "$SOURCE/js/app.min.js" || { echo 'Incomplete upstream Editor checkout' >&2; exit 1; }
mkdir -p "$(dirname "$TARGET_DIR")"
rm -rf "$TARGET_DIR"
cp -a "$SOURCE" "$TARGET_DIR"
git -C "$WORK_DIR/repo" show HEAD:LICENSE > "$TARGET_DIR/UPSTREAM-LICENSE.txt"
git -C "$WORK_DIR/repo" show HEAD:VERSION > "$TARGET_DIR/UPSTREAM-VERSION.txt"
printf '%s\n' "Repository: $EDITOR_REPO" "Commit: $EDITOR_COMMIT" "Build version: $RELEASE_VERSION" > "$TARGET_DIR/UPSTREAM-REVISION.txt"

python3 "$ROOT_DIR/scripts/make-release.py"
