import { githubLoginRouter } from "./github.js";
import { Hono, type Context } from "hono";

import { Login } from "@/views/pages/login";
import Master from "@/views/master.js";
import { googleLoginRouter } from "./google.js";

export const loginRouter = new Hono();
loginRouter.route("/", githubLoginRouter);
loginRouter.route("/", googleLoginRouter);

loginRouter.get("/login", async (c: Context) => {
  if (c.get("session")) return c.redirect("/");
  return c.html(
    <Master>
      <Login />
    </Master>,
  );
});
