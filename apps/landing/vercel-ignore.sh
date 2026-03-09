#!/bin/bash
# Vercel Ignored Build Step for monorepo.
# Exit 1 = skip build. Exit 0 = proceed with build.
# Only deploy when files under apps/landing/ have changed.

echo "Checking for changes in apps/landing/..."

git diff HEAD^ HEAD --quiet -- apps/landing/
CHANGED=$?

if [ $CHANGED -eq 0 ]; then
  echo "No changes in apps/landing/ — skipping deployment."
  exit 0
else
  echo "Changes detected in apps/landing/ — deploying."
  exit 1
fi
