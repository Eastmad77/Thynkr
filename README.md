# Brain ⚡ Bolt

**Brain ⚡ Bolt** is a fast-paced browser quiz game built with plain **HTML, CSS, and JavaScript**.  
You get 12 questions per round, a timer per question, and only **3 strikes** before the game ends.  
A new **redemption mechanic** lets you earn back a strike by answering 3 correct in a row.  

![Streak Bar Example](streak-bar-example.png)
---

## ✨ Features

- 🎯 **12-question quiz** (questions loaded dynamically from Google Sheets CSV)  
- ✅ **Visual answer history bar** (12 segments: green = correct, red = wrong, grey = pending)  
- ❌ **3-strike rule** — game ends after 3 wrong answers (non-consecutive)  
- 🔄 **Redemption system** — 3 correct in a row after a wrong removes one strike  
- ⏱️ **Timers** — per-question and total elapsed time, with animated bars  
- 🔊 **Sound & haptics** — feedback for correct, wrong, countdown, etc.  
- 🖼️ **Success splash** — shows on completion, auto-returns home after 5s  
- 📱 **Responsive** — mobile and desktop friendly  
- 📡 **Offline support** — via Service Worker caching  
- 📋 **Sidebar menu** — auto-closes after 5s, no emojis  

---

## 📂 Project Structure

