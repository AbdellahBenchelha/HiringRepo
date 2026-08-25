import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { deleteObject, getObjectBytes, headObject, presignUpload, r2Configured } from "@/lib/r2";

/**
 * Does document storage actually work?
 *
 * Visit while signed into the Admin Panel. It performs a complete round trip —
 * sign, upload, read back, delete — entirely from the server, then reports what
 * happened at each step.
 *
 * Running it server-side is the point. A browser upload can fail for three
 * unrelated reasons that look identical from the outside: the credentials are
 * wrong, the Content-Security-Policy blocked the request, or the bucket has no
 * CORS rule. Neither the policy nor CORS applies to a request made from here,
 * so a pass means the credentials and the bucket are fine and the problem is in
 * the browser; a failure means it never got that far.
 */

export const runtime = "nodejs";

export async function GET() {
  // Request-local: a module-level array would be shared between concurrent
  // requests and interleave their results.
  const steps: string[] = [];
  const note = (s: string) => steps.push(s);

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const missing = (
    ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const
  ).filter((v) => !process.env[v]?.trim());

  if (!r2Configured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      missingVariables: missing,
      diagnosis:
        "Storage is not configured. Add the missing variables to the host's environment and redeploy.",
    });
  }

  const bucket = process.env.R2_BUCKET?.trim();
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const key = `diagnostics/storage-check-${Date.now()}.txt`;
  const payload = "workroute storage check";

  // The account id and the access key id are both 32 hex characters, which
  // makes them easy to swap. A wrong one produces a hostname that does not
  // exist, and the only symptom is a connection failure much later.
  const idLooksWrong = accountId.includes("/")
    ? "R2_ACCOUNT_ID contains a slash — it should be only the id from the endpoint, not the whole URL."
    : !/^[0-9a-f]{32}$/i.test(accountId)
      ? `R2_ACCOUNT_ID is ${accountId.length} characters; an account id is 32 hexadecimal characters.`
      : null;

  try {
    const url = await presignUpload(key, "text/plain");
    if (!url) {
      return NextResponse.json({
        ok: false,
        configured: true,
        bucket,
        diagnosis: "Could not sign an upload URL. The credentials are probably malformed.",
      });
    }
    note("signed an upload URL");

    const put = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: payload,
    });
    if (!put.ok) {
      const detail = await put.text().catch(() => "");
      return NextResponse.json({
        ok: false,
        configured: true,
        bucket,
        steps,
        httpStatus: put.status,
        detail: detail.slice(0, 400),
        diagnosis:
          put.status === 403
            ? "Storage rejected the credentials. Check the API token is for this bucket and has Object Read & Write, and that R2_ACCOUNT_ID matches the endpoint."
            : put.status === 404
              ? `Storage says bucket "${bucket}" does not exist. Check the name and the account.`
              : "Storage refused the upload. The detail field has its reply.",
      });
    }
    note("uploaded a test object");

    const head = await headObject(key);
    if (!head) {
      return NextResponse.json({
        ok: false, configured: true, bucket, steps,
        diagnosis: "The upload was accepted but the object could not be found afterwards.",
      });
    }
    note(`read it back (${head.size} bytes)`);

    const bytes = await getObjectBytes(key, 1024);
    const roundTripped = bytes ? Buffer.from(bytes).toString("utf8") === payload : false;
    note(roundTripped ? "contents match" : "contents did NOT match");

    await deleteObject(key);
    note("deleted the test object");

    return NextResponse.json({
      ok: roundTripped,
      configured: true,
      bucket,
      // The endpoint the browser is told to upload to, so it can be compared
      // against the CSP and the bucket's CORS rule.
      endpoint,
      steps,
      diagnosis: roundTripped
        ? "Storage works from the server. If candidate uploads still fail, the problem is in the browser: check the bucket's CORS rule allows PUT from your site's exact address, and that the deployed build has the storage origin in its Content-Security-Policy."
        : "The object was stored but came back different.",
    });
  } catch (err) {
    // node's fetch reports every connection problem as "fetch failed" and puts
    // the real reason underneath. Unwrapped, that is the difference between a
    // hostname that does not exist and one that refused the connection.
    const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
    const code = cause?.code ?? "";
    const unresolved = code === "ENOTFOUND" || code === "EAI_AGAIN";

    return NextResponse.json({
      ok: false,
      configured: true,
      bucket,
      endpoint,
      steps,
      error: err instanceof Error ? err.message : String(err),
      cause: code || cause?.message || undefined,
      accountIdWarning: idLooksWrong ?? undefined,
      diagnosis: idLooksWrong
        ? idLooksWrong
        : unresolved
          ? `The host ${endpoint} could not be resolved. Cloudflare answers for every well-formed account id, so this means R2_ACCOUNT_ID is malformed rather than merely wrong — most often the whole endpoint URL pasted in where only the id belongs, or a stray space or newline inside it.`
          : "Could not reach storage. The cause field has the underlying network error.",
    });
  }
}
