#!/usr/bin/env bash
# a3-stack-2/scripts/stripe-listen.sh
# Add a shell script to start Stripe CLI webhook forwarding for local dev
#
# This script starts the Stripe CLI in listen mode and forwards webhooks to the Better Auth
# Stripe plugin endpoint in SvelteKit. It will export the provided webhook secret into a
# .env.local file if requested.
#
# Requirements:
# - Stripe CLI installed and authenticated: https://stripe.com/docs/stripe-cli
# - STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET typically live in your .env/.env.local
#
# Usage:
#   ./scripts/stripe-listen.sh
#   ./scripts/stripe-listen.sh --port 5173
#   ./scripts/stripe-listen.sh --host http://localhost --path /api/auth/stripe/webhook
#   ./scripts/stripe-listen.sh --save-env .env.local
#
# Options:
#   --host <url>         Host to forward to (default: http://localhost)
#   --port <port>        Port to forward to (default: 5173)
#   --path <path>        Webhook path (default: /api/auth/stripe/webhook)
#   --save-env <file>    If provided, writes STRIPE_WEBHOOK_SECRET to the given env file when received
#   --events <events>    Comma-separated events to listen for
#                        (default: checkout.session.completed,customer.subscription.updated,customer.subscription.deleted)
#   --help               Show help
#
# Notes:
# - On start, the Stripe CLI prints a webhook signing secret (whsec_...). If --save-env is provided,
#   we will parse it and write/update STRIPE_WEBHOOK_SECRET in that env file.
# - The script will keep running, streaming events. Press Ctrl+C to stop.

set -euo pipefail

HOST="http://localhost"
PORT="5173"
PATHNAME="/api/auth/stripe/webhook"
SAVE_ENV_FILE=""
EVENTS_DEFAULT="checkout.session.completed,customer.subscription.updated,customer.subscription.deleted"
EVENTS="$EVENTS_DEFAULT"

print_help() {
  sed -n '1,80p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST="${2:-}"; shift 2 ;;
    --port)
      PORT="${2:-}"; shift 2 ;;
    --path)
      PATHNAME="${2:-}"; shift 2 ;;
    --save-env)
      SAVE_ENV_FILE="${2:-}"; shift 2 ;;
    --events)
      EVENTS="${2:-}"; shift 2 ;;
    --help|-h)
      print_help; exit 0 ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage."
      exit 1 ;;
  esac
done

# Check stripe CLI presence
if ! command -v stripe >/dev/null 2>&1; then
  echo "Error: stripe CLI not found in PATH."
  echo "Install from https://stripe.com/docs/stripe-cli and ensure you're logged in (stripe login)."
  exit 1
fi

FORWARD_TO="${HOST}:${PORT}${PATHNAME}"

echo "Starting Stripe CLI listener..."
echo "Forwarding to: ${FORWARD_TO}"
echo "Events: ${EVENTS}"
echo

# If saving env, prepare the file
maybe_write_env_secret() {
  local whsec="$1"
  local env_file="$2"

  if [[ -z "$env_file" ]]; then
    return 0
  fi

  echo "Saving STRIPE_WEBHOOK_SECRET to ${env_file} ..."
  touch "$env_file"

  # Remove any existing STRIPE_WEBHOOK_SECRET line
  if grep -q '^STRIPE_WEBHOOK_SECRET=' "$env_file"; then
    # Use sed portable-ish replacement
    if sed --version >/dev/null 2>&1; then
      sed -i.bak '/^STRIPE_WEBHOOK_SECRET=/d' "$env_file" && rm -f "${env_file}.bak"
    else
      # macOS/BSD sed
      sed -i '' '/^STRIPE_WEBHOOK_SECRET=/d' "$env_file"
    fi
  fi

  echo "STRIPE_WEBHOOK_SECRET=${whsec}" >> "$env_file"
  echo "Done. Remember to restart your dev server if it reads env on boot."
}

# Start stripe listen, parse the printed webhook signing secret once, save if requested, keep tailing
# Stripe prints a line like:
#   Ready! Your webhook signing secret is whsec_xxx (^C to quit)
# We capture the first occurrence to store in env if needed.
SECRET_CAPTURED=0

# Use stdbuf to disable buffering if available for real-time output
if command -v stdbuf >/dev/null 2>&1; then
  STRIPE_CMD="stdbuf -oL stripe listen --forward-to ${FORWARD_TO} --events ${EVENTS}"
else
  STRIPE_CMD="stripe listen --forward-to ${FORWARD_TO} --events ${EVENTS}"
fi

# Run and process output line by line
$STRIPE_CMD | while IFS= read -r line; do
  echo "$line"

  if [[ $SECRET_CAPTURED -eq 0 ]]; then
    # Try to extract whsec_... token
    if echo "$line" | grep -Eo 'whsec_[A-Za-z0-9]+[A-Za-z0-9_-]*' >/dev/null 2>&1; then
      WHSEC=$(echo "$line" | grep -Eo 'whsec_[A-Za-z0-9_-]+' | head -n1)
      if [[ -n "$WHSEC" ]]; then
        SECRET_CAPTURED=1
        if [[ -n "$SAVE_ENV_FILE" ]]; then
          maybe_write_env_secret "$WHSEC" "$SAVE_ENV_FILE"
        else
          echo
          echo "Detected STRIPE_WEBHOOK_SECRET: ${WHSEC}"
          echo "Tip: Re-run with --save-env .env.local to persist it automatically."
          echo
        fi
      fi
    fi
  fi
done

# End of script
