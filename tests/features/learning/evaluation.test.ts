import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMultipleChoiceAnswer, evaluateTypingAnswer } from "@/features/learning/evaluation";

test("multiple choice evaluation requires a choice and reports the correct answer", () => {
  const question = {
    mode: "multiple_choice" as const,
    prompt: "你好",
    choices: ["xin chao", "cam on"],
    correctChoice: "xin chao",
    explanation: "",
    variant: "hanzi_to_meaning" as const,
  };

  assert.equal(evaluateMultipleChoiceAnswer(question, null).isCorrect, false);
  assert.equal(evaluateMultipleChoiceAnswer(question, "cam on").feedback, "Correct answer: xin chao");
  assert.equal(evaluateMultipleChoiceAnswer(question, "xin chao").isCorrect, true);
});

test("typing evaluation accepts normalized pinyin and exact hanzi answers", () => {
  const pinyinQuestion = {
    mode: "typing" as const,
    prompt: "xin chào",
    acceptedAnswers: ["nǐ hǎo"],
    placeholder: "",
    variant: "meaning_to_pinyin" as const,
  };

  const hanziQuestion = {
    mode: "typing" as const,
    prompt: "ni hao",
    acceptedAnswers: ["你好"],
    placeholder: "",
    variant: "pinyin_to_hanzi" as const,
  };

  assert.equal(evaluateTypingAnswer(pinyinQuestion, "ni hao").isCorrect, true);
  assert.equal(evaluateTypingAnswer(hanziQuestion, "你 好").isCorrect, true);
  assert.equal(evaluateTypingAnswer(hanziQuestion, "").feedback, "Type an answer before checking.");
});
