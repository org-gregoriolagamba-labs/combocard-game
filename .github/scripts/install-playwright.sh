#!/usr/bin/env bash
# Installs the Playwright browsers and their system packages, and gives up quickly when the
# package mirror is slow. A slow mirror once kept this step busy for the whole 30 minutes of
# the job (#95): each attempt now has its own time limit and the step is repeated.
#
# Usage: install-playwright.sh [playwright install arguments]   (e.g. chromium)
# Environment: ATTEMPTS (default 3), ATTEMPT_TIMEOUT (default 4m)
set -uo pipefail

ATTEMPTS="${ATTEMPTS:-3}"
ATTEMPT_TIMEOUT="${ATTEMPT_TIMEOUT:-4m}"

# apt gives up on a connection that does not answer and tries again by itself, instead of
# waiting for a mirror that sends a few KB per second
printf 'Acquire::Retries "3";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' \
  | sudo tee /etc/apt/apt.conf.d/99-ci-network >/dev/null

for attempt in $(seq 1 "$ATTEMPTS"); do
  echo "Playwright install, attempt ${attempt} of ${ATTEMPTS} (limit ${ATTEMPT_TIMEOUT})"
  if timeout --kill-after=15s "$ATTEMPT_TIMEOUT" npx --prefix e2e playwright install --with-deps "$@"; then
    echo "Playwright installed"
    exit 0
  fi
  echo "::warning::Playwright install failed or timed out (attempt ${attempt} of ${ATTEMPTS})"
  # A timed-out apt can still hold the package lock for a moment
  sleep 10
done

echo "::error::Playwright could not be installed after ${ATTEMPTS} attempts of ${ATTEMPT_TIMEOUT}: the apt mirror or the Playwright download is probably slow or down. Run the job again later."
exit 1
