# MyLife Planner upgrade notes

## Scope
Preserve the existing application, visual direction, state model, data format, and both static-host deployment targets.

## Changes in this upgrade
- Added best-effort recovery backup of unreadable/corrupt persisted planner data before the app falls back to defaults. The recovery copy is stored under `mylife-planner:recovery:corrupt-backup`; existing keys and version-2 migration remain unchanged.
- Added a regression test for preservation of corrupt stored data.
- Added a user-facing error message if a selected JSON backup cannot be read, and always reset the file input so the same file can be retried.
- Added `.nvmrc` pinning Node.js 22.16.0, matching the package engine and both GitHub Actions workflows.
- Added deployment concurrency to the Azure workflow.
- Protected `.env` files from accidental Git commits.
- Documented the separate Azure Static Web Apps and GitHub Pages setup, privacy boundaries, and release smoke tests.

## Deployment configuration
- Azure: `.github/workflows/azure-static-web-apps.yml`; requires the GitHub Actions secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.
- GitHub Pages: `.github/workflows/deploy-pages.yml`; requires repository Pages source to be set to **GitHub Actions**.
- Both workflows deploy the `dist/` output from `main`.
- The app remains local-first. Static hosting does not provide accounts, cloud backup, encryption of browser storage, or cross-device synchronization.

## Verification status
- Source changes and deployment configuration were inspected.
- JSON configuration files and ZIP integrity were checked.
- A clean dependency install could not complete in this execution environment (the npm install attempt timed out). Therefore `npm test`, `npm run typecheck`, and `npm run build` have **not** been verified here. Run the commands in the README locally or let the GitHub Actions workflows verify them before treating the release as production-ready.
- Azure and GitHub Pages deployment require the user's GitHub repository, Azure resource, and deployment secret; no cloud resource was created or deployed from this ZIP.
