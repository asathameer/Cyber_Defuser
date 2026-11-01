# ⚡ Cyber Defuser: AI Hijack

> A 2D cyberpunk side-scrolling platformer built with pure HTML5 Canvas & JavaScript. No frameworks. Zero dependencies.

[![Live Demo](https://img.shields.io/badge/Demo-cyber--defuser.vercel.app-00f2ff?style=for-the-badge&logo=vercel)](https://cyber-defuser.vercel.app)
![Platform](https://img.shields.io/badge/Platform-Browser-00f2ff?style=for-the-badge)
![Built With](https://img.shields.io/badge/Built%20With-HTML5%20Canvas-cc44ff?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Playable-00ff88?style=for-the-badge)

---

## 🎮 Play Live

Play online directly in your browser:  
👉 **[https://cyber-defuser.vercel.app](https://cyber-defuser.vercel.app)**

Or run locally: simply open `index.html` or serve via `python -m http.server 8080`.

---

## 📖 Story

A rogue AI has seized control of 5 major technology conglomerates. You are an elite cyberpunk operative tasked with breaching each company's headquarters floor by floor, dodging lethal defenses, collecting access keys, solving terminal security puzzles, and disabling the AI cores.

**Target Corporations:**
1. **Amazon** (Boss: `NEMESIS-7`)
2. **Google** (Boss: `OMEGA-X`)
3. **Microsoft** (Boss: `CORTEX-9`)
4. **OpenAI** (Boss: `PHANTOM-1`)
5. **Meta** (Boss: `GODNODE`)

---

## 🕹️ Controls

| Action | Keys |
|---|---|
| **Move Left / Right** | `←` `→` / `A` `D` |
| **Jump** | `Space` / `W` / `↑` |
| **Duck / Crawl** | `S` / `↓` |
| **Interact / Hack / Switch** | `E` |
| **Exit Puzzle** | `Esc` |
| **Quick Restart on Defeat** | `Space` / `Enter` / `R` |

---

## 💡 Room Objectives

1. 🔓 **Security Switches** — Press `[E]` to override switches and unlock laser security gates.
2. 🏁 **Checkpoints** — Cross the mid-room checkpoint for bonus units and safe positioning.
3. 🔑 **Keycard** — Find and pick up the security keycard (required to access the hacking terminal).
4. 💻 **Hacking Terminal** — Press `[E]` at the terminal and solve the cryptographic puzzle.
5. 🚪 **Exit Door** — Advance through the breached exit door to the next floor!

---

## ❤️ Lives & Failure Mechanics

- **5 Lives per Round:** Operatives have 5 lives represented by glowing neon HUD hearts.
- **Hazards & Knockback:** Touching active pulsing lasers or patrol drones deals damage, triggers invulnerability frames (iframes), and knocks the player back.
- **Round Restart:** If all 5 lives are depleted, the AI defenses engage and the current round resets, restoring all 5 lives.

---

## 🧩 Visual Puzzle Types

5 visual puzzle types that test pattern recognition, spatial reasoning, and memory:

- **Odd One Out** — Spot the anomaly that doesn't belong in the set.
- **Pattern Matrix** — Complete the 3×3 color and shape grid logically.
- **Firewall Maze** — Navigate your signal through procedurally generated firewall mazes.
- **Visual Sequence** — Identify rotational symmetry and determine the next transformation.
- **Color Memory** — Memorize and replay dynamic glowing cyber color sequences.

---

## 🚀 Deployment

Built for static hosting. Deployable in seconds with Vercel, GitHub Pages, or Netlify:

```bash
# Vercel deployment
vercel --prod
```

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

