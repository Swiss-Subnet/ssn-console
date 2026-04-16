# local_assert_contains <cmd...> <expected>
# Usage: local_assert_contains "command arg1 arg2" "expected-substring"
local_assert_contains() {
  local cmd="$1"
  local expected="$2"

  out=$(bash -c "$cmd" 2>&1) || { echo "$out"; fail "Local command failed: ${cmd}"; }
  if ! printf '%s' "$out" | grep -F --quiet -- "$expected"; then
    echo "---- Local output ----"
    printf '%s\n' "$out"
    fail "Expected output to contain: ${expected}"
  fi
}

# strict_envsubst <template_file> <output_file>
# Usage: strict_envsubst "template.txt" "output.txt"
# Substitutes environment variables in a template file, failing if any required variables are unset.
strict_envsubst() {
  local template_file="$1"
  local output_file="$2"

  if [[ -z "${template_file:-}" || -z "${output_file:-}" ]]; then
    echo "💢 Usage: strict_envsubst <template_file> <output_file>" >&2

    return 1
  fi

  if [[ ! -f "$template_file" ]]; then
    echo "💢 Error: Template file '$template_file' not found." >&2

    return 1
  fi

  local expected_vars
  expected_vars=$(grep -oE '\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?' "$template_file" | tr -d '${}' | sort -u || true)

  if [[ -z "$expected_vars" ]]; then
    echo
    echo "🙋‍♂️ INFO: No variables found in '$template_file'."
    cp "$template_file" "$output_file"

    return 0
  fi

  local missing_vars=0
  for var in $expected_vars; do
    # Safely check if a variable is unset via parameter expansion.
    if [[ -z "${!var+x}" ]]; then
      echo "💢 ERROR: Required environment variable '$var' is not set." >&2

      missing_vars=1
    fi
  done

  if [[ $missing_vars -ne 0 ]]; then
    echo "💢 ERROR: Aborting substitution for '$output_file' due to missing variables." >&2

    return 1
  fi

  envsubst < "$template_file" > "$output_file"
}
