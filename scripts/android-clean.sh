#!/usr/bin/env bash
# Android "clean" without using ./gradlew clean.
# gradlew clean can fail with New Architecture (CMake expects codegen dirs that clean removed).
# This removes caches so the next full build regenerates everything.
# Usage: ./scripts/android-clean.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$ROOT/android/app/.cxx" "$ROOT/android/app/build" "$ROOT/android/build"
echo "Removed android/app/.cxx, android/app/build, android/build."
echo "Run a full build: cd android && ./gradlew :app:assembleDebug"
