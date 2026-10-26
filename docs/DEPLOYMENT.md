# Deploy Forma

Forma needs static hosting only. No application server, database, document bucket, or credentials are required.

## Verify locally

Use Node 24 (or compatible Node >=22.12):

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

`npm ci` runs the installation script that copies PDF and OCR models into the public assets. Do not skip install scripts. The build output is `dist/`. Preview locally to check the exact production assets.

For browser tests, first run `npx playwright install chromium`. Then set `FORMA_TEST_BUILD=1` and run `npm run test:e2e` after a build. In PowerShell:

```powershell
$env:FORMA_TEST_BUILD='1'
npm run test:e2e
```

Tests use port 5175 so they do not replace your development server on port 5173.

## Cloudflare Pages with GitHub

1. Create a GitHub repository and push the project source, including `package-lock.json`. Exclude `node_modules/`, `dist/`, generated public model directories, and private documents using the supplied `.gitignore`.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Import an existing Git repository**.
3. Select the repository and production branch.
4. Set root directory to the repository root, build command to **`npm run build`**, and build output directory to **`dist`**.
5. Set build variable `NODE_VERSION=24`. No other variable is required. An optional `VITE_GITHUB_URL` can display a link to the actual public source repository.
6. Deploy. Cloudflare returns a `pages.dev` address and rebuilds on future pushes.

These settings follow [Cloudflare's React guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/). Account provisioning, Git push, and deployment have not been performed automatically.

## Direct upload without GitHub

Run `npm ci` and `npm run build`, then create a Pages **Direct Upload** project and upload the complete `dist/` folder. Include the nested `ocr-assets/` and `pdf-assets/` folders, not just `index.html`. See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/). Choose Git integration initially if you want automatic builds; Cloudflare documents that the project creation modes cannot later be switched directly.

## Check the live site

- Open `/studio` and a tool deep link directly, then refresh.
- Upload a synthetic receipt image and scanned PDF; confirm recognition, item columns, totals, and downloads.
- Check the mobile layout and keyboard controls.
- In browser Network tools, confirm OCR assets load from your site's origin and no document requests leave the browser.
- Verify the response security headers. Vite preview does not apply Cloudflare's `_headers` file itself.

`public/_redirects` provides SPA routing and `public/_headers` permits same-origin workers and WebAssembly while restricting other origins. Cloudflare's current individual static-asset limit is [25 MiB](https://developers.cloudflare.com/pages/platform/limits/); the bundled OCR model and decoder files are below that limit. No external asset store is required.

For another static host, configure an `index.html` fallback for client routes, retain HTTPS and worker/model MIME types, and translate the supplied security headers to that host's format.

## Updates and rollback

Review changes, rerun checks, and let Pages build a new deployment. Use the Pages dashboard to restore a prior deployment if needed. There are no database migrations or stored documents to roll back.
