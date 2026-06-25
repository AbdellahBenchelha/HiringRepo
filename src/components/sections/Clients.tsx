import { clients, type Client } from "@/config/content";

/** A single company "logo" lockup — monogram badge + wordmark. */
function ClientLogo({ client }: { client: Client }) {
  return (
    <div className="mx-3 flex shrink-0 items-center gap-3 rounded-2xl border border-navy-100 bg-white px-5 py-3.5 shadow-soft">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-bold text-white">
        {client.name.charAt(0)}
      </span>
      <span className="leading-tight">
        <span className="block whitespace-nowrap text-sm font-semibold text-navy-900">
          {client.name}
        </span>
        <span className="block text-xs text-navy-500">{client.industry}</span>
      </span>
    </div>
  );
}

/** One infinite-scrolling row. Items are duplicated for a seamless loop. */
function MarqueeRow({ items, reverse = false }: { items: Client[]; reverse?: boolean }) {
  return (
    <div className="group flex overflow-hidden py-2">
      <div
        className={`flex min-w-full shrink-0 animate-marquee items-center group-hover:[animation-play-state:paused] ${
          reverse ? "[animation-direction:reverse]" : ""
        }`}
      >
        {items.map((client) => (
          <ClientLogo key={client.name} client={client} />
        ))}
        {/* Duplicate set for the seamless wrap-around */}
        {items.map((client) => (
          <ClientLogo key={`${client.name}-dup`} client={client} />
        ))}
      </div>
    </div>
  );
}

export function Clients() {
  const mid = Math.ceil(clients.length / 2);
  const rowOne = clients.slice(0, mid);
  const rowTwo = clients.slice(mid);

  return (
    <section id="clients" className="section bg-navy-50/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="pill uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Our Clients
          </span>
          <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl">
            Companies we work with
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
            We support customer experience teams at {clients.length}+ international
            brands across technology, finance, retail, healthcare, and more.
          </p>
        </div>
      </div>

      {/* Full-bleed marquee with edge fade masks */}
      <div className="relative mt-12 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <MarqueeRow items={rowOne} />
        <MarqueeRow items={rowTwo} reverse />
      </div>
    </section>
  );
}
