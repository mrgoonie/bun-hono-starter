import { Hono } from "hono";
import { etag } from "hono/etag";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";

import { verifyRequest, validateSession } from "./lib/auth";

import { mainRouter } from "./routes";
import { loginRouter } from "./routes/login";
import { logoutRouter } from "./routes/logout";

import type { User, Session } from "lucia";
import { env } from "./env.js";

// initialize
const app = new Hono();
// logs
app.use(etag());
app.use(logger());

// CORS
app.use(cors());

// assets
app.use("*", serveStatic({ root: "public" }));

// auth middleware: verify request origin & validate session
app.use("*", verifyRequest);
app.use("*", validateSession);

// routes
app.route("/", mainRouter);
app.route("/", loginRouter);
app.route("/", logoutRouter);

// success
console.log(`✅ Server running on port ${env.PORT}`);

declare global {
  namespace Express {
    interface Locals {
      user: User | null;
      session: Session | null;
    }
  }
}

export default {
  port: 3000,
  fetch: app.fetch,
};
