# MyLife Planner — Code, UX, Security and Production Audit

**Audit basis:** the uploaded ZIP source tree, package manifest/lockfile, README, GitHub Pages workflow, and static inspection of React/TypeScript modules. This is a source-level review; no live browser session or deployed Azure resource was available.

## Executive summary

The project has a sound foundation for a personal, offline-first planner: React + TypeScript + Vite, a reducer-based state model, separated domain logic, local persistence, JSON backup/restore, and focused unit tests. It does not need a backend merely to be hosted publicly.

The main production blockers are build/runtime version alignment and the absence of an Azure-specific deployment configuration. The most important data-safety issue found in the UI was that “Reset all data” also resets Health & Fitness records, while the confirmation copy previously did not clearly disclose that. This copy has been corrected in the upgraded source.

## Findings and changes made

| Severity | Finding | Change / recommendation |
|---|---|---|
| High | Locked Vitest 5.1.1 requires Node `^22.12.0`, `^24`, or `>=26`, but README said Node 18 and GitHub Pages workflow used Node 20. | Added `engines.node >=22.12.0`, updated lockfile root metadata, README, and Pages workflow to Node 22.16.0. |
| High | Reset-all confirmation omitted Health & Fitness data even though `createDefaultData()` resets the entire app state, including health history. | Updated Danger Zone and confirmation copy to explicitly list all health data that will be erased. |
| Medium | Imported health dates were checked only with a `YYYY-MM-DD` regex, so impossible dates such as `2026-02-31` could pass sanitation. | Added strict calendar-date validation and applied it to health records, target dates, completion dates, and week keys. Added regression coverage. |
| Medium | Import JSON had no explicit size guard before parsing, allowing unexpectedly large pasted/file backups to consume memory. | Added a 5 MiB import limit, checked for files before reading and for pasted text before JSON parsing. |
| Medium | Data was stored in browser `localStorage` with no encryption or cross-device synchronization. | Documented this clearly. Do not store sensitive information on shared devices; export backups. Cloud sync requires a separately designed authenticated backend. |
| Medium | The application has no account/session boundary. Anyone with access to the same browser profile can access the planner data. | This is acceptable for a personal local-first tool, but not a multi-user/private cloud product without authentication and server-side authorization. |
| Medium | Health calculations use adult BMI categories and Mifflin–St Jeor estimates while the profile accepts ages 16–17 (with a warning). | Keep these estimates clearly non-medical; safest production change is to suppress adult weight-loss targets for minors and direct users to qualified clinical guidance. This needs a product/clinical decision, not just a code patch. |
| Low | Several input/import sanitizers have different allowed ranges from the interactive profile validator. | Reconcile these ranges in a follow-up pass so imported data and UI-created data follow the same rules. |
| Low | The app uses a small hash router and is already compatible with static hosting. | Added Azure SPA fallback configuration as a defensive deployment default. Hash routes do not require server routing in normal operation. |

## Security review

- No use of `dangerouslySetInnerHTML`, `eval`, `new Function`, or direct `innerHTML` assignment was found in the source scan.
- User-entered values are rendered through React text/attribute paths in the reviewed code; keep this pattern and avoid HTML injection APIs.
- JSON import is parsed as data and passed through sanitizers. The new 5 MiB cap reduces accidental oversized imports but is not a substitute for schema validation.
- `localStorage` is readable by JavaScript executing on the same origin. Do not store passwords, access tokens, or highly sensitive medical information there.
- Azure response headers added: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options`.
- A strict Content Security Policy was not added because `index.html` currently contains an inline theme bootstrap script. Add a CSP only after moving that script to a same-origin file or supplying a correct nonce/hash; otherwise a policy can break the initial theme behavior.
- Keep the Azure deployment token in GitHub Actions repository secrets only. Never commit it to YAML, source code, or README.

## UI/UX review

### Existing strengths

- Responsive desktop sidebar and mobile bottom navigation are already present.
- Light, dark, and system themes are supported.
- Shared component styles, clear cards, 44px minimum buttons/fields, focus-visible styles, and reduced-motion handling are present.
- Destructive actions use confirmation dialogs.
- Important chart regions and many icon-only actions already have accessible labels.
- Analytics and health chart pages are lazy-loaded, reducing initial JavaScript work.

### Recommended improvements

1. Add a first-run onboarding checklist explaining schedule setup, goals, health profile, and backup location.
2. Add a persistent “last backup” indicator and optional reminder; never silently upload user data.
3. Add empty-state actions that take users directly to the relevant creation form.
4. Review small-screen tables/charts at 320–375px widths and ensure horizontal overflow is intentional and discoverable.
5. Run keyboard-only and screen-reader checks for modal focus trapping, focus restoration, tab semantics, and chart summaries.
6. Add a dedicated privacy/data page explaining local-only storage, export contents, reset behavior, and the lack of cloud sync.
7. Add a daily review view with planned vs completed time, unfinished tasks, and tomorrow's priorities.

A visual/pixel-level design review still requires screenshots or a running browser build; this report does not claim a visual inspection that was not performed.

## Feature roadmap

**P0 — production safety:** Node version alignment, reproducible CI, explicit reset warning, import limits, strict date sanitation, Azure deployment.

**P1 — useful personal workflow:** installable PWA/offline app shell, optional local notifications, daily review, recurring habits/streaks, backup reminders, keyboard shortcuts.

**P2 — multi-device:** authenticated backend, server-side data model, per-user authorization, encrypted transport, conflict resolution, retention/export/delete controls. Do not treat browser `localStorage` events as cloud sync.

**P3 — optional intelligence:** weekly insights and schedule suggestions. Any AI feature should be opt-in and should not transmit health records unless the user explicitly understands and consents to that data flow.

## Azure deployment architecture

Recommended target: **Azure Static Web Apps**. The current app is static and needs no API/database. The included workflow runs `npm ci`, `npm test`, `npm run build`, then deploys `dist/` using the Azure Static Web Apps deployment action with `skip_app_build: true`. The deployment token is read from the GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.

Files added:

- `.github/workflows/azure-static-web-apps.yml`
- `public/staticwebapp.config.json`

The config is copied by Vite from `public/` into the build output. The workflow assumes the production branch is `main`.

## Verification status

- Static inspection completed.
- Regression tests added for impossible dates and oversized imports.
- Build/test execution could not be completed in this environment: the supplied `node_modules` tree was incomplete, and `npm ci` did not finish before the execution timeout. The local build reported missing TypeScript type definitions; the test command then reported `vitest: not found`. This is an environment/dependency-install failure, not evidence that the modified source compiles.
- Run `npm ci`, `npm test`, and `npm run build` locally or in GitHub Actions before merging/deploying. Do not treat the project as production-verified until all three pass.

## Azure setup checklist

1. Push the upgraded project to a GitHub repository on `main`.
2. Create an Azure Static Web App resource.
3. Obtain its deployment token.
4. Add the GitHub Actions secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`.
5. Push a commit and monitor the `Deploy to Azure Static Web Apps` workflow.
6. Open the deployed URL from the Azure resource Overview and test desktop/mobile, refresh, import/export, and persistence.
7. If Azure generated another deployment workflow during resource creation, disable/remove one of the duplicate workflows and keep only one deployment path.

## Official Azure references

- [Azure Static Web Apps build configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration)
- [Azure Static Web Apps configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration)
- [Deploy your web app to Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-web-framework)
