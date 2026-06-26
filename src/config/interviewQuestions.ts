/**
 * Interview / screening questions.
 *
 * Two kinds of questions:
 *  - "choice" — multiple choice, auto-scored (the `correct` index is used
 *    server-side only and is never sent to the browser).
 *  - "text"   — written scenario answers, not scored, shown to the recruiter.
 */

export interface ChoiceQuestion {
  id: string;
  type: "choice";
  question: string;
  options: string[];
  /** Index of the correct option (server-side scoring only). */
  correct: number;
}

export interface TextQuestion {
  id: string;
  type: "text";
  question: string;
  placeholder?: string;
}

export type InterviewQuestion = ChoiceQuestion | TextQuestion;

/** Client-safe shape (no correct answers). */
export type PublicQuestion =
  | { id: string; type: "choice"; question: string; options: string[] }
  | { id: string; type: "text"; question: string; placeholder?: string };

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: "grammar1",
    type: "choice",
    question: "Which sentence is grammatically correct?",
    options: [
      "She don't have any questions about the order.",
      "She doesn't have any questions about the order.",
      "She not have any questions about the order.",
      "She haven't any questions about the order.",
    ],
    correct: 1,
  },
  {
    id: "spelling1",
    type: "choice",
    question: "Choose the correctly spelled word.",
    options: ["Recieve", "Receive", "Receeve", "Receve"],
    correct: 1,
  },
  {
    id: "angry",
    type: "choice",
    question:
      "A customer is angry about a late delivery. What is the BEST first response?",
    options: [
      "Tell them it is not your fault.",
      "Ask for the order number without acknowledging their frustration.",
      "Apologize for the inconvenience and assure them you will help right away.",
      "Tell them to contact the delivery company instead.",
    ],
    correct: 2,
  },
  {
    id: "unknown",
    type: "choice",
    question: "A customer asks something you do not know the answer to. You should:",
    options: [
      "Guess an answer so you sound confident.",
      "Tell them you will check and get back to them with the correct information.",
      "Tell them it is not your job to know that.",
      "Ask them to find the answer themselves.",
    ],
    correct: 1,
  },
  {
    id: "policy",
    type: "choice",
    question:
      "A customer requests a refund just outside the refund window. The best approach is to:",
    options: [
      "Refuse immediately and end the conversation.",
      "Politely explain the policy and offer any available alternatives.",
      "Approve the refund without checking anything.",
      "Ignore the message.",
    ],
    correct: 1,
  },
  {
    id: "scenario_reply",
    type: "text",
    question:
      "A customer writes: “I have been charged twice this month and nobody is helping me. This is unacceptable!” Please write the reply you would send to this customer.",
    placeholder: "Write your reply to the customer…",
  },
  {
    id: "problem_solved",
    type: "text",
    question:
      "Tell us about a time you helped solve someone’s problem — at work or in everyday life. What did you do?",
    placeholder: "Describe the situation and what you did…",
  },
  {
    id: "why_support",
    type: "text",
    question:
      "Why do you want to work in customer support, and what makes you a good fit for this role?",
    placeholder: "Tell us in a few sentences…",
  },
];

/** Strip correct answers for sending to the browser. */
export function publicQuestions(): PublicQuestion[] {
  return interviewQuestions.map((q) =>
    q.type === "choice"
      ? { id: q.id, type: "choice", question: q.question, options: q.options }
      : { id: q.id, type: "text", question: q.question, placeholder: q.placeholder },
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
