# MyLife Planner

A personal timetable and productivity dashboard. It is a fully static single-page app (React + TypeScript + Vite + Tailwind CSS): no backend, no login, no database. Everything is stored in your browser's `localStorage`.

## Features

- **Dashboard** – greeting, live clock, current activity with progress and time remaining, next-up countdown, daily overview cards (study, DSA, development, academics, Japanese, YouTube), today's schedule with active / upcoming / past / completed states, daily completion percentage, Monday–Sunday switcher and daily / weekly views.
- **Editable timetable** – add, edit and delete activities, change times, names and categories, a different schedule for every day, copy one day to others, reset a day or the whole timetable, custom categories, automatic saving. Invalid times are blocked and overlaps are flagged.
- **Weekly analytics** – hours by category (bar), percentage distribution (pie), daily study comparison (stacked bar) and total productive hours. All values are calculated from the timetable; overlapping minutes are counted once.
- **Weekly goals** – targets with progress bars and manual `+` / `−` / number input. Progress is stored per week, so each Monday starts fresh.
- **Settings** – light / dark / system theme, 12h / 24h clock, category manager, JSON export and import (file or pasted text) and reset with confirmation.
- **Health & Fitness** (new, see below) – overview, food diary, weight tracker, reports and a health profile.
- Responsive: sidebar on desktop, compact header plus bottom navigation on mobile.

## Quick start

Requires Node.js 22.12 or newer (the locked Vitest version requires this).

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check and produce a production build in dist/
npm run preview   # serve the production build locally
```

## Health & Fitness module

A wellness tracker, **not a medical tool**. All figures are estimates and everything stays in your browser.

- **Health Profile & Settings** – age, optional sex, height, current / target weight, activity level, goal (lose / maintain), pace (0.25 / 0.5 / 0.75 kg a week), optional target date, diet preference, calorie / protein / water targets, kg/lb and cm/ft units. Shows BMI (with its limits explained), BMR (Mifflin-St Jeor), TDEE, a suggested gradual-loss calorie range and suggested protein. You can override calorie and protein targets; when a profile change would alter the suggestions you are asked whether to update your custom targets. Deficits are capped (25% of TDEE, calorie floors, stricter for under-18s) and unrealistic target dates are rejected.
- **Overview** – weight, remaining weight, calories, protein, water, exercise, progress bars, today's meals, 7-day calorie chart and quick actions.
- **Food Diary** – Breakfast / Lunch / Evening Snacks / Dinner / Other Snacks, searchable food list, favourites, custom foods, Small / Medium / Large / custom-weight portions and servings, copy previous day. Entries store their own totals, so editing a food never rewrites history.
- **Starter foods** – about 110 items from the hostel mess menu. The menu PDF has no nutrition data, so the calories and macros are **rough, editable estimates** (shown with `~`); actual values depend on the recipe. Starter items can be edited and restored but not deleted.
- **Weight Tracker** – add / edit / delete (with confirmation), one entry per date, history, 7-day and 30-day averages, daily / weekly / monthly charts with a target line. Changing your profile never deletes history.
- **Reports** – 7 days, 30 days or a custom range: weight change (average of the first and last days, never a single reading), average calories / protein / water, exercise frequency, calories by meal and charts.
- Exercise calories are **never** subtracted automatically. An optional setting adds half of the logged estimate to your budget.

### Data, migration and backup
- Data format is now version 2 (`health` added). Existing data is migrated automatically, and a one-time raw copy is stored under `mylife-planner:v1:pre-health-backup`.
- Export includes health data. Importing an older (v1) file still works and keeps your current health data.
- Several tabs: the newest saved data is adopted before each change, so a stale tab will not overwrite another.

## Tests

```bash
npm test          # vitest: schedule, storage/migration, health formulas, stats, reducer
```

## Project structure

```
src/
  main.tsx, App.tsx, index.css
  types.ts                  Activity, Category, Goal, AppData types
  data/defaults.ts          Default categories, timetable and goals (data, not UI)
  lib/
    time.ts                 Parsing and formatting of times and durations
    dates.ts                Day names, week keys, greetings
    schedule.ts             Segments, overlap handling, current / next activity, validation
    analytics.ts            Weekly and daily aggregation
    storage.ts              localStorage load / save, sanitising, export / import
  store/AppContext.tsx      State (reducer), autosave, theme handling
  hooks/                    useNow (live clock), useHashPage (tiny router)
  components/
    layout/Shell.tsx        Sidebar, mobile header, bottom navigation
    ui/                     Modal, ConfirmDialog, ProgressBar, DayTabs, ...
    schedule/ dashboard/ timetable/
  pages/                    Dashboard, Timetable, Analytics, Goals, Settings
  pages/health/             Overview, Food Diary, Weight, Reports, Profile
  components/health/        Food / weight / water / exercise / profile dialogs, charts
  lib/health*.ts            Formulas, statistics, health data sanitising
  data/starterFoods.ts      Starter food list (estimates)
  store/reducer.ts          Pure reducer (tested)
```

## How the data works

- The default schedule lives in `src/data/defaults.ts`. Edit that file to change what a fresh install or "Reset" restores.
- Times are stored as 24-hour `"HH:MM"` strings. If an activity ends before it starts (for example Sleep `23:30` → `06:30`) it continues past midnight and the remainder is shown at the start of the next day.
- Categories have a "Counts as" setting: **Study** counts toward study and productive hours, **Productive** counts toward productive hours only (YouTube by default), **Other** counts toward neither. College is "Other" by default; change it in the category manager if you want it counted.
- Saturday and Sunday evenings ("8:45 PM onwards", "8:30 PM onwards") run until midnight by default, and the default weekend timetables do not include a Sleep block. Add one on the Timetable page if you want it included in the weekly totals; the difference shows up as "Unscheduled" in analytics.

## Using it on laptop and phone

`localStorage` is specific to each browser, so your phone and laptop do not sync automatically. To move your changes:

1. On the source device open **Settings → Backup & transfer** and either **Download JSON** or **Copy JSON**.
2. On the other device open the same page and choose **Import from file** or **Import from pasted text**.
3. Confirm the import. It replaces the data on that device.

Clearing site data in your browser also clears the planner, so export a backup now and then.

## Deployment

The build uses a relative base path (`base: './'`), so the same `dist/` folder works on GitHub Pages (user or project site), Azure Static Web Apps and any other static host. Routing uses the URL hash (`#/timetable`), so no server-side rewrite rules are needed.

### GitHub Pages (automatic, recommended)

1. Create a GitHub repository and push this project to the `main` branch.
2. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow `.github/workflows/deploy-pages.yml` builds and publishes on every push to `main`.
4. Your site will be available at `https://<your-username>.github.io/<repository-name>/`.

### GitHub Pages (manual)

```bash
npm run build
npx gh-pages -d dist
```

Then set **Settings → Pages → Source** to the `gh-pages` branch.

### Azure Static Web Apps (configured workflow)

The repository includes `.github/workflows/azure-static-web-apps.yml`. It runs the tests and production build, then uploads the generated `dist/` folder to Azure. The app is static: no API or database is required.

1. Push this repository to GitHub on the `main` branch.
2. In the Azure Portal, create **Static Web App** and choose the Free plan for a personal project (check current regional availability and limits).
3. Choose **Other** as the deployment source if you want to use the included workflow, or create the resource without letting Azure generate a second workflow.
4. Open the Static Web App resource and copy its deployment token from **Manage deployment token**.
5. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**. Name it exactly `AZURE_STATIC_WEB_APPS_API_TOKEN` and paste the token as its value. Never commit the token to the repository.
6. Push to `main`, then open **Actions → Deploy to Azure Static Web Apps** and wait for the workflow to finish. The deployed URL is shown in the Azure resource Overview.
7. The workflow builds to `dist/`, runs tests first, and uploads that directory. The API location is intentionally empty.

`public/staticwebapp.config.json` is copied to the deployment root. It configures the SPA fallback and baseline response headers.

If you prefer Azure Portal to generate its own GitHub Actions workflow, do not also enable the included Azure workflow; use only one deployment workflow to avoid duplicate deployments. The portal-generated build settings for this Vite app are App location `/`, API location empty, and Output location `dist`..

### Other hosts

Netlify, Cloudflare Pages, Vercel or any file server: build with `npm run build` and upload the `dist/` folder.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | `tsc -b` type-check followed by `vite build` |
| `npm run preview` | Serves the built `dist/` folder locally |
| `npm run typecheck` | Type-check only |
| `npm test` | Run the unit tests once |
| `npm run test:watch` | Tests in watch mode |


## Deployment (Azure Static Web Apps + GitHub Pages)

This repository includes two independent GitHub Actions workflows. Both deploy the same Vite `dist/` build from the `main` branch:

- **Azure:** `.github/workflows/azure-static-web-apps.yml`
- **GitHub Pages:** `.github/workflows/deploy-pages.yml`

The Vite `base: './'` setting and hash-based router support both the Azure root URL and a GitHub Pages project-site subpath.

### Local verification

Use Node.js **22.16.0** (also recorded in `.nvmrc`):

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run preview
```

Before publishing, verify the preview in a browser at desktop and mobile widths. Test navigation, refresh, local persistence, JSON export/import, and the reset confirmation.

### Azure setup

1. Push this repository to GitHub and use `main` as the production branch.
2. Create an **Azure Static Web App** and connect the GitHub repository. If Azure creates its own deployment workflow, keep only one Azure deployment workflow to avoid duplicate deployments.
3. In the Azure Static Web App resource, copy its deployment token.
4. In GitHub, open **Settings → Secrets and variables → Actions** and create the repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.
5. Confirm the Azure workflow is enabled, then push to `main` or run it manually from **Actions**.
6. The workflow runs `npm ci`, tests, and `npm run build`, then uploads the already-built `dist/` directory to Azure.

No API or database is required for this local-first version. The app's planner and health data remain in each browser's `localStorage`; hosting the static files on Azure does **not** synchronize data between devices.

### GitHub Pages setup

1. In the GitHub repository, open **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Push to `main` or run **Deploy to GitHub Pages** manually from the Actions tab.
4. Use the Pages URL shown in the deployment job.

### Important privacy and release checks

- Never commit exported planner JSON files, `.env` files, deployment tokens, or other private data.
- The Azure deployment token belongs only in the GitHub Actions secret named above.
- This app does not provide accounts, server-side authorization, encryption of browser storage, or cloud backup. Avoid using it for highly sensitive health information or on a shared browser profile.
- Test the Azure and Pages URLs separately after deployment. Check that static assets load, all hash routes work after refresh, and browser storage remains available.
- Keep only the hosting workflow(s) you intend to use enabled. Both workflows are included because this project is intended to deploy to both Azure and GitHub Pages.
