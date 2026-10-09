/**
 * PEOPLE PHOTOGRAPHY
 * ------------------
 * Every photo of a person on the public site is a crop of the approved
 * design assets — the character sheet, and the team photo from the approved
 * Life at WorkRoute design — never stock and never generated. Each section
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
    376,
    200,
    "A friendly support agent with a headset smiling at a computer",
  ),
  faq: image("faq-agent", 376, 200, "A support agent smiling while working on a laptop"),
  lifeTeam: image(
    "life-team",
    650,
    508,
    "Four WorkRoute team members laughing together around a laptop",
  ),
} as const;
