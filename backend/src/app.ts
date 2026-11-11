import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { webhook } from "./controllers/payments.controller";
import { errorHandler, notFound } from "./middleware/errors";
import { apiLimiter } from "./middleware/rateLimit";
import { apiRouter } from "./routes";

export const app = express();

app.set("trust proxy", 1); // behind Render/Railway: real client IPs and secure cookies
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(cookieParser());

// Stripe signature verification requires the untouched request bytes. This must stay before express.json().
app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }), webhook);

app.use(express.json({ limit: "100kb" }));
app.use("/api", apiLimiter, apiRouter);

// Production, single-service hosting: serve the built React app with an SPA fallback.
if (env.SERVE_CLIENT) {
  const dist = path.resolve(__dirname, "../../client/dist"); // server/dist/app.js -> client/dist
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler); // always last
