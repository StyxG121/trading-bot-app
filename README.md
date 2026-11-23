# Trading Bot

Mobile dashboard for an AI memecoin trading bot. It is a static PWA: install it from Safari or Chrome and it opens full screen, without the browser toolbar.

Paper mode shows the latest snapshot. Real mode keeps the same layout and stays on **Not live yet** until that side of the file has trades or equity.

Numbers are SOL. A USD estimate appears when CoinGecko (or, if that fails, Jupiter) returns a SOL price. If both fail, the SOL figures stay and the dollar line is hidden.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open the URL Vite prints. Production build:

```bash
npm run build
npm run preview
```

`npm run build` typechecks, then writes static files to `dist/`.

## Data

The app loads one JSON document. The bundled file is `public/data/snapshot.json`. Replace that file and redeploy, or point the app at another URL:

- Query string: `/?data=https://example.com/snapshot.json`
- Settings (gear) → Snapshot URL, saved in `localStorage`

The query string wins over the saved URL. The saved URL wins over the bundled file. The host that serves a custom URL must send `Access-Control-Allow-Origin` for this site.

The snapshot is fetched on load, every 60 seconds, and whenever the app regains focus. “Updated” is the snapshot’s `as_of_vienna` clock. “Synced” is the last successful fetch, also shown in Europe/Vienna.

Missing fields render as an em dash or an empty state. The UI does not fill gaps with made-up balances, scores, or chart points. `0` is shown when the file says `0`.

### Shape

```json
{
  "as_of_vienna": "23 Nov 2026, 01:26",
  "as_of_iso": "2026-11-23T01:26:41+01:00",
  "zone": "Europe/Vienna (CET, UTC+1)",
  "mode": "PAPER ONLY until an explicit go-live",
  "paper": {
    "start_bankroll_sol": 10,
    "bankroll_sol": 9.855991,
    "gross_pnl_sol": -0.133411,
    "net_pnl_sol": -0.144009,
    "wins": 0,
    "losses": 1,
    "win_rate_pct": 0,
    "open_count": 0,
    "open": [],
    "days_left": 6.8,
    "week_end": "Sun 29 Nov 2026, 20:00",
    "equity": [{ "label": "22 Nov start", "value": 10 }, { "label": "22 Nov 21:09", "value": 9.855991 }],
    "closed_trades": [],
    "budget_pnl": [],
    "activity": [],
    "rules_version": "v3",
    "rules_date": "22 Nov 2026",
    "key_rules": [],
    "lessons": [],
    "toptraders": []
  },
  "real": {
    "status": "Not live, waiting for go-live",
    "wallet": null,
    "chain": "Solana (Phantom)",
    "balance_sol": 0,
    "planned_budget_usd": "$400-500",
    "leverage_rules": []
  }
}
```

Equity labels with a clock (`22 Nov 21:09`, `22 Nov 2026, 21:09`) are placed in Europe/Vienna using the offset on `as_of_iso`. `22 Nov start` is the start of that calendar day. LIVE / 1H / 4H / 1D / 1W keep only marks inside that window before `as_of_iso`. A window with no marks says so. It does not reuse older points.

`paper.activity` feeds the Scanner card (latest scan’s pool count, pass/warn/fail line, and near misses) and the activity tape. Closed trades become Bought and Sold rows. A monitor line at the same minute as a sale is not repeated.

## Install

The manifest is `public/manifest.webmanifest` (`display: standalone`). `public/sw.js` is the service worker.

- iPhone: Share → Add to Home Screen. The status bar uses the black theme.
- Android: Chrome menu → Install app, or Add to Home screen. The same steps are in Settings.

## Live app (GitHub Pages)

The public site is [https://styxg121.github.io/trading-bot-app/](https://styxg121.github.io/trading-bot-app/).

On a phone, open that link, then:

- iPhone: Share → Add to Home Screen
- Android: Chrome menu → Install app, or Add to Home Screen

The production build uses the `/trading-bot-app/` base path. Local `npm run dev` still uses `/`. GitHub Actions sets `GITHUB_PAGES=true` on `npm run build` and deploys `dist/` with `actions/deploy-pages`.

To refresh the numbers, run `/workspace/trading/push_app_snapshot.sh` on the bot box. It regenerates `public/data/snapshot.json` from the paper-trading book and pushes only that file to this repo, which triggers a Pages rebuild.

## Deploy on Vercel from Origin

The site is static. Vercel only has to build it.

1. Push this project to Origin.
2. In Vercel, create a project and import the Origin repository (connect Origin under Vercel’s git integrations if it is not listed yet).
3. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`. No environment variables are required.
4. Deploy.

If the Vercel importer does not list Origin, run `npx vercel` from this folder after `npm run build` and link a project. The output is still `dist/`.

`vercel.json` tells Vercel not to cache `/data/*` or `/sw.js`, so a replaced snapshot and a new service worker show up on the next visit.

To publish a new book, commit a new `public/data/snapshot.json` and redeploy, or leave the deployment alone and open `/?data=` against a URL you update in place.
