/**
 * PEOPLE PHOTOGRAPHY
 * ------------------
 * Every photo of a person on the public site is a crop of the approved
 * design assets — the character sheet, and the photos in the approved Life
 * at WorkRoute, FAQ and Who We Are Looking For designs — never stock and never generated. Each section
 * uses different people so the page does not repeat itself.
 *
 * Each crop was enlarged 4x with Real-ESRGAN (a super-resolution model, run
 * locally) so it stays clear in the large layouts, then published twice: at
 * twice the crop's size, and at four times (capped at 1600px wide). `width`
 * and `height` are the smaller file's, so the browser can reserve the space
 * before it loads; `width2x` tells it how wide the larger one is.
 */

export interface SiteImage {
  /** The 1x file under /public. */
  src: string;
  /** The larger file under /public, for sharp screens and wide layouts. */
  src2x: string;
  /** The 1x file's size. */
  width: number;
  height: number;
  /** The larger file's width. */
  width2x: number;
  alt: string;
}

function image(name: string, width: number, height: number, width2x: number, alt: string): SiteImage {
  return {
    src: `/images/workroute/${name}.webp`,
    src2x: `/images/workroute/${name}@2x.webp`,
    width,
    height,
    width2x,
    alt,
  };
}

export const images = {
  hero: image(
    "hero-agent-2",
    720,
    720,
    1200,
    "A smiling customer-support agent in a headset, with colleagues on calls behind her",
  ),
  aboutTeam: image(
    "about-team-2",
    800,
    534,
    1600,
    "A team leader showing three smiling support agents in headsets something on a screen",
  ),
  whyJoin: image(
    "why-join",
    552,
    680,
    1104,
"A support agent in glasses and a headset smiling while talking with a customer",
  ),
  lookingFor: image(
    "looking-for-2",
    720,
    456,
    1200,
    "A smiling support agent in a headset working at her computer",
  ),
  faq: image(
    "faq-agent-2",
    720,
    531,
    1200,
    "A support agent in a headset talking with a customer on a video call from home",
  ),
  lifeTeam: image(
    "life-team-2",
    860,
    573,
    1600,
    "Three WorkRoute team members in headsets smiling together at a computer",
  ),
  /** One photo per job page, in the header beside the role's pay. */
  callAgent: image(
    "call-agent-2",
    720,
    480,
    1200,
    "A smiling call-center agent in glasses and a headset talking with a customer at her computer",
  ),
  chatAgent: image(
    "chat-agent-2",
    720,
    480,
    1200,
    "A smiling support agent in a headset at her desk, with colleagues answering customers behind her",
  ),
  techAgent: image(
    "tech-agent-2",
    720,
    480,
    1200,
    "A smiling technical support agent in glasses and a headset at his computer",
  ),
  salesAgent: image(
    "sales-agent-2",
    720,
    720,
    1200,
    "A sales agent in a headset laughing on a call while taking notes",
  ),
  supportAgent: image(
    "support-agent-2",
    720,
    480,
    1200,
    "A customer support agent in a headset smiling while helping a customer at her computer",
  ),
} as const;

/**
 * The header photo for each open position, by slug, with where to anchor the
 * crop so the face stays in frame. A new job falls back to the support photo.
 */
export const jobImages: Record<string, { image: SiteImage; position: string }> = {
  "customer-support-representative": { image: images.supportAgent, position: "85% center" },
  "call-center-agent": { image: images.callAgent, position: "85% center" },
  "live-chat-and-email-support-agent": { image: images.chatAgent, position: "80% center" },
  "technical-support-representative": { image: images.techAgent, position: "75% center" },
  "sales-and-retention-agent": { image: images.salesAgent, position: "center 15%" },
};

export function jobImage(slug: string): { image: SiteImage; position: string } {
  return jobImages[slug] ?? { image: images.supportAgent, position: "85% center" };
}
