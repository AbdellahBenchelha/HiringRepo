/**
 * Professional interview / screening assessment.
 *
 *  - "choice" — multiple choice, auto-scored. The `correct` index is used
 *    server-side only and is never sent to the browser.
 *  - "text"   — open-ended written answers, not scored, shown to the recruiter.
 *
 * Questions are grouped into named sections and tagged with a difficulty.
 */

export type Difficulty = "Easy" | "Medium" | "Advanced";

export interface ChoiceQuestion {
  id: string;
  type: "choice";
  section: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  /** Index of the correct / most appropriate option (server-side only). */
  correct: number;
}

export interface TextQuestion {
  id: string;
  type: "text";
  section: string;
  question: string;
  placeholder?: string;
}

export type InterviewQuestion = ChoiceQuestion | TextQuestion;

export interface Section {
  id: string;
  title: string;
  description: string;
}

/** Client-safe shapes (no correct answers). */
export type PublicQuestion =
  | {
      id: string;
      type: "choice";
      section: string;
      difficulty: Difficulty;
      question: string;
      options: string[];
    }
  | { id: string; type: "text"; section: string; question: string; placeholder?: string };

export const sections: Section[] = [
  { id: "communication", title: "Communication Skills", description: "How clearly and professionally you communicate." },
  { id: "service", title: "Customer Service", description: "Your approach to helping and satisfying customers." },
  { id: "problem", title: "Problem-Solving", description: "How you analyse and resolve issues." },
  { id: "callcenter", title: "Call-Center Scenarios", description: "Real situations you may face on calls and chats." },
  { id: "sales", title: "Sales Skills", description: "Recommending products the right way." },
  { id: "english", title: "English & Grammar", description: "Written English, spelling and grammar." },
  { id: "experience", title: "Work Experience", description: "Tell us about your background." },
  { id: "motivation", title: "Personality & Motivation", description: "What drives you and how you handle pressure." },
];

const TEXT_PLACEHOLDER = "Write your answer here…";

export const interviewQuestions: InterviewQuestion[] = [
  // ---------------- Communication Skills ----------------
  {
    id: "comm1", type: "choice", section: "communication", difficulty: "Easy",
    question: "Which of these is the most professional way to greet a customer at the start of a chat?",
    options: [
      "Hey, what do you want?",
      "Hello! Thank you for contacting us. How can I help you today?",
      "Yes?",
      "What's the problem?",
    ],
    correct: 1,
  },
  {
    id: "comm2", type: "choice", section: "communication", difficulty: "Easy",
    question: "A customer is speaking quickly and you didn't catch their account number. You should:",
    options: [
      "Guess the number to save time.",
      "Politely ask them to repeat it.",
      "Ask them to call back later.",
      "Continue without it and hope it's fine.",
    ],
    correct: 1,
  },
  {
    id: "comm3", type: "choice", section: "communication", difficulty: "Medium",
    question: "Which response best shows active listening?",
    options: [
      "Okay.",
      "So if I understand correctly, you were charged twice and you'd like a refund — is that right?",
      "Please hold.",
      "That's not my department.",
    ],
    correct: 1,
  },
  {
    id: "comm4", type: "choice", section: "communication", difficulty: "Medium",
    question: "A customer uses a term you don't understand. The most professional action is to:",
    options: [
      "Pretend you understood.",
      "Politely ask them to clarify what they mean.",
      "End the conversation.",
      "Tell them they are using the wrong word.",
    ],
    correct: 1,
  },
  {
    id: "comm5", type: "choice", section: "communication", difficulty: "Advanced",
    question: "Which tone is most appropriate when writing to a customer?",
    options: [
      "Very formal and full of technical jargon.",
      "Friendly, clear, and professional.",
      "Casual, with lots of slang and emojis.",
      "Cold and robotic.",
    ],
    correct: 1,
  },
  {
    id: "comm_text", type: "text", section: "communication",
    question: "A customer is confused about how to reset their password. Write a short, clear, step-by-step reply explaining how to do it.",
    placeholder: TEXT_PLACEHOLDER,
  },

  // ---------------- Customer Service ----------------
  {
    id: "serv1", type: "choice", section: "service", difficulty: "Easy",
    question: "What best describes good customer service?",
    options: [
      "Closing the conversation as fast as possible.",
      "Genuinely helping the customer and solving their problem.",
      "Avoiding difficult questions.",
      "Transferring every customer to someone else.",
    ],
    correct: 1,
  },
  {
    id: "serv2", type: "choice", section: "service", difficulty: "Easy",
    question: "A customer thanks you and confirms the issue is solved. You should:",
    options: [
      "Say nothing and close the chat.",
      "Thank them, confirm everything is resolved, and offer further help if needed.",
      "Immediately try to sell them something.",
      "Tell them not to contact support again.",
    ],
    correct: 1,
  },
  {
    id: "serv3", type: "choice", section: "service", difficulty: "Medium",
    question: "A customer has waited a long time for a reply. The best first step is to:",
    options: [
      "Ignore the wait and go straight to the issue.",
      "Acknowledge and apologise for the wait, then help them.",
      "Blame the system for being slow.",
      "Tell them everyone is busy.",
    ],
    correct: 1,
  },
  {
    id: "serv4", type: "choice", section: "service", difficulty: "Medium",
    question: "Which action best builds customer trust?",
    options: [
      "Making promises you may not be able to keep.",
      "Following up and doing exactly what you said you would do.",
      "Avoiding the customer when things go wrong.",
      "Giving vague answers.",
    ],
    correct: 1,
  },
  {
    id: "serv5", type: "choice", section: "service", difficulty: "Advanced",
    question: "A customer asks for something that goes against company policy. The best approach is to:",
    options: [
      "Break the policy to make them happy.",
      "Refuse firmly and rudely.",
      "Politely explain what you can and cannot do, and offer alternatives.",
      "Ignore the request.",
    ],
    correct: 2,
  },
  {
    id: "serv6", type: "choice", section: "service", difficulty: "Advanced",
    question: "How should you handle a customer who is mistaken but insists they are right?",
    options: [
      "Argue until they admit they're wrong.",
      "Stay calm and polite, and guide them to the correct information without making them feel bad.",
      "Hang up.",
      "Agree with everything just to avoid conflict.",
    ],
    correct: 1,
  },

  // ---------------- Problem-Solving ----------------
  {
    id: "prob1", type: "choice", section: "problem", difficulty: "Easy",
    question: "A customer's problem is something you cannot fix yourself. You should:",
    options: [
      "Tell them it's impossible.",
      "Escalate it to the right team and keep the customer informed.",
      "Ignore it and hope it resolves.",
      "Close the ticket.",
    ],
    correct: 1,
  },
  {
    id: "prob2", type: "choice", section: "problem", difficulty: "Medium",
    question: "You notice many customers reporting the same issue today. The best action is to:",
    options: [
      "Handle each one and tell no one.",
      "Report the pattern to your team or supervisor — it may be a wider problem.",
      "Ignore it.",
      "Tell customers it is their own fault.",
    ],
    correct: 1,
  },
  {
    id: "prob3", type: "choice", section: "problem", difficulty: "Medium",
    question: "A customer gives confusing details about their problem. You should first:",
    options: [
      "Assume what the problem is.",
      "Ask clear questions to understand the real issue.",
      "Offer a random solution.",
      "Close the chat.",
    ],
    correct: 1,
  },
  {
    id: "prob4", type: "choice", section: "problem", difficulty: "Advanced",
    question: "Which is the best problem-solving approach?",
    options: [
      "Apply the first solution that comes to mind.",
      "Understand the problem, consider the options, choose the best solution, then confirm it worked.",
      "Transfer to another agent immediately.",
      "Tell the customer to try again later.",
    ],
    correct: 1,
  },
  {
    id: "prob5", type: "choice", section: "problem", difficulty: "Advanced",
    question: "A solution you offered did not work for the customer. You should:",
    options: [
      "Repeat the same solution.",
      "Apologise, try a different approach, and escalate if needed.",
      "Blame the customer.",
      "End the conversation.",
    ],
    correct: 1,
  },
  {
    id: "prob_text", type: "text", section: "problem",
    question: "Describe a difficult problem you solved (at work, school, or in life). What was the problem, and how did you solve it?",
    placeholder: TEXT_PLACEHOLDER,
  },

  // ---------------- Call-Center Scenarios ----------------
  {
    id: "call1", type: "choice", section: "callcenter", difficulty: "Easy",
    question: "A customer starts shouting as soon as the call begins. Your first response should be to:",
    options: [
      "Shout back to be heard.",
      "Stay calm, listen, and let them explain before responding.",
      "Hang up.",
      "Put them on hold without saying anything.",
    ],
    correct: 1,
  },
  {
    id: "call2", type: "choice", section: "callcenter", difficulty: "Medium",
    question: "You need to put a customer on hold. The professional way is to:",
    options: [
      "Just press hold.",
      "Ask permission, explain why, and thank them when you return.",
      "Keep them on hold as long as you like.",
      "Mute and ignore them.",
    ],
    correct: 1,
  },
  {
    id: "call3", type: "choice", section: "callcenter", difficulty: "Medium",
    question: "A customer asks to speak to a manager. You should:",
    options: [
      "Refuse the request.",
      "Stay calm, try to help, and escalate politely if they still want a manager.",
      "Hang up.",
      "Tell them no manager is ever available.",
    ],
    correct: 1,
  },
  {
    id: "call4", type: "choice", section: "callcenter", difficulty: "Advanced",
    question: "Your shift is ending but a customer's issue is not resolved. The best action is to:",
    options: [
      "End the call abruptly because your shift is over.",
      "Make sure the issue is properly handed over or documented so it gets resolved.",
      "Tell the customer to call again tomorrow.",
      "Ignore the issue.",
    ],
    correct: 1,
  },
  {
    id: "call5", type: "choice", section: "callcenter", difficulty: "Advanced",
    question: "A customer goes quiet and seems upset. The best response is to:",
    options: [
      "Stay silent and wait.",
      "Gently check in, e.g. 'I understand this is frustrating — I'm here to help.'",
      "End the call.",
      "Rush them to finish.",
    ],
    correct: 1,
  },
  {
    id: "call_text", type: "text", section: "callcenter",
    question: "A customer contacts you saying their internet has been down for 3 days and they are very angry. Describe, step by step, how you would handle this from start to finish.",
    placeholder: TEXT_PLACEHOLDER,
  },

  // ---------------- Sales Skills ----------------
  {
    id: "sale1", type: "choice", section: "sales", difficulty: "Easy",
    question: "When is a good moment to mention a relevant product to a customer?",
    options: [
      "Never — it's not allowed.",
      "After solving their issue, if it genuinely fits their needs.",
      "Before helping them with anything.",
      "While they are angry.",
    ],
    correct: 1,
  },
  {
    id: "sale2", type: "choice", section: "sales", difficulty: "Medium",
    question: "The best way to recommend a product is to:",
    options: [
      "Pressure the customer until they buy.",
      "Explain how it solves their specific need and let them decide.",
      "Exaggerate its features.",
      "Always push the most expensive option.",
    ],
    correct: 1,
  },
  {
    id: "sale3", type: "choice", section: "sales", difficulty: "Medium",
    question: "A customer says a product is too expensive. The best response is to:",
    options: [
      "Tell them they can't afford it.",
      "Highlight the value and benefits, and mention any suitable options or offers.",
      "End the conversation.",
      "Agree that it's a waste of money.",
    ],
    correct: 1,
  },
  {
    id: "sale4", type: "choice", section: "sales", difficulty: "Advanced",
    question: "What is 'upselling' done the right way?",
    options: [
      "Forcing extra products onto every customer.",
      "Offering a relevant upgrade or add-on that genuinely benefits the customer.",
      "Hiding extra fees.",
      "Selling things the customer doesn't need.",
    ],
    correct: 1,
  },

  // ---------------- English & Grammar ----------------
  {
    id: "eng1", type: "choice", section: "english", difficulty: "Easy",
    question: "Choose the correctly spelled word.",
    options: ["Definately", "Definitely", "Definatly", "Definitley"],
    correct: 1,
  },
  {
    id: "eng2", type: "choice", section: "english", difficulty: "Easy",
    question: "Choose the correct sentence.",
    options: ["Your welcome.", "You're welcome.", "Youre welcome.", "Your welcom."],
    correct: 1,
  },
  {
    id: "eng3", type: "choice", section: "english", difficulty: "Easy",
    question: "Choose the grammatically correct sentence.",
    options: [
      "He don't know the answer.",
      "He doesn't know the answer.",
      "He not know the answer.",
      "He didn't knows the answer.",
    ],
    correct: 1,
  },
  {
    id: "eng4", type: "choice", section: "english", difficulty: "Medium",
    question: "Choose the correctly punctuated sentence.",
    options: [
      "Our office is open on Monday, Tuesday, and Wednesday.",
      "Our office is open on Monday Tuesday and Wednesday.",
      "Our office is, open on Monday, Tuesday and Wednesday.",
      "Our office is open on, Monday, Tuesday, and Wednesday.",
    ],
    correct: 0,
  },
  {
    id: "eng5", type: "choice", section: "english", difficulty: "Medium",
    question: "Choose the correct word: “I look forward ___ hearing from you.”",
    options: ["to", "for", "at", "on"],
    correct: 0,
  },
  {
    id: "eng6", type: "choice", section: "english", difficulty: "Medium",
    question: "Which word is a synonym for “help”?",
    options: ["assist", "ignore", "refuse", "delay"],
    correct: 0,
  },
  {
    id: "eng7", type: "choice", section: "english", difficulty: "Advanced",
    question: "Choose the most professional rewrite of: “idk u have to wait”.",
    options: [
      "I don't know, you have to wait.",
      "I'm not sure, but I'll find out for you. Thank you for your patience.",
      "idk you must wait.",
      "No idea, just wait.",
    ],
    correct: 1,
  },

  // ---------------- Work Experience ----------------
  {
    id: "exp_text1", type: "text", section: "experience",
    question: "Briefly describe your previous work experience (if any) and what you learned from it. If you have no formal experience, tell us about other relevant experience.",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    id: "exp_text2", type: "text", section: "experience",
    question: "Describe a time you worked as part of a team. What was your role and how did you contribute?",
    placeholder: TEXT_PLACEHOLDER,
  },

  // ---------------- Personality & Motivation ----------------
  {
    id: "motiv_text1", type: "text", section: "motivation",
    question: "Why do you want to work with WorkRoute, and why in customer support specifically?",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    id: "motiv_text2", type: "text", section: "motivation",
    question: "How do you stay calm and motivated when dealing with difficult or repetitive situations?",
    placeholder: TEXT_PLACEHOLDER,
  },
];

/** Strip correct answers for sending to the browser. */
export function publicQuestions(): PublicQuestion[] {
  return interviewQuestions.map((q) =>
    q.type === "choice"
      ? {
          id: q.id,
          type: "choice",
          section: q.section,
          difficulty: q.difficulty,
          question: q.question,
          options: q.options,
        }
      : {
          id: q.id,
          type: "text",
          section: q.section,
          question: q.question,
          placeholder: q.placeholder,
        },
  );
}

/** Score the multiple-choice answers. `answers[id]` is the chosen option index. */
export function scoreAnswers(answers: Record<string, string>): { correct: number; total: number } {
  let correct = 0;
  let total = 0;
  for (const q of interviewQuestions) {
    if (q.type !== "choice") continue;
    total += 1;
    if (String(answers[q.id]) === String(q.correct)) correct += 1;
  }
  return { correct, total };
}
