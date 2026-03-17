const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const path = require("path");
const fs = require("fs");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const dirPath = path.join(__dirname, "..", "datasets");
const LEADS_FILE = path.join(dirPath, "leads.json");

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

let isSending = false;
let stopRequested = false;
let browser = null;

const emit = (sid, ev, data) => io.to(sid).emit(ev, data);
const log = (sid, msg, type = "info") => {
  console.log(msg);
  emit(sid, "wa_log", { msg, type });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min) * 1000;

/* ─── Leads File API ──────────────────────────────── */

// GET /api/leads — read leads.json
app.get("/api/leads", (req, res) => {
  try {
    if (!fs.existsSync(LEADS_FILE)) {
      return res.status(404).json({ error: "leads.json not found in project root." });
    }
    const data = JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read leads.json: " + err.message });
  }
});

// POST /api/leads — write updated leads.json
app.post("/api/leads", (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Expected an array." });
    }
    fs.writeFileSync(LEADS_FILE, JSON.stringify(data, null, 2), "utf8");
    res.json({ status: "saved", count: data.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to write leads.json: " + err.message });
  }
});

/* ─── Sender ──────────────────────────────────────── */
async function sendMessages({ contacts, minDelay, maxDelay, socketId }) {
  isSending = true;
  stopRequested = false;
  let sent = 0,
    errors = 0;

  try {
    const browser = await puppeteer.launch({
      headless: false,
      userDataDir: "./chrome-data",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    );

    log(socketId, "🌐 Opening WhatsApp Web…", "info");
    await page.goto("https://web.whatsapp.com", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    log(socketId, "📱 Scan the QR code in the opened browser window…", "warn");

    try {
      const useHereBtn = await page.waitForSelector(
        'div[data-animate-modal-popup="true"] button:last-child, button[role="button"]:has-text("Use here")',
        { timeout: 5000 },
      );
      if (useHereBtn) {
        log(socketId, '🔄 Clicking "Use here" to take over session…', "warn");
        await useHereBtn.click();
        await sleep(2000);
      }
    } catch (_) {}

    await page.waitForSelector(
      '[data-testid="chatlist-header"], #side, [aria-label="Chat list"]',
      { timeout: 90000 },
    );

    log(socketId, "✅ WhatsApp Web ready!", "success");
    await sleep(2500);

    for (let i = 0; i < contacts.length; i++) {
      if (stopRequested) {
        log(socketId, "🛑 Stopped by user.", "warn");
        break;
      }

      const c = contacts[i];
      emit(socketId, "wa_progress", { index: i, name: c.name, status: "active" });
      log(socketId, `\n📤 [${i + 1}/${contacts.length}] → ${c.name} (+${c.phone}) ${c.isLead ? "🔥" : ""}`, "info");

      try {
        const url = `https://web.whatsapp.com/send?phone=${c.phone}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(4000);

        const hasErrorPopup = await page.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase();
          return (
            bodyText.includes("invalid") ||
            bodyText.includes("not on whatsapp") ||
            bodyText.includes("phone number shared")
          );
        });

        if (hasErrorPopup) {
          log(socketId, `  ❌ ${c.name} — Not on WhatsApp, skipping`, "error");
          errors++;
          emit(socketId, "wa_progress", { index: i, name: c.name, status: "error" });
          await page.keyboard.press("Escape").catch(() => {});
          await sleep(1000);
          continue;
        }

        const inputBox = await page
          .waitForSelector(
            'div[contenteditable="true"][data-tab="10"], footer div[contenteditable="true"], div[contenteditable="true"][data-lexical-editor="true"]',
            { timeout: 15000 },
          )
          .catch(() => null);

        if (!inputBox) {
          log(socketId, `  ❌ ${c.name} — Input box not found, skipping`, "error");
          errors++;
          emit(socketId, "wa_progress", { index: i, name: c.name, status: "error" });
          continue;
        }

        await inputBox.click();
        await sleep(500);

        const lines = c.message.split("\n");
        for (let li = 0; li < lines.length; li++) {
          await page.keyboard.type(lines[li], { delay: 15 });
          if (li < lines.length - 1) {
            await page.keyboard.down("Shift");
            await page.keyboard.press("Enter");
            await page.keyboard.up("Shift");
          }
        }

        await sleep(800);

        const sent_btn = await page.$(
          '[data-testid="send"], button[aria-label="Send"], span[data-icon="send"]',
        );
        if (sent_btn) {
          await sent_btn.click();
        } else {
          await page.keyboard.press("Enter");
        }

        await sleep(1500);
        log(socketId, `  ✅ Sent to ${c.name}${c.isLead ? " 🔥" : ""}`, "success");
        sent++;
        emit(socketId, "wa_progress", { index: i, name: c.name, status: "sent" });
      } catch (err) {
        log(socketId, `  ❌ Error: ${err.message}`, "error");
        errors++;
        emit(socketId, "wa_progress", { index: i, name: c.name, status: "error" });
      }

      if (i < contacts.length - 1 && !stopRequested) {
        const delay = rand(minDelay, maxDelay);
        log(socketId, `  ⏱️ Waiting ${(delay / 1000).toFixed(1)}s…`, "info");
        await sleep(delay);
      }
    }

    log(socketId, `\n🎉 Done! ${sent} sent, ${errors} errors.`, "lead");
    emit(socketId, "wa_done", { sent, errors });
  } catch (err) {
    log(socketId, `❌ Fatal: ${err.message}`, "error");
    emit(socketId, "wa_done", { sent: 0, errors: 0 });
  } finally {
    isSending = false;
    if (browser) {
      await browser.close().catch(() => {});
      browser = null;
    }
  }
}

/* ─── Routes ──────────────────────────────────────── */
app.post("/api/send", (req, res) => {
  if (isSending) return res.status(409).json({ error: "Already sending." });
  const { contacts, minDelay, maxDelay, socketId } = req.body;
  if (!contacts?.length || !socketId)
    return res.status(400).json({ error: "Missing fields." });
  sendMessages({ contacts, minDelay, maxDelay, socketId });
  res.json({ status: "started" });
});

app.post("/api/stop", (_req, res) => {
  stopRequested = true;
  res.json({ status: "stopping" });
});

server.listen(3001, () => console.log("🚀 http://localhost:3001"));