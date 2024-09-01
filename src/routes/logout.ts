import { Hono, type Context } from "hono";
import { lucia } from "../lib/auth.js";

export const logoutRouter = new Hono();

logoutRouter.post("/", async (c: Context) => {
  const session = c.get("session");
  if (!session) {
    return c.status(401);
  }
  await lucia.invalidateSession(session.id);
  const blankSessionCookie = lucia.createBlankSessionCookie();

  // Set the cookie header
  c.header("Set-Cookie", blankSessionCookie.serialize());

  // Perform the redirect
  return c.redirect("/login", 302);
});
