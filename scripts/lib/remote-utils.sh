# scripts/lib/remote-utils.sh
# Lightweight remote helpers (sourced, idempotent)
# Expects KEY_FILE, REMOTE_USER, REMOTE_HOST to be set when this file is sourced.

if [ -n "${__REMOTE_UTILS_LOADED:-}" ]; then
  return 0
fi
__REMOTE_UTILS_LOADED=1

fail() {
  echo
  echo "💢 --- $1 ---"
  exit 1
}

if [ -z "${KEY_FILE:-}" ]; then
  fail "KEY_FILE is not set (required by remote-utils.sh)"
fi
if [ -z "${REMOTE_USER:-}" ]; then
  fail "REMOTE_USER is not set (required by remote-utils.sh)"
fi
if [ -z "${REMOTE_HOST:-}" ]; then
  fail "REMOTE_HOST is not set (required by remote-utils.sh)"
fi

# ssh_run: thin wrapper; use "$@" so callers can pass redirections / here-docs from caller.
ssh_run() {
  ssh -o BatchMode=yes -o ConnectTimeout=10 -i "${KEY_FILE}" "${REMOTE_USER}"@"${REMOTE_HOST}" "$@"
}

# remote_assert_contains <cmd...> <expected>
# Usage: remote_assert_contains "command arg1 arg2" "expected-substring"
remote_assert_contains() {
  local cmd="$1"; shift
  local expected="$1"; shift

  out=$(ssh_run "${cmd}" 2>&1) || { echo "$out"; fail "Remote command failed: ${cmd}"; }
  if ! printf '%s' "$out" | grep -F --quiet -- "$expected"; then
    echo "---- Remote output ----"
    printf '%s\n' "$out"
    fail "Expected output to contain: ${expected}"
  fi
}

# remote_assert_equals <cmd...> <expected>
# Usage: remote_assert_equals "command arg" "expected-exact-output"
remote_assert_equals() {
  local cmd="$1"; shift
  local expected="$1"; shift

  out=$(ssh_run "${cmd}" 2>&1) || { echo "$out"; fail "Remote command failed: ${cmd}"; }
  out_trimmed=$(printf '%s' "$out" | sed -e 's/[[:space:]]*$//')
  if [ "$out_trimmed" != "$expected" ]; then
    echo "---- Remote output ----"
    printf '%s\n' "$out_trimmed"
    fail "Expected '${expected}' but got '${out_trimmed}'"
  fi
}

# scp_run <local> <remote_path>
# Copies a local file or directory (first arg) into remote path (second arg).
scp_run() {
  scp -i "${KEY_FILE}" -r "$1" "${REMOTE_USER}"@"${REMOTE_HOST}":"$2"
}
