#!/usr/bin/env bash
set -Eeuo pipefail

# Combines benchmark result artifacts into a single PR comment body and writes
# the PR number for the post-comment job.

OUTPUT_FILE=./canbench_combined_comment.md
: > "$OUTPUT_FILE"

# When the benchmark jobs were skipped (no Rust changes) only the pr_number
# sentinel artifact is present. Signal the caller to skip posting a comment.
shopt -s nullglob
results=(canbench_result_*)
if [ ${#results[@]} -eq 0 ]; then
  echo "skip=true" >> "$GITHUB_OUTPUT"
  exit 0
fi

commit_hash=""
for dir in canbench_result_*; do
  name=${dir#canbench_result_}
  file="$dir/$dir"
  [ -f "$file" ] || continue

  # Pull the commit hash + timestamp header line from the first benchmark so the
  # combined comment still surfaces which commit was benchmarked.
  if [ -z "$commit_hash" ]; then
    header_line=$(head -n 1 "$file")
    echo "# \`canbench\` 🏋 ${header_line#*\) }" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    commit_hash="set"
  fi

  status_line=$(sed -n '2p' "$file")
  open_attr=""
  if [[ "$status_line" != ✅* ]]; then
    open_attr=" open"
  fi
  echo "<details${open_attr}><summary><strong>${name}</strong> -- ${status_line}</summary>" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  tail -n +3 "$file" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "</details>" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
done

echo "pr_number=$(cat ./pr_number/pr_number)" >> "$GITHUB_OUTPUT"
echo "comment_file=$OUTPUT_FILE" >> "$GITHUB_OUTPUT"