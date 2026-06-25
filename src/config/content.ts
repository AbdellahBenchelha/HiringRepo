/**
 * EDITORIAL CONTENT
 * -----------------
 * Benefits, candidate requirements, recruitment process steps, testimonials,
 * and FAQs. All copy here is editable from a single place.
 */

export interface Benefit {
  title: string;
  description: string;
  icon: string; // matches a key in components/Icon.tsx
}

export const benefits: Benefit[] = [
  {
    title: "Competitive Compensation",
    description:
      "Fair, market-aware pay packages designed to reward your contribution and growth.",
    icon: "wallet",
  },
  {
    title: "Performance Bonuses",
    description:
      "Recognition and rewards for meeting quality, service, and team goals.",
    icon: "trophy",
  },
  {
    title: "Paid Professional Training",
    description:
      "Comprehensive, paid onboarding and ongoing training to set you up for success.",
    icon: "graduation",
  },
  {
    title: "Career Development",
    description:
      "Clear pathways to grow your skills, your role, and your responsibilities.",
    icon: "trendingUp",
  },
  {
    title: "Supportive Management",
    description:
      "Approachable leaders and coaches who invest in your day-to-day success.",
    icon: "handshake",
  },
  {
    title: "Friendly, Inclusive Workplace",
    description:
      "A welcoming culture where people of all backgrounds feel respected and valued.",
    icon: "users",
  },
  {
    title: "Flexible Schedules",
    description:
      "Schedule options that depend on the position, helping you balance work and life.",
    icon: "clock",
  },
  {
    title: "On-site, Hybrid & Remote",
    description:
      "Work arrangements available depending on the role and location.",
    icon: "globe",
  },
  {
    title: "International Experience",
    description:
      "Support customers across global markets and broaden your professional horizons.",
    icon: "world",
  },
  {
    title: "Language Development",
    description:
      "Strengthen your communication and language skills in a real, professional setting.",
    icon: "chat",
  },
  {
    title: "Internal Promotions",
    description:
      "We promote from within — many of our leaders started on the front line.",
    icon: "ladder",
  },
  {
    title: "Modern Tools & Environment",
    description:
      "Work with up-to-date systems and tools in a comfortable, modern environment.",
    icon: "sparkles",
  },
];

export const candidateRequirements: string[] = [
  "Excellent verbal and written communication",
  "A friendly, professional, and patient personality",
  "Strong listening and problem-solving skills",
  "Basic computer and internet knowledge",
  "Reliability and punctuality",
  "Ability to work with targets and quality standards",
  "Willingness to learn",
  "Previous call-center or customer-support experience is an advantage",
  "Fluency in one or more required languages",
];

export interface ProcessStep {
  title: string;
  description: string;
}

export const recruitmentProcess: ProcessStep[] = [
  {
    title: "Submit Your Application",
    description:
      "Complete the online application form and, if you have one, attach your CV and supporting documents.",
  },
  {
    title: "Initial Application Review",
    description:
      "Our recruitment team reviews your application against the requirements of the role.",
  },
  {
    title: "Phone or Video Interview",
    description:
      "A friendly conversation to learn more about you, your goals, and your communication style.",
  },
  {
    title: "Language or Skills Assessment",
    description:
      "A short assessment of the language and skills relevant to the position you applied for.",
  },
  {
    title: "Final Interview",
    description:
      "A more detailed discussion with the hiring team about the role and your fit.",
  },
  {
    title: "Job Offer and Onboarding",
    description:
      "Successful candidates receive an offer and begin our supportive, paid onboarding program.",
  },
];

/**
 * EMPLOYEE TESTIMONIALS
 * ⚠️ PLACEHOLDER CONTENT — these are FICTIONAL examples for layout purposes.
 * Replace every testimonial below with genuine, consented employee quotes
 * BEFORE the website is published.
 */
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "From my very first week, the training made me feel confident and prepared. The team culture here is genuinely supportive — there is always someone ready to help.",
    name: "Aisha R.", // PLACEHOLDER — fictional
    role: "Customer Support Representative", // PLACEHOLDER
    initials: "AR",
  },
  {
    quote:
      "I started as a call-center agent and was promoted to team coach within a year. NexaCare really does invest in career growth and professional development.",
    name: "Daniel M.", // PLACEHOLDER — fictional
    role: "Team Coach", // PLACEHOLDER
    initials: "DM",
  },
  {
    quote:
      "What I value most is the respectful, inclusive workplace. Management listens, the tools are modern, and I have grown both my language and professional skills.",
    name: "Sofia L.", // PLACEHOLDER — fictional
    role: "Live Chat & Email Support Agent", // PLACEHOLDER
    initials: "SL",
  },
];

export const heroTrustIndicators: string[] = [
  "Professional Training",
  "Career Development",
  "Multilingual Opportunities",
  "Supportive Work Environment",
];

/**
 * COMPANIES WE WORK WITH
 * ----------------------
 * Brands NexaCare partners with. These names are PLACEHOLDERS — replace them
 * with your real clients (and add logo image paths if/when available).
 */
export interface Client {
  name: string;
  industry: string;
}

// Industries are cycled across the brand names below to keep the list editable
// without repeating yourself. Replace these placeholders with your real clients.
const clientIndustries = [
  "SaaS",
  "Finance",
  "Retail",
  "Technology",
  "E-commerce",
  "Logistics",
  "Healthcare",
  "Telecom",
  "Travel",
  "Cloud",
  "Insurance",
  "Media",
  "Energy",
  "Aerospace",
  "Hospitality",
  "Outdoor",
  "Banking",
  "Airlines",
  "Home Goods",
  "Consulting",
  "Fintech",
  "Streaming",
  "Security",
  "Solar",
  "Automotive",
  "Real Estate",
  "Gaming",
  "Education",
  "Biotech",
  "Manufacturing",
];

const clientNames = [
  "Brightwave", "Northbridge", "Vellora", "Quantyx", "Maplewood", "Stratos",
  "Lumen Health", "Cobalt", "Everpeak", "Nimbus", "Harborline", "Pulsewave",
  "Greenfield", "Orbital", "Solstice", "Trailhead", "Meridian", "Aerolink",
  "Cedarwood", "Vantage", "Brightpay", "Wavelength", "Ironclad", "Sunpath",
  "Fjordly", "Crestline", "Axiom", "Lumina", "Novato", "Pinnacle",
  "Riverstone", "Bluepeak", "Skylark", "Vertex", "Onyx", "Halcyon",
  "Cascade", "Lattice", "Beacon", "Driftwood", "Emberly", "Foundry",
  "Glacier", "Hollow Oak", "Indigo", "Juniper", "Kestrel", "Larkfield",
  "Monarch", "Nordic", "Opaline", "Pebblestone", "Quill", "Radiant",
  "Sablewood", "Tundra", "Umbra", "Verdant", "Westbrook", "Xenon",
  "Yarrow", "Zephyr", "Alloy", "Birchwood", "Clarity", "Dovetail",
  "Elementa", "Fathom", "Granite", "Hearth", "Ivory", "Jolt",
  "Kindred", "Loftwork", "Mosaic", "Northwind", "Oasis", "Polaris",
  "Quanta", "Roam", "Summit", "Talisman", "Upstream", "Voyage",
  "Willow", "Xander", "Yonder", "Zenith", "Anchor", "Bramble",
  "Coral", "Dune", "Echo", "Flintlock", "Grovely", "Haven",
  "Inkwell", "Jasper", "Kite", "Marble", "Nest", "Orchard",
  "Plume", "Quartz", "Ridge", "Slate", "Thistle", "Updraft",
  "Vista", "Wren", "Aria", "Brio", "Cove", "Deltaworks",
  "Ridgeway", "Fableworks", "Northstar", "Brightline", "Clearwater", "Stonegate",
];

export const clients: Client[] = clientNames.map((name, i) => ({
  name,
  industry: clientIndustries[i % clientIndustries.length],
}));

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  {
    question: "Do I need previous call-center experience?",
    answer:
      "Not always. Many of our positions welcome motivated beginners and provide full paid training. Previous call-center or customer-support experience is an advantage for some roles, but a friendly, professional attitude and willingness to learn matter just as much.",
  },
  {
    question: "Can I apply without a CV?",
    answer:
      "Yes. A CV is optional. You can complete the application form with your details and experience even if you do not have a CV ready. If you do have one, attaching it helps our team learn more about you.",
  },
  {
    question: "Which languages are required?",
    answer:
      "Language requirements depend on the position. English is commonly required, and additional languages can open up more opportunities. Each job listing describes its language requirements, and you can list all of your languages and proficiency levels in the application form.",
  },
  {
    question: "Are remote positions available?",
    answer:
      "Yes, depending on the role and your location. We offer on-site, hybrid, and remote opportunities where available. Each job listing indicates the work arrangements that apply.",
  },
  {
    question: "Is training provided?",
    answer:
      "Absolutely. We provide comprehensive, paid professional training during onboarding and ongoing development throughout your career with us.",
  },
  {
    question: "How long does the recruitment process take?",
    answer:
      "The timeline varies by position and the number of applications received. Our process generally includes an application review, an interview, a skills or language assessment, and a final interview. We aim to keep candidates informed at each stage.",
  },
  {
    question: "Will every applicant receive a response?",
    answer:
      "We carefully review every application. However, due to the volume we receive, only shortlisted candidates may be contacted for the next stage. We appreciate the time every applicant invests.",
  },
  {
    question: "Can I apply for more than one position?",
    answer:
      "Yes. You are welcome to apply for more than one position that matches your skills and interests. Please submit a separate application for each role so we can match you correctly.",
  },
  {
    question: "Are there full-time and part-time positions?",
    answer:
      "Yes. Depending on the role and location, we offer full-time, part-time, and temporary opportunities. You can indicate your employment preference in the application form.",
  },
  {
    question: "How will my personal data be used?",
    answer:
      "Your information is used solely for recruitment purposes — to assess your application and contact you about opportunities. Please see our Applicant Privacy Notice and Privacy Policy for full details on how we handle and protect your data.",
  },
  {
    question: "Can I update my application after submitting it?",
    answer:
      "If you need to update or correct your application, please contact our recruitment team using the details on our Contact page. You can also request access to, correction of, or deletion of your data as described in our Privacy Policy.",
  },
  {
    question: "Does submitting an application guarantee employment?",
    answer:
      "No. Submitting an application does not guarantee an interview or employment. All applications are assessed against the requirements of the role and our current hiring needs.",
  },
];
