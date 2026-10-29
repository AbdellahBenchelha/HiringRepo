/**
 * `npm start`: the production server, listening on IPv6 as well when the
 * machine has it.
 *
 * Railway's private network delivers connections over IPv6 — even to the
 * address that looks like IPv4 — so the workroute.team gateway (gateway/)
 * can only reach this server if it listens on "::". Plain `next start` ended
 * up on IPv4 only there, and every request from the gateway was accepted by
 * the network and never answered.
 *
 * `next start -H ::` cannot simply be written into package.json: on a
 * machine without IPv6 it fails to start at all. So this asks the machine
 * first, and only then chooses.
 */
import net from "node:net";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function hasIpv6() {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(0, "::", () => probe.close(() => resolve(true)));
  });
}

const ipv6 = await hasIpv6();
const args = ["start", ...(ipv6 ? ["-H", "::"] : []), ...process.argv.slice(2)];
console.log(`[start] next ${args.join(" ")}${ipv6 ? "" : "  (no IPv6 on this machine)"}`);

const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), ...args], { stdio: "inherit" });

// Pass the platform's stop signal on, so a redeploy shuts down cleanly.
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
