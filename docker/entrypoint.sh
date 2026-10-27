#!/bin/sh
set -eu

mkdir -p /app/storage/avatars
chown -R app:app /app/storage

exec runuser --user app -- node .output/server/index.mjs
