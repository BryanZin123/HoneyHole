# Windows 11 local development

These instructions were checked against the repository scripts on Linux, not executed on Windows. Use Node.js 24 LTS (matching CI), npm and Git for Windows. Never overwrite an existing checkout or its `.data` directory.

## Reuse the restored checkout — do not clone again

Close any running HoneyHole development server. In PowerShell:

```powershell
$project = 'C:\Users\bzinn\Desktop\Honey Hole Recovery'
if (!(Test-Path -LiteralPath $project)) { throw 'Restored checkout not found. Stop and locate it; do not clone over another folder.' }
Set-Location -LiteralPath $project
git --version
node --version
npm.cmd --version
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short
```

Confirm Node.js 24, the repository root above, and origin `https://github.com/BryanZin123/HoneyHole.git` (or the equivalent authenticated SSH remote). Do not print environment files or credential values. If the root or remote differs, stop and investigate; do not replace it automatically.

Proceed only with a clean working tree. Uncommitted/untracked work must be preserved and reviewed before synchronization. Do not reset, clean, force-pull or automatically stash it.

```powershell
if (git status --porcelain) { throw 'Local work exists. Stop and preserve it before syncing.' }
git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed. Stop.' }
if ((git branch --show-current) -ne 'feature/honeyhole-foundation-checkpoint') { throw 'Wrong branch. Stop and inspect branches before switching.' }
git merge --ff-only origin/feature/honeyhole-foundation-checkpoint
if ($LASTEXITCODE -ne 0) { throw 'Branches diverged. Stop; do not reset or force.' }
git rev-parse HEAD
git rev-parse origin/feature/honeyhole-foundation-checkpoint
```

The two SHAs must match for synchronization to be complete. If the local branch is ahead, preserve its commits and resolve that state separately. Do not merge into main. Starting checkpoint for this maintenance milestone: `ceda178ac6e053fd9c262361bbfdd5b19a9cc574`; use the subsequently verified GitHub feature-branch SHA when updating.

## Configure and run

Before running `db:init`, inspect `.env.local` privately and confirm `HONEYHOLE_DATA_DIR` points to the existing account database (`honeyhole.sqlite`) and that the existing `auth-secret` file or configured `BETTER_AUTH_SECRET` is preserved. Do not regenerate an existing secret. If expected configuration, database or secret is missing, stop and restore the matching backup; initialization would otherwise create new empty storage or a new secret. The script preserves existing credentials and applies migrations.

```powershell
node --version
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Stop.' }
if (!(Test-Path .env.local)) { throw 'Existing local configuration is missing. Locate its backup or confirm the existing configuration before initialization.' }
# Only after confirming the existing data directory and secret above:
npm.cmd run db:init
if ($LASTEXITCODE -ne 0) { throw 'Storage initialization failed. Stop; do not delete storage.' }
npm.cmd run dev
```

Open http://localhost:3000, matching `BETTER_AUTH_URL=http://localhost:3000` in `.env.local`. The server binds to loopback. Sign in to the existing local account; use a separate synthetic account only for acceptance testing. Local account credentials are independent of GitHub. Do not change the hostname midway through an authenticated session.

`db:init` reads `.env.local`, initializes SQLite migrations in `HONEYHOLE_DATA_DIR` (default `.data`) and creates a random local authentication secret only if absent. Keep that directory and secret between restarts. No external database or production credentials are needed. Never commit `.env.local`, `.data`, account databases, or private coordinates. To back up local accounts, stop the server and securely copy the entire data directory; Git checkpoints do not back up accounts.

`npm.cmd` avoids PowerShell's npm script-shim policy issue without weakening execution policy. If native SQLite dependency installation cannot obtain a prebuilt binary, follow the current node-gyp Windows prerequisites (Python and Visual Studio C++ build tools); do not disable TLS or install untrusted binaries. See https://github.com/nodejs/node-gyp#on-windows and https://nodejs.org/en/download.

## Verify

Stop the development server with Ctrl+C, then:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
node scripts/smoke.mjs
node scripts/accounts-smoke.mjs
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

The smoke/browser scripts start isolated test servers; account/browser checks use temporary databases and synthetic credentials, not your saved account data. Browser fixtures deliberately simulate unavailable providers and do not verify live providers. If a port is occupied, close the corresponding test process rather than deleting data. For a built local app, use `npm.cmd start` after the build.

## Acceptance walkthrough

Find an area in Explore and inspect a park entrance. Choose a separate fishing point by clicking/tapping the map, or focus the map and use arrow keys then Enter. Check that entrance and fishing coordinates are separately labeled. Load historical mapped context; original mapping years are not current survey dates. Unknown habitat/legal evidence must remain unknown. Leave environmental consent unchecked to decline external coordinate transmission; private saving remains available. Sign in using the separate-tab link while keeping Explore open, then save. In Saved, edit the name/notes, sign out and back in, verify persistence, and delete the test pin. Unsaved points are not retained after closing/reloading Explore. Recommendations and notifications remain unavailable.

Record the tested Git SHA, Windows/Node/npm versions, each walkthrough result and any error text without credentials or private coordinates. A successful CI run is not evidence of human Windows acceptance.
