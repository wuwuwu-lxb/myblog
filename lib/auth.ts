import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

const sessionCookieName = "selfwiki_session";
const stateCookieName = "selfwiki_oauth_state";
const sessionMaxAge = 60 * 60 * 24 * 14;
const devUser: AuthUser = {
  login: "local-dev",
  id: 0,
  avatarUrl: "",
  name: "Local Dev",
};

export type AuthUser = {
  login: string;
  id: number;
  avatarUrl: string;
  name: string | null;
};

export function getAuthConfig() {
  return {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    allowedLogin: process.env.GITHUB_ALLOWED_LOGIN ?? "",
    authSecret: process.env.AUTH_SECRET ?? "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

export function isAuthConfigured() {
  const config = getAuthConfig();
  return Boolean(config.clientId && config.clientSecret && config.allowedLogin && config.authSecret);
}

export function isDevAuthBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_AUTH_BYPASS === "1" &&
    !isAuthConfigured()
  );
}

export async function getCurrentUser() {
  if (isDevAuthBypassEnabled()) {
    return devUser;
  }

  const cookieStore = await cookies();
  const value = cookieStore.get(sessionCookieName)?.value;

  if (!value) {
    return null;
  }

  return verifySession(value);
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return user;
}

export function createOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function setOAuthState(response: NextResponse, state: string) {
  response.cookies.set(stateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });
}

export async function consumeOAuthState(state: string) {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(stateCookieName)?.value;

  if (!storedState || storedState !== state) {
    return false;
  }

  cookieStore.delete(stateCookieName);
  return true;
}

export function setSession(response: NextResponse, user: AuthUser) {
  response.cookies.set(sessionCookieName, signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionMaxAge,
    path: "/",
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

function signSession(user: AuthUser) {
  const payload = Buffer.from(
    JSON.stringify({
      user,
      expiresAt: Date.now() + sessionMaxAge * 1000,
    }),
  ).toString("base64url");
  const signature = sign(payload);

  return `${payload}.${signature}`;
}

function verifySession(value: string) {
  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      user: AuthUser;
      expiresAt: number;
    };

    if (parsed.expiresAt < Date.now()) {
      return null;
    }

    return parsed.user;
  } catch {
    return null;
  }
}

function sign(payload: string) {
  const secret = getAuthConfig().authSecret || "dev-secret";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
