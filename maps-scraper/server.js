const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { Country, State, City } = require("country-state-city");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Constants ────────────────────────────────────────────────────────────────
const SOCIAL_DOMAINS = {
  instagram: "instagram.com",
  facebook: "facebook.com",
  twitter: "twitter.com",
  linkedin: "linkedin.com",
  whatsapp: "wa.me",
  youtube: "youtube.com",
  pinterest: "pinterest.com",
  snapchat: "snapchat.com",
  tiktok: "tiktok.com",
  threads: "threads.net",
  telegram: "t.me",
};

const INVALID_WEBSITE_DOMAINS = [
  "drive.google.com",
  "docs.google.com",
  "photos.google.com",
  "maps.google.com",
  "linktr.ee",
  "bit.ly",
  "t.co",
  "stores.",
  "zomato.com",
  "swiggy.com",
  "magicpin.in",
  "justdial.com",
  "sulekha.com",
  "indiamart.com",
  "tradeindia.com",
  "dineout.co.in",
  "eazydiner.com",
  "licious.in",
  "blinkit.com",
  "zepto.com",
  "squarespace.com",
  "wixsite.com",
  "godaddysites.com",
  "weebly.com",
  "webflow.io",
  "carrd.co",
  "taplink.cc",
  "beacons.ai",
  "dotpe.in",
  "thrive.io",
  "petpooja.com",
  "posist.com",
  "ordermark.com",
  "grabonsale.com",
];

// ─── Leads File Path ──────────────────────────────────────────────────────────
const dirPath = path.join(__dirname, "..", "datasets");
const filePath = path.join(dirPath, "leads.json");

// ✅ Create folder if not exists
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// ✅ Create file if not exists
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, "[]");
}

// ─── Load existing leads from disk (keyed by placeId) ────────────────────────
function loadLeads() {
  if (!fs.existsSync(filePath)) return {};
  try {
    const arr = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const map = {};
    arr.forEach((lead) => {
      if (lead.placeId) map[lead.placeId] = lead;
    });
    return map;
  } catch {
    return {};
  }
}

function saveLeads(leadsMap) {
  const arr = Object.values(leadsMap);
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2));
  return arr;
}

// ─── State ────────────────────────────────────────────────────────────────────
let isScrapingActive = false;
let currentBrowser = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function classifyLink(url) {
  if (!url) return { type: null, platform: null };
  const lower = url.toLowerCase();
  for (const [platform, domain] of Object.entries(SOCIAL_DOMAINS)) {
    if (lower.includes(domain)) return { type: "social", platform };
  }
  for (const domain of INVALID_WEBSITE_DOMAINS) {
    if (lower.includes(domain)) return { type: "invalid", platform: null };
  }
  return { type: "website", platform: null };
}

function emit(socketId, event, data) {
  io.to(socketId).emit(event, data);
}

// ─── Extract Google Place ID from Maps URL ────────────────────────────────────
function extractPlaceId(url) {
  // Format: /maps/place/Name/...!1s<PLACE_ID>!...
  const m = url.match(/!1s([^!]+)/);
  if (m) return decodeURIComponent(m[1]);
  // Fallback: extract from ChIJ... pattern
  const chij = url.match(/(ChIJ[^&?!]+)/);
  if (chij) return chij[1];
  return null;
}

// ─── Branch detection helper ──────────────────────────────────────────────────
function getBaseName(raw) {
  const s = raw
    .toLowerCase()
    .replace(/[''`\u2018\u2019]/g, "'")
    .replace(/,.*$/, "")
    .trim();

  const words = s.split(/\s+/);
  const first = words[0] || "";

  if (first.includes("'")) return first;
  if (first.length >= 6) return first;
  return words.slice(0, 2).join(" ");
}

function baseNameFromUrl(url) {
  const m = url.match(/\/maps\/place\/([^/@?]+)/);
  if (!m) return "";
  const decoded = decodeURIComponent(m[1]).replace(/\+/g, " ");
  return getBaseName(decoded);
}

// ─── Scraper ──────────────────────────────────────────────────────────────────
async function scrape({
  searchQuery,
  maxPages,
  maxBusinesses,
  branchFilter = "all",
  minRating = 0,
  socketId,
}) {
  const log = (msg, type = "info") => {
    console.log(msg);
    emit(socketId, "log", { msg, type });
  };

  isScrapingActive = true;

  // ── Load existing leads for deduplication
  const existingLeads = loadLeads();
  const existingCount = Object.keys(existingLeads).length;
  if (existingCount > 0) {
    log(`📂 Loaded ${existingCount} existing leads from leads.json (dedup active)`, "info");
  }

  // Session results (new ones found this run)
  const sessionNew = [];
  const sessionDups = [];
  let totalVisited = 0;

  // Merge map: existing + new
  const mergedLeads = { ...existingLeads };

  try {
    currentBrowser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });
    const page = await currentBrowser.newPage();

    log(`🌐 Opening Google Maps...`, "info");
    await page.goto("https://www.google.com/maps", {
      waitUntil: "networkidle2",
    });
    await new Promise((r) => setTimeout(r, 3000));

    log(`🔍 Searching for: "${searchQuery}"`, "info");
    await page.keyboard.type(searchQuery);
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 8000));

    if (branchFilter === "multiple")
      log(`🏪 Branch filter — only multiple-location businesses`, "warn");
    if (branchFilter === "single")
      log(`📍 Branch filter — only single-location businesses`, "warn");
    if (minRating > 0)
      log(`⭐ Rating filter — only ≥ ${minRating} stars`, "warn");

    log(`📜 Scrolling to load results (max ${maxPages} pages)...`, "info");
    await page.evaluate(async (MAX_PAGES) => {
      const scrollable = document.querySelector('div[role="feed"]');
      if (!scrollable) return;
      for (let i = 0; i < MAX_PAGES; i++) {
        const prevH = scrollable.scrollHeight;
        scrollable.scrollBy(0, 1500);
        await new Promise((r) => setTimeout(r, 2500));
        if (scrollable.scrollHeight === prevH && i > 5) break;
      }
    }, maxPages);

    const businessLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".Nv2PK a"))
        .map((a) => a.href)
        .filter((href) => href.includes("/maps/place/")),
    );

    const totalToScrape = Math.min(businessLinks.length, maxBusinesses);
    log(
      `✅ Found ${businessLinks.length} businesses — visiting up to ${totalToScrape}`,
      "success",
    );
    emit(socketId, "total", totalToScrape);

    // ── Frequency map for branch detection (method 1)
    const nameFreqMap = {};
    businessLinks.forEach((url) => {
      const base = baseNameFromUrl(url);
      if (base.length > 1) nameFreqMap[base] = (nameFreqMap[base] || 0) + 1;
    });

    for (let i = 0; i < totalToScrape; i++) {
      if (!isScrapingActive) {
        log("🛑 Scraping stopped by user.", "warn");
        break;
      }

      const mapsUrl = businessLinks[i];
      const urlBaseName = baseNameFromUrl(mapsUrl);
      const freqCount = nameFreqMap[urlBaseName] || 1;
      const isMultiByFreq = freqCount >= 2;

      // ── Early dedup via Place ID from URL ────────────────────────────────
      const urlPlaceId = extractPlaceId(mapsUrl);
      if (urlPlaceId && mergedLeads[urlPlaceId]) {
        log(
          `  ♻️  [${i + 1}/${totalToScrape}] Duplicate — placeId already in leads.json, skipping`,
          "warn",
        );
        sessionDups.push(urlPlaceId);
        totalVisited++;
        emit(socketId, "progress", {
          visited: totalVisited,
          saved: sessionNew.length,
          entry: null,
          isDuplicate: true,
        });
        continue;
      }

      log(
        `\n📍 [${i + 1}/${totalToScrape}] Visiting... ${isMultiByFreq ? `(🔁 "${urlBaseName}" ×${freqCount})` : ""}`,
        "info",
      );

      await page.goto(mapsUrl, { waitUntil: "networkidle2" });

      try {
        await page.waitForSelector("h1", { timeout: 8000 });
      } catch {
        log("  ⚠️ Timed out, skipping...", "warn");
        totalVisited++;
        emit(socketId, "progress", { visited: totalVisited, saved: sessionNew.length, entry: null });
        continue;
      }

      await new Promise((r) => setTimeout(r, 2000));

      const data = await page.evaluate(() => {
        const name = document.querySelector("h1")?.innerText?.trim();

        // ── Extract Place ID from page URL
        const currentUrl = window.location.href;
        let placeId = null;
        const m1 = currentUrl.match(/!1s([^!]+)/);
        if (m1) placeId = decodeURIComponent(m1[1]);
        else {
          const chij = currentUrl.match(/(ChIJ[^&?!]+)/);
          if (chij) placeId = chij[1];
        }

        let rating = null;
        const ratingEl =
          document.querySelector('span[aria-label*="stars"]') ||
          document.querySelector('div[aria-label*="stars"]');
        if (ratingEl)
          rating = ratingEl.getAttribute("aria-label")?.match(/[\d.]+/)?.[0];
        if (!rating) {
          document.querySelectorAll("span, div").forEach((el) => {
            if (!rating && /^\d\.\d$/.test(el.innerText?.trim()))
              rating = el.innerText.trim();
          });
        }

        let reviewCount = null;
        document.querySelectorAll("button, span, div").forEach((el) => {
          if (!reviewCount) {
            const text = el.innerText?.trim();
            const m =
              text?.match(/^([\d,]+)\s+reviews?$/i) ||
              text?.match(/^\(([\d,]+)\)$/);
            if (m) reviewCount = m[1].replace(/,/g, "");
          }
        });

        const phone =
          document
            .querySelector('button[data-item-id^="phone"]')
            ?.innerText?.replace(/\n/g, " ")
            .trim() || null;
        const address =
          document
            .querySelector('button[data-item-id="address"]')
            ?.innerText?.replace(/\n/g, " ")
            .trim() || null;
        const category =
          document
            .querySelector('button[jsaction*="category"]')
            ?.innerText?.trim() || null;
        const rawLink =
          document.querySelector('a[data-item-id="authority"]')?.href || null;

        let priceRange = null;
        document.querySelectorAll("span, div").forEach((el) => {
          if (!priceRange && el.children.length === 0) {
            const text = el.innerText?.trim();
            const m = text?.match(
              /^([₹$€£]{1,4}|[₹$€£][\d,]+\s*[–\-]\s*[\d,]+(\s*per\s*\w+)?)$/i,
            );
            if (m) priceRange = text;
          }
        });

        let photoCount = null;
        document.querySelectorAll("button, a").forEach((el) => {
          if (!photoCount) {
            const m = el.innerText?.trim()?.match(/([\d,]+)\+?\s*photo/i);
            if (m) photoCount = m[1].replace(/,/g, "");
          }
        });

        let isOpenNow = null;
        document.querySelectorAll("span, div").forEach((el) => {
          if (isOpenNow === null) {
            const text = el.innerText?.trim().toLowerCase();
            if (text === "open now" || text === "open") isOpenNow = true;
            else if (text === "closed" || text === "closes soon")
              isOpenNow = false;
          }
        });

        const hoursRows = document.querySelectorAll("table tr");
        const openingHours = {};
        hoursRows.forEach((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 2) {
            const day = cells[0]?.innerText?.trim();
            const time = cells[1]?.innerText?.trim();
            if (day && time) openingHours[day] = time;
          }
        });

        const description =
          document
            .querySelector('[data-attrid="description"] span')
            ?.innerText?.trim() || null;
        const plusCode =
          document.querySelector('[data-item-id="oloc"]')?.innerText?.trim() ||
          null;

        const amenities = [];
        document
          .querySelectorAll('[aria-label*="Has "], [aria-label*="No "]')
          .forEach((el) => {
            const label = el.getAttribute("aria-label")?.trim();
            if (label) amenities.push(label);
          });

        // ── On-page branch detection
        let hasMultipleBranches = false;
        let branchCount = null;
        let branchDetectSource = null;

        const BRANCH_PATTERNS = [
          /see\s+all\s+(\d+)\s+locations?/i,
          /view\s+all\s+(\d+)\s+locations?/i,
          /all\s+(\d+)\s+locations?/i,
          /(\d+)\s+more\s+locations?/i,
          /(\d+)\+?\s+locations?\b/i,
          /(\d+)\s+branches?\b/i,
          /(\d+)\s+stores?\b/i,
          /(\d+)\s+outlets?\b/i,
          /(\d+)\s+restaurants?\s+nearby/i,
        ];

        const allEls = document.querySelectorAll("*");
        for (const el of allEls) {
          const text = (
            (el.childElementCount === 0 ? el.innerText : "") ||
            el.getAttribute("aria-label") ||
            ""
          ).trim();
          if (!text || text.length > 120) continue;
          for (const pattern of BRANCH_PATTERNS) {
            const m = text.match(pattern);
            if (m && parseInt(m[1]) > 1) {
              branchCount = parseInt(m[1]);
              hasMultipleBranches = true;
              branchDetectSource = "on-page";
              break;
            }
          }
          if (hasMultipleBranches) break;
        }

        if (!hasMultipleBranches) {
          const anchors = document.querySelectorAll("a, button");
          for (const a of anchors) {
            const t = (a.innerText || a.textContent || "").trim().toLowerCase();
            if (
              t === "all locations" ||
              t === "other locations" ||
              t === "all branches" ||
              t === "more locations" ||
              /^see all .+ locations?$/.test(t)
            ) {
              hasMultipleBranches = true;
              branchDetectSource = "on-page-link";
              break;
            }
          }
        }

        return {
          name,
          placeId,
          category,
          rating,
          reviewCount,
          phone,
          address,
          rawLink,
          isOpenNow,
          openingHours:
            Object.keys(openingHours).length > 0 ? openingHours : null,
          priceRange,
          plusCode,
          photoCount,
          description,
          amenities: amenities.length > 0 ? amenities : null,
          hasMultipleBranches,
          branchCount,
          branchDetectSource,
        };
      });

      totalVisited++;

      // ── Combine both branch detection methods
      const hasMultipleBranches = isMultiByFreq || data.hasMultipleBranches;

      let detectTag = "";
      if (isMultiByFreq && data.hasMultipleBranches)
        detectTag = `freq(${freqCount}×) + on-page`;
      else if (isMultiByFreq) detectTag = `freq(${freqCount}× in results)`;
      else if (data.hasMultipleBranches)
        detectTag = `on-page${data.branchCount ? `(${data.branchCount} locations)` : ""}`;

      // ── Apply branch filter
      if (branchFilter === "multiple" && !hasMultipleBranches) {
        log(`  ⏭️  ${data.name || "Unknown"} — single/unknown branch, skipped`, "warn");
        emit(socketId, "progress", { visited: totalVisited, saved: sessionNew.length, entry: null });
        continue;
      }
      if (branchFilter === "single" && hasMultipleBranches) {
        log(`  ⏭️  ${data.name || "Unknown"} — multi-branch [${detectTag}], skipped`, "warn");
        emit(socketId, "progress", { visited: totalVisited, saved: sessionNew.length, entry: null });
        continue;
      }

      // ── Apply rating filter
      const ratingNum = parseFloat(data.rating);
      if (minRating > 0 && (isNaN(ratingNum) || ratingNum < minRating)) {
        log(`  ⏭️  ${data.name || "Unknown"} — rating ${data.rating ?? "N/A"} < ${minRating}, skipped`, "warn");
        emit(socketId, "progress", { visited: totalVisited, saved: sessionNew.length, entry: null });
        continue;
      }

      const { type, platform } = classifyLink(data.rawLink);

      // ── Final Place ID (page URL is most reliable)
      const finalPlaceId = data.placeId || urlPlaceId || null;

      // ── Dedup check with final Place ID
      if (finalPlaceId && mergedLeads[finalPlaceId]) {
        log(`  ♻️  ${data.name || "Unknown"} — duplicate placeId, skipped`, "warn");
        sessionDups.push(finalPlaceId);
        emit(socketId, "progress", {
          visited: totalVisited,
          saved: sessionNew.length,
          entry: null,
          isDuplicate: true,
        });
        continue;
      }

      // ── Build lead entry
      const today = new Date().toISOString().split("T")[0];

      const entry = {
        // ── Identity
        placeId: finalPlaceId,
        name: data.name || null,
        category: data.category || null,

        // ── Contact
        phone: data.phone || null,
        address: data.address || null,
        website: type === "website" ? data.rawLink : "Not Found",
        social: type === "social" ? [{ platform, url: data.rawLink }] : null,
        mapsUrl,

        // ── Ratings
        rating: data.rating || null,
        reviewCount: data.reviewCount || null,

        // ── Details
        isOpenNow: data.isOpenNow ?? null,
        openingHours: data.openingHours || null,
        priceRange: data.priceRange || null,
        plusCode: data.plusCode || null,
        photoCount: data.photoCount || null,
        description: data.description || null,
        amenities: data.amenities || null,

        // ── Branch info
        hasMultipleBranches,
        branchCount: data.branchCount || (isMultiByFreq ? freqCount : null),
        branchDetectSource: detectTag || null,

        // ── Pipeline / CRM fields
        query: searchQuery,
        scrapedDate: today,
        status: "new",
        messageSent: false,
        replied: false,
        dealClosed: false,

        // ── Lead quality
        isLead: ratingNum > 4 && type !== "website",
      };

      // ── Save to merged map
      const dedupKey = finalPlaceId || `${entry.name}__${entry.address}`;
      mergedLeads[dedupKey] = entry;
      sessionNew.push(entry);

      const branchTag = hasMultipleBranches
        ? `🏪 multi [${detectTag}]`
        : `📍 single`;

      log(
        `  ✅ ${entry.name} | ⭐ ${entry.rating} (${entry.reviewCount} reviews) | ${branchTag} | 🔗 ${type ?? "none"} ${platform ? `(${platform})` : ""} ${entry.isLead ? "| 🔥 HOT LEAD!" : ""}`,
        entry.isLead ? "lead" : "success",
      );

      emit(socketId, "progress", {
        visited: totalVisited,
        saved: sessionNew.length,
        entry,
      });

      // ── Auto-save every 20 new entries
      if (sessionNew.length % 20 === 0) {
        saveLeads(mergedLeads);
        log(`  💾 Auto-saved — ${sessionNew.length} new this session, ${Object.keys(mergedLeads).length} total in leads.json`, "info");
      }
    }

    // ── Final save
    const allLeads = saveLeads(mergedLeads);
    const totalLeads = allLeads.length;
    const hotLeads = allLeads.filter((r) => r.isLead).length;
    const sessionHot = sessionNew.filter((r) => r.isLead).length;

    log(`\n✅ Session: ${sessionNew.length} new scraped, ${sessionDups.length} duplicates skipped`, "success");
    log(`🔥 Session hot leads: ${sessionHot}`, "lead");
    log(`📂 leads.json now has ${totalLeads} total entries (${hotLeads} hot leads)`, "success");

    emit(socketId, "done", {
      total: sessionNew.length,
      leads: sessionHot,
      visited: totalVisited,
      duplicates: sessionDups.length,
      grandTotal: totalLeads,
    });

  } catch (err) {
    log(`❌ Error: ${err.message}`, "error");
    emit(socketId, "error", err.message);
  } finally {
    isScrapingActive = false;
    if (currentBrowser) {
      await currentBrowser.close().catch(() => {});
      currentBrowser = null;
    }
  }
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.post("/api/scrape", (req, res) => {
  if (isScrapingActive)
    return res.status(409).json({ error: "Scraping already in progress." });
  const { searchQuery, maxPages, maxBusinesses, branchFilter, socketId, minRating } = req.body;
  if (!searchQuery || !socketId)
    return res.status(400).json({ error: "Missing required fields." });

  scrape({
    searchQuery,
    maxPages: parseInt(maxPages) || 200,
    maxBusinesses: parseInt(maxBusinesses) || 300,
    branchFilter: branchFilter || "all",
    minRating: parseFloat(minRating) || 0,
    socketId,
  });

  res.json({ status: "started" });
});

app.post("/api/stop", (req, res) => {
  isScrapingActive = false;
  res.json({ status: "stopping" });
});

// ─── Download endpoint — only leads.json ─────────────────────────────────────
app.get("/api/download/leads.json", (req, res) => {
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "No leads yet. Run a scrape first." });
  res.download(filePath, "leads.json");
});

// ─── Stats endpoint ───────────────────────────────────────────────────────────
app.get("/api/leads/stats", (req, res) => {
  const leadsMap = loadLeads();
  const arr = Object.values(leadsMap);
  res.json({
    total: arr.length,
    hot: arr.filter((l) => l.isLead).length,
    new: arr.filter((l) => l.status === "new").length,
    messageSent: arr.filter((l) => l.messageSent).length,
    replied: arr.filter((l) => l.replied).length,
    dealClosed: arr.filter((l) => l.dealClosed).length,
  });
});

// ─── Update lead status ───────────────────────────────────────────────────────
app.patch("/api/leads/:placeId", (req, res) => {
  const leadsMap = loadLeads();
  const key = decodeURIComponent(req.params.placeId);
  if (!leadsMap[key])
    return res.status(404).json({ error: "Lead not found." });

  const allowed = ["status", "messageSent", "replied", "dealClosed"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) leadsMap[key][field] = req.body[field];
  });

  saveLeads(leadsMap);
  res.json({ ok: true, lead: leadsMap[key] });
});

// ─── Location API ─────────────────────────────────────────────────────────────
app.get("/api/countries", (_req, res) => {
  res.json(Country.getAllCountries().map((c) => ({ isoCode: c.isoCode, name: c.name })));
});
app.get("/api/states/:countryCode", (req, res) => {
  res.json(State.getStatesOfCountry(req.params.countryCode).map((s) => ({ isoCode: s.isoCode, name: s.name })));
});
app.get("/api/cities/:countryCode/:stateCode", (req, res) => {
  res.json(City.getCitiesOfState(req.params.countryCode, req.params.stateCode).map((c) => ({ name: c.name })));
});

// ─── Clear all leads ─────────────────────────────────────────────────────────
app.post("/api/leads/clear", (req, res) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(3000, () => {
  console.log("\n🚀 Maps Scraper running at → http://localhost:3000\n");
  console.log("📂 All scraped data saved to: leads.json\n");
});