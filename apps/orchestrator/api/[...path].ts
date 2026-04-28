// Vercel Serverless catch-all that proxies every /api/* request into the
// Express 5 app from artifacts/api-server. Vercel's @vercel/node bundler
// inlines the workspace deps, so we don't need to pre-build the api-server
// for this entrypoint to work.
//
// Express's `app` instance is itself a (req, res) handler, so we can
// re-export it directly. All routing (path params, etc.) happens inside
// Express as if it were running under `node dist/index.mjs`.
import app from "../artifacts/api-server/src/app";

export default app;
