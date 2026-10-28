import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/teamAuth";
import { accrueMember, getMember, getWork } from "@/lib/teamStore";
import { statementPdf } from "@/lib/teamPdf";

/** One month's statement, as a PDF download. */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const s = await getMemberSession();
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ ok: false, error: "bad_month" }, { status: 400 });
  }
  await accrueMember(s.member.id);
  const member = (await getMember(s.member.id)) ?? s.member;
  const pdf = await statementPdf(member, month, await getWork(member.id));
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="workroute-statement-${month}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
