# Deployment Guide — ECR + Multi-Arch + Raspberry Pi via Cloudflare Tunnel

> **Audience:** project owner deploying `model-sizing-app` to a Raspberry Pi 4 with an existing Cloudflare tunnel.
> **Scope:** build a multi-arch (`linux/arm64` + `linux/amd64`) Docker image on a dev laptop, push to AWS ECR, pull on the rpi, run on port **3300**, route through an existing dockerized cloudflared tunnel on a new subdomain.
> **Companion docs:** `README.md` for local dev, `docs/llm-provider-guide.md` for env vars.

## Work split (who does what)

| Step | Where | Who |
|---|---|---|
| §3. Port change (Dockerfile, compose, README) | Dev laptop / repo | **Claude Code** (via PR) |
| §4. Dockerfile multi-arch verification | Dev laptop / repo | **Claude Code** (small tweaks) |
| §5. buildx setup | Dev laptop | **You** (one-time) |
| §6. ECR (already created — just verify) | Dev laptop | **You** |
| §7. Build + push (use `bin/release.sh`) | Dev laptop | **You** |
| §8. RPi pull + run | Raspberry Pi | **You** |
| §9. Cloudflare tunnel ingress | Cloudflare dashboard / rpi | **You** |
| §10. Standard release loop | Both | **You** running `bin/release.sh` on laptop, then pulling on rpi |

Anything that touches the rpi or AWS configuration is out of scope for Claude Code. Claude Code's job is the code in the repo plus `bin/release.sh`.

---

## 1. What you'll do

1. Change the app's container port from 3000 to 3300 (it already coexists with another app on 3000)
2. Set up `docker buildx` on the laptop for multi-arch builds
3. Create an AWS ECR private repository
4. Authenticate Docker with ECR
5. Build and push a multi-arch image (single tag, two manifests: arm64 and amd64)
6. Pull and run on the rpi using a `docker-compose.yml` tuned for production
7. Add a new subdomain to the existing Cloudflare tunnel ingress so the new app is reachable

The whole loop should take ~20 minutes the first time, ~3 minutes thereafter (build + push + restart on rpi).

---

## 2. Prerequisites

### On the dev laptop
- Docker Desktop (macOS/Windows) or Docker Engine (Linux) — version 24+
- AWS CLI v2 — `aws --version` to confirm
- AWS credentials configured for an account with ECR write access — `aws sts get-caller-identity` to confirm
- ~5 GB free disk for build cache

### On the Raspberry Pi 4
- Raspberry Pi OS 64-bit (Bookworm or later) — `uname -m` should show `aarch64`
- Docker Engine + Compose plugin — `docker --version` && `docker compose version`
- An existing cloudflared docker container that you control (can edit its config)
- AWS credentials for read-only ECR access (a separate IAM user is best)

### Cloudflare side
- The domain (e.g., `example.com`) in your Cloudflare account
- An existing tunnel with a configured hostname for the other app
- DNS API permissions (cloudflared can manage these for you on `cloudflared tunnel route`)

---

## 3. Change container port to 3300

The codebase currently exposes port 3000 (Next.js default). The app should still run on 3000 *inside* the container — only the host port mapping changes. But to fully eliminate the conflict possibility (especially when running multiple containers with `network_mode: host`), we'll set the Next.js port explicitly.

### 3.1 Update the Dockerfile

Edit `Dockerfile`:

```dockerfile
# Change in the runtime stage
ENV PORT=3300
EXPOSE 3300
CMD ["npm", "run", "start"]
```

Next.js's `npm start` honors the `PORT` env var, so no code change needed.

### 3.2 Update docker-compose.yml

Edit `docker-compose.yml`:

```yaml
services:
  ml-sizer:
    image: ${ECR_REGISTRY}/model-sizing-app:${IMAGE_TAG:-latest}
    container_name: model-sizing-app
    ports:
      - "3300:3300"        # was 3000:3000
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    env_file: .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3300 || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
```

Notes:
- `image` now points at ECR instead of `build: .` (we're pulling, not building, on rpi)
- `${ECR_REGISTRY}` and `${IMAGE_TAG}` come from `.env` on the rpi (set in §6.3)
- Healthcheck uses `wget` (Alpine-based images have it; on `node:20-slim` add it via `apt-get install -y wget` if missing — see §4 Dockerfile note)

### 3.3 Update README and any hardcoded references

```bash
grep -rn "3000" --include="*.md" --include="*.ts" --include="*.tsx" .
```

Replace any user-facing `localhost:3000` references with `localhost:3300`. **Do not** replace internal references where 3000 is correct (e.g., a service that genuinely needs 3000 for an unrelated reason).

### 3.4 Test locally before pushing

```bash
docker compose down
docker compose build
docker compose up -d
curl -I http://localhost:3300
# Expect: HTTP/1.1 200 OK (or 307 redirect)
```

If it works locally, commit:

```bash
git add Dockerfile docker-compose.yml README.md
git commit -m "chore(docker): change app port from 3000 to 3300"
```

---

## 4. Verify the Dockerfile is multi-arch capable

`node:20-slim` is multi-arch on Docker Hub (it has both `amd64` and `arm64` manifests), so the existing Dockerfile should "just work" for both architectures. Two things to verify:

### 4.1 Native modules

`better-sqlite3` is a native module that must compile for the target architecture. Because the build stage uses the same architecture as the target (when buildx cross-builds, the build itself runs in an emulator — see §5.2), the install will produce architecture-correct binaries.

If you ever see this error during cross-build:
```
Error: incompatible architecture (have 'arm64', need 'x86_64')
```
that means a native binary was copied across stages without recompiling. Fix: ensure `npm ci` runs **inside the `--platform`-correct stage**, not pre-compiled then copied.

### 4.2 Add wget for healthcheck (optional)

`node:20-slim` doesn't include `wget`. Add it in the runtime stage for the healthcheck to work:

```dockerfile
FROM node:20-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates \
 && rm -rf /var/lib/apt/lists/*
```

Or use `curl` if preferred — same idea.

---

## 5. Set up multi-arch builds on the laptop

### 5.1 Create a buildx builder

```bash
docker buildx create --name multi-arch --driver docker-container --use
docker buildx inspect --bootstrap
```

Verify it lists both `linux/amd64` and `linux/arm64`:

```bash
docker buildx inspect multi-arch | grep Platforms
# Platforms: linux/amd64, linux/arm64, linux/arm/v7, linux/arm/v6, ...
```

### 5.2 How cross-arch builds work

Docker uses **QEMU emulation** to build the non-native architecture. On an x86_64 laptop, the arm64 build runs inside a QEMU layer. This is slower than native (2–4× slower for npm install) but produces correct binaries.

On macOS with Apple Silicon, the situation is reversed: arm64 is native, amd64 is emulated.

If buildx complains about missing platforms:

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

This registers QEMU handlers for all architectures.

---

## 6. Set up AWS ECR

### 6.1 ECR repository (already created)

The `model-sizing-app` repo already exists in ECR. Skip the create step. Just confirm and set env vars:

```bash
export AWS_REGION=us-east-1                  # adjust if your repo is in a different region
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
export ECR_REPO=model-sizing-app

# Verify the repo exists
aws ecr describe-repositories \
  --repository-names ${ECR_REPO} \
  --region ${AWS_REGION} \
  --query 'repositories[0].repositoryUri'
# Should output: "<account_id>.dkr.ecr.us-east-1.amazonaws.com/model-sizing-app"
```

Persist these in your shell profile (`~/.zshrc` / `~/.bashrc`) so they're set on every new shell, or rely on `bin/release.sh` which sets them.

### 6.2 Set lifecycle policy (optional but recommended)

ECR storage costs money. Add a policy to keep the last 10 images:

```bash
cat > ecr-lifecycle.json <<'EOF'
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    }
  ]
}
EOF

aws ecr put-lifecycle-policy \
  --repository-name ${ECR_REPO} \
  --lifecycle-policy-text file://ecr-lifecycle.json \
  --region ${AWS_REGION}
```

### 6.3 Authenticate Docker with ECR

ECR auth tokens last 12 hours. Run this whenever you push:

```bash
aws ecr get-login-password --region ${AWS_REGION} \
  | docker login --username AWS --password-stdin ${ECR_REGISTRY}
```

Output: `Login Succeeded`

For the rpi, see §7.1 — same command but with read-only credentials.

---

## 7. Build and push the multi-arch image

### 7.1 Pick a tag strategy

Three common patterns — pick one and stick with it:

| Pattern | Example | Pros | Cons |
|---|---|---|---|
| Git short SHA | `2f3a8c1` | Immutable, traceable | Have to look up which is "current" |
| Date-based | `2026-04-25` | Easy to read | Non-unique within a day |
| Semantic version | `v1.2.0` | Standard | Manual versioning discipline |

Recommended for now: **git short SHA + a `latest` rolling tag**:

```bash
export GIT_SHA=$(git rev-parse --short HEAD)
export IMAGE_TAG=${GIT_SHA}
```

### 7.2 Build and push in one command

`buildx build --push` builds for both architectures and pushes to ECR with a single command. Without `--push`, multi-arch images can only stay in the buildx cache (Docker's local store doesn't support multi-platform manifests).

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG} \
  --tag ${ECR_REGISTRY}/${ECR_REPO}:latest \
  --push \
  .
```

Expect 5–15 minutes the first time (npm install on emulated arm64 is the slow part). Subsequent builds with cached layers: 1–3 minutes.

### 7.3 Verify the manifest

```bash
docker buildx imagetools inspect ${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}
```

Expected output includes:
```
Manifests:
  Name: <registry>/<repo>:<tag>@sha256:...
    MediaType: application/vnd.oci.image.manifest.v1+json
    Platform: linux/amd64
  Name: <registry>/<repo>:<tag>@sha256:...
    MediaType: application/vnd.oci.image.manifest.v1+json
    Platform: linux/arm64
```

Both architectures present means you're good.

---

## 8. Set up the rpi to pull from ECR

### 8.1 IAM credentials (already in place)

You're using the same IAM user on the rpi as on your laptop. Skip the read-only puller-user setup.

> **Optional hardening (not required now):** later, you can create a dedicated read-only `model-sizing-app-rpi-puller` IAM user with only `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage` permissions. This limits blast radius if the rpi credentials leak. Not blocking — return to this when convenient.

### 8.2 AWS CLI on the rpi (already configured)

Your AWS CLI on the rpi is already configured with the same IAM user you use on your laptop. Skip configuration. Just verify:

```bash
# On the rpi
aws sts get-caller-identity
# Should show your IAM user ARN
```

If `aws` isn't installed yet on the rpi:
```bash
sudo apt update && sudo apt install -y awscli
```

### 8.3 Authenticate Docker with ECR on the rpi

```bash
# On the rpi
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

aws ecr get-login-password --region ${AWS_REGION} \
  | docker login --username AWS --password-stdin ${ECR_REGISTRY}
```

This auth token expires in 12 hours. To auto-refresh, install `amazon-ecr-credential-helper`:

```bash
sudo apt install -y amazon-ecr-credential-helper
```

Edit `~/.docker/config.json` (create if missing):

```json
{
  "credHelpers": {
    "<account_id>.dkr.ecr.us-east-1.amazonaws.com": "ecr-login"
  }
}
```

Replace `<account_id>` with your AWS account ID. Now Docker pulls from ECR using the AWS CLI credentials automatically — no more 12-hour token expiry.

### 8.4 Set up the app directory on the rpi

```bash
# On the rpi
mkdir -p ~/apps/model-sizing-app
cd ~/apps/model-sizing-app

# Pull docker-compose.yml from your repo (one of these methods)
git clone <repo-url> .
# or just scp the docker-compose.yml + .env.example
```

### 8.5 Add app-specific entries to existing .env on the rpi

Your `.env` on the rpi already exists and contains values for other apps running on the rpi. **Do not replace it.** Append the new app's variables at the bottom.

```bash
# On the rpi, in the directory where compose runs from
cat >> .env <<EOF

# === model-sizing-app ===
ECR_REGISTRY=<account_id>.dkr.ecr.us-east-1.amazonaws.com
IMAGE_TAG=latest
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-7
LLM_PROVIDER=anthropic
DATABASE_PATH=/app/data/ml-sizer.db
NEXT_PUBLIC_APP_NAME=ml-sizer
LOG_LEVEL=info
# MODEL_STORE_SECRET will be auto-generated on first boot if absent;
# back it up after first run — losing it loses stored API keys.
EOF
```

Replace `<account_id>` with your AWS account ID (run `aws sts get-caller-identity --query Account --output text` to get it).

> **Important:** if other apps on this rpi also reference variables like `ANTHROPIC_API_KEY` or `LLM_PROVIDER`, the values from a single `.env` will apply to all containers loading that file. If they need different values per app, switch to per-app `.env` files (e.g., `.env.model-sizing-app`) and reference each via `env_file:` in the per-app `docker-compose.yml`. Adjust now if relevant.

Variables prefixed with `# === <app-name> ===` make it easier to find each app's section as the file grows.

### 8.6 Pull and run

```bash
# On the rpi
cd ~/apps/model-sizing-app
docker compose pull
docker compose up -d
docker compose logs -f
```

After 20–30 seconds, the healthcheck should pass. Verify locally on the rpi:

```bash
curl -I http://localhost:3300
# Expect: HTTP/1.1 200 OK
```

---

## 9. Wire up Cloudflare tunnel (new subdomain)

You have cloudflared running in a Docker container on the rpi. We're adding a new ingress rule for the new subdomain (e.g., `sizer.example.com`).

### 9.1 Locate the cloudflared config

The cloudflared container reads its config from a mounted file. Find it:

```bash
docker inspect <cloudflared-container-name> | grep -A 5 Mounts
```

Common locations:
- `~/.cloudflared/config.yml`
- `/etc/cloudflared/config.yml`
- Inside the container at `/etc/cloudflared/config.yml`

### 9.2 Add a DNS record for the new subdomain

Two ways:

**Option A — via cloudflared CLI (if you have credentials accessible):**

```bash
docker exec <cloudflared-container> cloudflared tunnel route dns <tunnel-name> sizer.example.com
```

**Option B — via Cloudflare dashboard:**

1. Cloudflare dashboard → your domain → DNS
2. Add CNAME record:
   - Name: `sizer`
   - Target: `<tunnel-id>.cfargotunnel.com`
   - Proxy: Proxied (orange cloud)

### 9.3 Update cloudflared ingress rules

Edit the cloudflared `config.yml`. It looks something like:

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/<tunnel-id>.json

ingress:
  # Existing rule for the other app
  - hostname: other.example.com
    service: http://localhost:3000

  # NEW: rule for model-sizing-app
  - hostname: sizer.example.com
    service: http://localhost:3300

  # Catch-all (must always be last)
  - service: http_status:404
```

**Important order:** ingress rules are matched top-to-bottom. The catch-all `http_status:404` must be the last entry.

### 9.4 Reload cloudflared

```bash
docker restart <cloudflared-container-name>
docker logs <cloudflared-container-name> --tail 50
```

You should see `Registered tunnel connection` lines for both hostnames.

### 9.5 Test from outside

```bash
# From any internet-connected machine, NOT the rpi
curl -I https://sizer.example.com
# Expect: HTTP/2 200 OK
```

If you get a 502, the tunnel can't reach `http://localhost:3300` on the rpi — check `docker compose ps` on the rpi to confirm the app is running.

If you get a 530/1033, Cloudflare's edge can't reach the tunnel — check `docker logs <cloudflared>` for connection errors.

---

## 10. Updating: the standard release loop

Once everything is wired, here's the regular workflow:

### 10.1 On the laptop

The `bin/release.sh` script wraps build + push. Use it for every release:

```bash
# Standard release: build + tag with git SHA + tag latest, push both
./bin/release.sh

# Release with a specific tag (e.g., for a versioned release)
./bin/release.sh --tag v0.4.2

# Build only (skip push, useful for local-arch testing)
./bin/release.sh --no-push --platforms linux/amd64

# Skip the latest rolling tag (useful for hotfix branches you don't want as default)
./bin/release.sh --no-latest

# See all options
./bin/release.sh --help
```

What it does behind the scenes:
- Loads env vars (region, account id, repo)
- Computes the git short SHA
- Refreshes the ECR auth token
- Calls `docker buildx build --platform linux/amd64,linux/arm64 --tag <sha> --tag latest --push`
- Verifies the multi-arch manifest after push
- Prints the exact tag to set on the rpi

### 10.2 On the rpi

```bash
cd ~/apps/model-sizing-app
docker compose pull
docker compose up -d
docker compose logs -f --tail 50
```

If something breaks, roll back:

```bash
# Edit .env, set IMAGE_TAG=<previous-sha>
docker compose pull
docker compose up -d
```

That's why we tag every build with the git SHA — instant rollback to a known-good image.

---

## 11. Optional improvements

These are out of scope for the first deployment but worth knowing about:

- **GitHub Actions for builds** — instead of building on your laptop, push to a branch and let CI build + push. Saves ~10 minutes per release. Use the `aws-actions/amazon-ecr-login` action and `docker/build-push-action` with `platforms: linux/amd64,linux/arm64`.
- **Watchtower on the rpi** — auto-pulls new images when ECR is updated. Nice for `latest` tag deployments. Adds a small attack surface.
- **Cloudflare Access** — put the app behind Cloudflare Access (Zero Trust) for SSO without auth in the app itself. Useful when you onboard your team.
- **Image signing** — `cosign sign` your images and verify on pull. Worth doing if you ever pull `latest` automatically.
- **Buildx remote cache** — store layer cache in S3 or a registry to speed up CI builds.

---

## 12. Troubleshooting

**`exec format error` on the rpi when running the container**
The image was built for the wrong architecture. Confirm with `docker buildx imagetools inspect <image>` — should show both linux/amd64 and linux/arm64. If only amd64 is present, you forgot `--platform linux/amd64,linux/arm64` in the build command.

**`no basic auth credentials` on `docker compose pull`**
ECR auth expired. Re-run the `aws ecr get-login-password | docker login` command, or set up `amazon-ecr-credential-helper` per §8.3.

**Build hangs forever on `npm ci` for arm64**
The arm64 build runs in QEMU emulation. Check that QEMU is registered (`docker run --privileged --rm tonistiigi/binfmt --install all`) and be patient — first build can take 15+ minutes.

**Cloudflare returns 502 only for the new app**
The tunnel connects to Cloudflare fine but can't reach localhost:3300. Common causes:
- App not actually running: `docker compose ps`
- Port mismatch in compose: confirm `3300:3300` in `docker-compose.yml`
- Network mode confusion: if the cloudflared container uses `network_mode: host`, `localhost:3300` works. If it uses a bridge network, you need `host.docker.internal:3300` (Docker Desktop only) or the rpi's host IP. Check `docker network inspect bridge` for context.

**App starts but `data/` is empty after restart**
SQLite volume not persisted. Confirm `volumes:` block in compose mounts `./data:/app/data`. After fixing, `docker compose down && docker compose up -d`.

**`MODEL_STORE_SECRET` warning on every boot**
The encryption secret regenerates because it's not persisted. Set it explicitly in `.env` on the rpi (not in `.env.example` in the repo!). Back it up — losing it means re-entering API keys.


**Container exits with code 159 immediately, no logs in `docker compose logs`**

Affects: Docker 25+ on Raspberry Pi OS with kernel 6.1.x (default on Pi OS as of early 2026). The default seccomp profile denies the `brk()` syscall on ARM64, killing every container with SIGSYS before any output is flushed — so `docker compose logs` shows nothing useful.

Confirm the diagnosis:
```bash
sudo dmesg -T | grep audit | tail -5
# Look for lines like:
#   audit: type=1326 ... sig=31 ... syscall=214 ... comm="docker-entrypoi"
# sig=31 = SIGSYS, syscall=214 = brk()
```

Workaround (immediate) — add to the service in `docker-compose.yml`:
```yaml
services:
  ml-sizer:
    # ... existing fields ...
    security_opt:
      - seccomp=unconfined
```

Then `docker compose up -d`. The container will start normally.

Tradeoff: `seccomp=unconfined` removes the per-syscall sandbox for that container. It's still isolated by namespaces, cgroups, and user — for a self-hosted internal app behind Cloudflare on a home network, this is acceptable. Public-facing or shared-host deployments should prefer the permanent fix.

Permanent fix — upgrade the rpi kernel to 6.6+:
```bash
sudo apt update && sudo apt full-upgrade -y
sudo reboot
uname -r    # should now be 6.6.x or higher
```
After upgrade, remove the `security_opt` block and `docker compose up -d` again. The default seccomp profile works correctly with newer kernels.

---

## 13. Quick reference card

```bash
# === Laptop: build & push ===
./bin/release.sh
# Note the tag printed at the end — set it as IMAGE_TAG on the rpi

# === RPi: pull & run ===
cd ~/apps/model-sizing-app
docker compose pull && docker compose up -d
docker compose logs -f --tail 50

# === RPi: rollback ===
# Edit .env: IMAGE_TAG=<old-sha>
docker compose pull && docker compose up -d
```
