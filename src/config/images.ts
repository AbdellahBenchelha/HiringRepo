/**
 * PEOPLE PHOTOGRAPHY
 * ------------------
 * Every photo of a person on the public site is a crop of the one approved
 * character sheet, never stock and never generated. Each section uses a
 * different person so the page does not repeat itself.
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
  life: [
    image("life-1", 280, 162, "A support agent with a headset smiling during a call"),
    image("life-2", 326, 162, "A support agent in a headset smiling in a bright office"),
    image("life-3", 368, 204, "A support agent explaining something on a call"),
    image("life-4", 350, 204, "A support agent smiling while typing on a laptop"),
  ],
} as const;
