#!/usr/bin/env bash
# release.sh — build a multi-arch Docker image and push to AWS ECR.
#
# Default behavior:
#   - Builds for linux/amd64 and linux/arm64
#   - Tags with the git short SHA
#   - Also tags as 'latest'
#   - Pushes both tags to ECR
#   - Verifies the multi-arch manifest after push
#
# Usage examples:
#   ./bin/release.sh                              # standard release
#   ./bin/release.sh --tag v0.4.2                 # use an explicit tag instead of git SHA
#   ./bin/release.sh --tag hotfix --no-latest     # don't update 'latest'
#   ./bin/release.sh --no-push                    # build only (single-arch fallback)
#   ./bin/release.sh --platforms linux/amd64      # build for one arch only
#   ./bin/release.sh --region us-west-2           # override region
#   ./bin/release.sh --help                       # see all options

set -euo pipefail

# ---------- defaults ----------
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-model-sizing-app}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
PUSH=true
UPDATE_LATEST=true
EXPLICIT_TAG=""
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
BUILD_CONTEXT="${BUILD_CONTEXT:-.}"
BUILDER_NAME="${BUILDER_NAME:-multi-arch}"

# ---------- colors (only if stdout is a tty) ----------
if [ -t 1 ]; then
  RED=$'\033[0;31m'
  GREEN=$'\033[0;32m'
  YELLOW=$'\033[0;33m'
  BLUE=$'\033[0;34m'
  RESET=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; RESET=''
fi

log()  { printf '%s[release]%s %s\n' "$BLUE"  "$RESET" "$*"; }
ok()   { printf '%s[release]%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s[release]%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
err()  { printf '%s[release]%s %s\n' "$RED"   "$RESET" "$*" >&2; exit 1; }

usage() {
  cat <<EOF
release.sh — build & push a multi-arch Docker image to AWS ECR

Options:
  --tag NAME           Use this tag instead of git short SHA
  --no-latest          Do not also tag and push as 'latest'
  --no-push            Build but don't push (forces single platform — see notes)
  --platforms LIST      Comma-separated platforms (default: linux/amd64,linux/arm64)
  --region REGION      AWS region (default: $AWS_REGION; or env AWS_REGION)
  --repo NAME          ECR repo name (default: $ECR_REPO; or env ECR_REPO)
  --dockerfile PATH    Dockerfile to use (default: Dockerfile)
  --context PATH       Build context (default: .)
  -h, --help           Show this help

Environment variables (override the defaults above):
  AWS_REGION, ECR_REPO, PLATFORMS, DOCKERFILE, BUILD_CONTEXT, BUILDER_NAME

Notes:
  - --no-push is for testing. Multi-arch images cannot be loaded into the local
    Docker daemon (only registries support manifest lists). With --no-push, the
    script forces a single platform matching your current machine.
  - If 'multi-arch' buildx builder doesn't exist, it will be created automatically.
EOF
}

# ---------- parse args ----------
while [ $# -gt 0 ]; do
  case "$1" in
    --tag)         EXPLICIT_TAG="$2"; shift 2 ;;
    --no-latest)   UPDATE_LATEST=false; shift ;;
    --no-push)     PUSH=false; shift ;;
    --platforms)   PLATFORMS="$2"; shift 2 ;;
    --region)      AWS_REGION="$2"; shift 2 ;;
    --repo)        ECR_REPO="$2"; shift 2 ;;
    --dockerfile)  DOCKERFILE="$2"; shift 2 ;;
    --context)     BUILD_CONTEXT="$2"; shift 2 ;;
    -h|--help)     usage; exit 0 ;;
    *)             err "Unknown option: $1 (try --help)" ;;
  esac
done

# ---------- preflight checks ----------
command -v docker >/dev/null 2>&1 || err "docker not found in PATH"
command -v aws    >/dev/null 2>&1 || err "aws not found in PATH"
command -v git    >/dev/null 2>&1 || err "git not found in PATH"

docker buildx version >/dev/null 2>&1 \
  || err "docker buildx is required (Docker 19.03+ with buildx plugin)"

# Confirm we're at the repo root (or $BUILD_CONTEXT contains the Dockerfile)
[ -f "$BUILD_CONTEXT/$DOCKERFILE" ] \
  || err "Dockerfile not found at $BUILD_CONTEXT/$DOCKERFILE"

# AWS credentials reachable
if ! aws sts get-caller-identity --query Account --output text >/dev/null 2>&1; then
  err "AWS credentials not configured or expired. Run 'aws configure' or refresh your session."
fi

AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Confirm the ECR repo exists in this region
if ! aws ecr describe-repositories \
       --repository-names "$ECR_REPO" \
       --region "$AWS_REGION" \
       --query 'repositories[0].repositoryUri' \
       --output text >/dev/null 2>&1; then
  err "ECR repo '$ECR_REPO' not found in region '$AWS_REGION'. Check --repo / --region."
fi

# Compute tag
if [ -n "$EXPLICIT_TAG" ]; then
  IMAGE_TAG="$EXPLICIT_TAG"
else
  if ! git rev-parse --short HEAD >/dev/null 2>&1; then
    err "Not in a git repo and --tag not provided. Use --tag <name>."
  fi
  IMAGE_TAG="$(git rev-parse --short HEAD)"
fi

# Warn if working tree is dirty (unless using explicit tag, where the user
# is presumably aware of what they're tagging)
if [ -z "$EXPLICIT_TAG" ] && [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  warn "Working tree has uncommitted changes; tagging as ${IMAGE_TAG} anyway."
  warn "Recommend committing first so the tag points to a real ref."
fi

# ---------- buildx setup ----------
if ! docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1; then
  log "Creating buildx builder '$BUILDER_NAME'..."
  docker buildx create --name "$BUILDER_NAME" --driver docker-container --use
  docker buildx inspect --bootstrap
else
  docker buildx use "$BUILDER_NAME" >/dev/null
fi

# ---------- ECR login (only if pushing) ----------
if [ "$PUSH" = true ]; then
  log "Logging into ECR ($ECR_REGISTRY)..."
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY" >/dev/null
  ok "ECR login OK"
fi

# ---------- adjust platforms when not pushing ----------
if [ "$PUSH" = false ]; then
  HOST_ARCH="$(uname -m)"
  case "$HOST_ARCH" in
    x86_64|amd64) HOST_PLATFORM="linux/amd64" ;;
    aarch64|arm64) HOST_PLATFORM="linux/arm64" ;;
    *) err "Unsupported host arch for --no-push: $HOST_ARCH" ;;
  esac

  if [ "$PLATFORMS" != "$HOST_PLATFORM" ]; then
    warn "--no-push: forcing single platform $HOST_PLATFORM (was '$PLATFORMS')"
    warn "    multi-arch images can only be created when pushing to a registry."
    PLATFORMS="$HOST_PLATFORM"
  fi
fi

# ---------- assemble image refs ----------
PRIMARY_REF="${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"
LATEST_REF="${ECR_REGISTRY}/${ECR_REPO}:latest"

# ---------- print plan ----------
echo
log "Release plan"
log "  Region:    $AWS_REGION"
log "  Registry:  $ECR_REGISTRY"
log "  Repo:      $ECR_REPO"
log "  Platforms: $PLATFORMS"
log "  Primary:   $PRIMARY_REF"
if [ "$UPDATE_LATEST" = true ]; then
  log "  Also:      $LATEST_REF"
fi
log "  Push:      $PUSH"
log "  Builder:   $BUILDER_NAME"
echo

# ---------- build ----------
BUILDX_ARGS=(
  buildx build
  --platform "$PLATFORMS"
  --tag "$PRIMARY_REF"
)

if [ "$UPDATE_LATEST" = true ]; then
  BUILDX_ARGS+=(--tag "$LATEST_REF")
fi

if [ "$PUSH" = true ]; then
  BUILDX_ARGS+=(--push)
else
  BUILDX_ARGS+=(--load)
fi

BUILDX_ARGS+=(
  --file "$BUILD_CONTEXT/$DOCKERFILE"
  "$BUILD_CONTEXT"
)

log "Building..."
docker "${BUILDX_ARGS[@]}"
ok "Build complete"

# ---------- verify manifest (only if pushed) ----------
if [ "$PUSH" = true ]; then
  log "Verifying multi-arch manifest..."
  if docker buildx imagetools inspect "$PRIMARY_REF" >/dev/null 2>&1; then
    PLATFORM_LIST="$(docker buildx imagetools inspect "$PRIMARY_REF" \
      | awk '/Platform:/ {print $2}' | sort -u | paste -sd ',' -)"
    ok "Manifest present. Platforms: $PLATFORM_LIST"
  else
    warn "Could not inspect pushed image (registry race?). Try manually:"
    warn "  docker buildx imagetools inspect $PRIMARY_REF"
  fi
fi

# ---------- summary ----------
echo
ok  "Release complete."
log "Tag for the rpi (set IMAGE_TAG in .env on the rpi):"
echo
echo "    IMAGE_TAG=${IMAGE_TAG}"
echo
log "Then on the rpi:"
echo
echo "    cd ~/apps/model-sizing-app"
echo "    docker compose pull && docker compose up -d"
echo "    docker compose logs -f --tail 50"
echo
