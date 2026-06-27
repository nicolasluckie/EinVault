#!/usr/bin/env bash
# Bump version in README.md and package.json.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: scripts/version-bump.sh <version> [options]

Bump version in README.md and package.json.

  <version>       Semantic version (e.g. 1.0.0, 1.1.0, 2.0.0)
  --dry-run       Show what would be done without making changes
  -h, --help     Show this help

Example:
  scripts/version-bump.sh 1.0.0
  scripts/version-bump.sh 1.0.0 --dry-run
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    *) VERSION="$1"; shift ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  echo "Error: Version is required" >&2
  usage
  exit 1
fi

# Validate version format (semantic versioning)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Invalid version format. Expected X.Y.Z (e.g. 1.0.0)" >&2
  exit 1
fi

TAG="v${VERSION}"

cd "$ROOT"

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: Tag $TAG already exists" >&2
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: Working directory has uncommitted changes" >&2
  exit 1
fi

# Run pre-commit on all files
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Would run: pre-commit run --all-files"
else
  if command -v pre-commit >/dev/null 2>&1; then
    echo "Running pre-commit..."
    pre-commit run --all-files || {
      echo "Error: Pre-commit hooks failed" >&2
      exit 1
    }
  else
    echo "Warning: pre-commit not found, skipping hooks"
  fi
fi

# Bump package.json version
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Would bump package.json version to $VERSION"
else
  echo "Bumping package.json version to $VERSION..."
  npm version "$VERSION" --no-git-tag-version
fi

# Update README.md version badge
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Would update README.md version badge to $VERSION"
else
  echo "Updating README.md version badge to $VERSION..."
  sed -i.bak "s/badge\/version-[0-9]\+\.[0-9]\+\.[0-9]\+/badge\/version-${VERSION}/g" "${ROOT}/README.md"
  rm -f "${ROOT}/README.md.bak"
fi

# Commit package.json, package-lock.json, and README.md
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Would commit package.json, package-lock.json, and README.md"
else
  git add package.json package-lock.json README.md
  git commit -m "chore(release): bump version to ${TAG}"
fi

echo ""
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Release ${TAG} would be prepared successfully!"
else
  echo "Release ${TAG} prepared successfully!"
fi
echo ""
echo "Next steps:"
echo "  git push"
echo "  git tag -a ${TAG} -m 'Release ${TAG}'"
echo "  git push origin ${TAG}"
echo ""
echo "GitHub Actions will promote the Docker image to GHCR on tag push."
