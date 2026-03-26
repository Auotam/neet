import { createMaintenanceToken, MAINTENANCE_COOKIE_NAME } from "@/lib/maintenance-token";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (process.env.MAINTENANCE_MODE !== "true") {
    return NextResponse.json({ error: "Maintenance mode is off" }, { status: 404 });
  }

  const expected = process.env.MAINTENANCE_PASSWORD;
  if (!expected?.trim()) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password !== expected) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createMaintenanceToken();
  if (!token) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(MAINTENANCE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
