import { OAuth2RequestError, generateState } from "arctic";
import { Hono } from "hono";
import { github, lucia } from "../../lib/auth";
import { prisma } from "../../lib/db";
import { parseCookies, serializeCookie } from "oslo/cookie";
import { generateId } from "lucia";

interface GitHubUser {
  id: number;
  name: string;
  login: string;
}

export const githubLoginRouter = new Hono();

githubLoginRouter.get("/login/github", async (c) => {
  const state = generateState();
  const url = await github.createAuthorizationURL(state);
  c.header(
    "Set-Cookie",
    serializeCookie("github_oauth_state", state, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "lax",
    }),
  );
  return c.redirect(url.toString());
});

githubLoginRouter.get("/login/github/callback", async (c) => {
  const code = c.req.query("code") ?? null;
  const state = c.req.query("state") ?? null;

  const storedState =
    parseCookies(c.req.header("cookie") ?? "").get("github_oauth_state") ??
    null;

  if (!code || !state || !storedState || state !== storedState) {
    console.log(code, state, storedState);
    return c.status(400);
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);

    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    const githubUser = (await githubUserResponse.json()) as GitHubUser;

    const existingAccount = await prisma.account.findUnique({
      where: { providerAccountId: `${githubUser.id}` },
    });

    if (existingAccount) {
      const existingUser = await prisma.user.findUnique({
        where: { id: existingAccount.userId },
      });
      if (!existingUser) throw new Error(`User not existed.`);
      const session = await lucia.createSession(existingUser.id, {});

      c.header("Set-Cookie", lucia.createSessionCookie(session.id).serialize());
      return c.redirect("/");
    }

    const userId = generateId(15);
    const user = await prisma.user.create({
      data: {
        id: userId,
        name: githubUser.login,
      },
    });
    const account = await prisma.account.create({
      data: {
        id: generateId(15),
        userId: user.id,
        provider: "github",
        providerAccountId: `${githubUser.id}`,
      },
    });

    const session = await lucia.createSession(userId, {});
    console.log(`session :>>`, session);

    c.header("Set-Cookie", lucia.createSessionCookie(session.id).serialize());
    return c.redirect("/");
  } catch (e) {
    console.log(e);
    if (
      e instanceof OAuth2RequestError &&
      e.message === "bad_verification_code"
    ) {
      // invalid code
      return c.status(400);
    }
    return c.status(500);
  }
});
