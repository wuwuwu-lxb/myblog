import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { recordSiteVisit, type VisitGeo } from "@/lib/db";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    path?: string;
    visitorId?: string;
    eventType?: "site" | "page";
  };
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for") ?? "";
  const realIp = headerList.get("x-real-ip") ?? "";
  const ipAddress = forwardedFor.split(",")[0]?.trim() || realIp;
  const userAgent = headerList.get("user-agent") ?? "";
  const geo = await lookupGeo(ipAddress);

  recordSiteVisit({
    path: payload.path ?? "/",
    ipAddress,
    visitorId: payload.visitorId,
    eventType: payload.eventType === "page" ? "page" : "site",
    userAgent,
    geo,
  });

  return NextResponse.json({ ok: true });
}

async function lookupGeo(ipAddress: string): Promise<VisitGeo | undefined> {
  if (!ipAddress || isPrivateIp(ipAddress)) {
    return undefined;
  }

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ipAddress)}/json/`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(1800),
    });

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as {
      country_name?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };

    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return undefined;
    }

    return {
      country: data.country_name,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch {
    return undefined;
  }
}

function isPrivateIp(ipAddress: string) {
  return (
    ipAddress === "::1" ||
    ipAddress === "127.0.0.1" ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ipAddress) ||
    ipAddress.startsWith("fc") ||
    ipAddress.startsWith("fd")
  );
}
