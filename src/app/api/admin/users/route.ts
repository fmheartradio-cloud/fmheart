import { NextResponse } from "next/server";
import { getAdminEmails, PRIMARY_ADMIN_EMAIL } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import { getStationState } from "@/services/station";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const emails = getAdminEmails();
  const state = await getStationState();
  return NextResponse.json({
    emails,
    primary: PRIMARY_ADMIN_EMAIL,
    you: auth.email,
    logs: state.logs.slice(0, 30),
  });
}
