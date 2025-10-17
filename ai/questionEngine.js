// /ai/questionEngine.js
import { questions } from "../data/questions.js";

export const QuestionEngine = {
  difficulty: "normal",

  getNextSet(level = 1) {
    const filtered = questions.filter(q => q.difficulty === this.difficulty);
    const randomised = filtered.sort(() => 0.5 - Math.random());
    return randomised.slice(0, 10);
  },

  adjustDifficulty(performance) {
    if (performance > 0.85) this.difficulty = "hard";
    else if (performance < 0.5) this.difficulty = "easy";
    else this.difficulty = "normal";
  },
};
