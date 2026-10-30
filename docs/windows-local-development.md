# Windows 11 local development

These instructions were checked against the repository scripts on Linux, not executed on Windows. Use Node.js 24 LTS (matching CI), npm and Git for Windows. Never overwrite an existing checkout or its `.data` directory.

## Obtain the existing branch

In PowerShell, first inspect the destination:

```powershell
$project = 'C:\Users\bzinn\Desktop\Honey Hole'
Test-Path $project
```

Only if it does not exist:

```powershell
git clone --branch feature/honeyhole-foundation-checkpoint https://github.com/BryanZin123/HoneyHole.git "$project"
Set-Location $project
```

If it already exists, enter it and inspect `git status`, `git remote -v`, and `git branch --show-current`. Preserve uncommitted files; do not reset or clean. Once the working tree is clean and the correct feature branch is checked out, use `git fetch origin` then `git pull --ff-only origin feature/honeyhole-foundation-checkpoint`. Verify `git rev-parse HEAD` against the intended GitHub checkpoint. Do not merge into main.

## Configure and run

```powershell
node --version
npm.cmd ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run db:init
npm.cmd run dev
```

Open http://localhost:3000, matching `BETTER_AUTH_URL=http://localhost:3000` in `.env.local`. The server binds to loopback. Register a local account on Account; credentials are independent of GitHub. Do not change the hostname midway through an authenticated session.

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
