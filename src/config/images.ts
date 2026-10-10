/**
 * PEOPLE PHOTOGRAPHY
 * ------------------
 * Every photo of a person on the public site is a crop of the approved
 * design assets — the character sheet, and the photos in the approved Life
 * at WorkRoute, FAQ and Who We Are Looking For designs — never stock and never generated. Each section
 * uses different people so the page does not repeat itself.
 *
 * Each crop is published at its own size and at twice that size (upscaled
 * with a sharpening filter, for high-density screens). `width` and `height`
 * are the 1x file's, so the browser can reserve the space before it loads.
 */

export interface SiteImage {
  /** The 1x file under /public. */
  src: string;
  /** The 2x file under /public. */
  src2x: string;
  width: number;
  height: number;
  alt: string;
}

function image(name: string, width: number, height: number, alt: string): SiteImage {
  return {
    src: `/images/workroute/${name}.webp`,
    src2x: `/images/workroute/${name}@2x.webp`,
    width,
    height,
    alt,
  };
}

export const images = {
  hero: image(
    "hero-agent",
    490,
    543,
    "A smiling customer-support agent wearing a headset, working on a laptop at home",
  ),
  aboutTeam: image(
    "about-team",
    590,
    340,
    "Three WorkRoute team members with headsets smiling together at a desk",
  ),
  whyJoin: image(
    "why-join",
    276,
    340,
    "A support agent in glasses and a headset smiling while talking with a customer",
  ),
  lookingFor: image(
    "looking-for",
    600,
    336,
    "A friendly support agent in a headset smiling while working on a laptop",
  ),
  faq: image(
    "faq-agent",
    536,
    284,
    "A smiling support agent in a headset and blazer, talking with a customer",
  ),
  lifeTeam: image(
    "life-team",
    650,
    508,
    "Four WorkRoute team members laughing together around a laptop",
  ),
  techAgent: image(
    "tech-agent",
    504,
    325,
    "A smiling support agent in glasses and a headset explaining a solution to a customer",
  ),
} as const;

/**
 * The header photo for each open position, by slug, with where to anchor the
 * crop so the face stays in frame. A new job falls back to the hero photo.
 */
export const jobImages: Record<string, { image: SiteImage; position: string }> = {
  "customer-support-representative": { image: images.lookingFor, position: "36% center" },
  "call-center-agent": { image: images.faq, position: "40% 30%" },
  "live-chat-and-email-support-agent": { image: images.hero, position: "center 30%" },
  "technical-support-representative": { image: images.techAgent, position: "45% center" },
  "sales-and-retention-agent": { image: images.lifeTeam, position: "60% center" },
};

export function jobImage(slug: string): { image: SiteImage; position: string } {
  return jobImages[slug] ?? { image: images.hero, position: "center 30%" };
}
