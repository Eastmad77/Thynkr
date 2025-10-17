// /game/bonusRounds.js
import { isPro } from "../pro.js";

export const BonusRounds = {
  async start(type = "lightning") {
    if (!isPro()) return;
    const audio = new Audio("/media/audio/bonus-round.mp3");
    audio.play();

    // Simple logic placeholder
    document.body.classList.add("bonus-active");
    console.log(`Starting bonus round: ${type}`);
  },
};
