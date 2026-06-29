// Vanilla TypeScript app logic — runs client-side only via initApp()

interface Item {
  id: string;
  name: string;
  rating: string | null;
}

interface Recommendation {
  title: string;
  author: string;
  match_score: number;
  why: string;
  vibe: string;
  amazon_search: string;
  format?: string;
  runtime?: string;
  year?: string;
  platform?: string;
  play_time?: string;
  justwatch_search?: string;
}

interface ApiResponse {
  taste_profile: string;
  short_taste_profile?: string;
  archetype?: string;
  archetype_secondary?: string;
  archetype_tagline?: string;
  recommendations: Recommendation[];
}

interface ScannedBook {
  id: string;
  title: string;
  author: string;
  confidence: "high" | "medium";
}

interface OsmElement {
  type: "node" | "way";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

type Category = "books" | "podcasts" | "watch" | "games";

const ARCHETYPE_ICONS: Record<string, string> = {
  "The Dark Escapist": "🌙",
  "The Compulsive Page-Turner": "⚡",
  "The World-Builder": "🪐",
  "The Reluctant Literary": "📖",
  "The True Crime Mind": "🔍",
  "The Intellectual Adventurer": "🔭",
  "The Comfort Rereader": "🤍",
  "The Historical Immersionist": "⏳",
  "The Concept Reader": "👾",
  "The Quiet Realist": "👁",
  "The Epic Completionist": "🗺",
  "The Atmosphere Chaser": "✨",
};

const GAMES_ARCHETYPE_ICONS: Record<string, string> = {
  "The Completionist": "🏆",
  "The Story Chaser": "📖",
  "The Hardcore": "💀",
  "The Explorer": "🗺️",
  "The Strategist": "⚔️",
  "The Couch Co-op": "🎮",
  "The Rogueliker": "🔄",
  "The Immersionist": "🌍",
  "The Speedrunner": "⚡",
  "The Indie Darling": "🎨",
  "The Retro Purist": "👾",
  "The Casual Drifter": "☁️",
};

const WATCH_ARCHETYPE_ICONS: Record<string, string> = {
  "The Prestige Drama Addict": "🏆",
  "The Binge Monster": "⚡",
  "The Dark & Twisted": "🌑",
  "The Feel-Good Faithful": "☀️",
  "The True Crime Obsessive": "🔍",
  "The Sci-Fi Escapist": "🚀",
  "The Comfort Rewatcher": "🛋️",
  "The Doc Devotee": "🎥",
  "The Sharp Comedy Fan": "😏",
  "The Slow Burn Devotee": "🕯️",
  "The Foreign Language Explorer": "🌍",
  "The Underdog Champion": "🥊",
};

let activeCategory: Category = "books";
let watchFormat: "series" | "films" | "both" = "both";
let watchMood: "light" | "dark" | "any" = "any";
let watchDeepCuts = false;
let gamesPlatforms: string[] = [];
let gamesDeepCuts = false;
const items: Item[] = [];
let currentRecs: Recommendation[] = [];
let currentTasteProfile = "";
let currentShortTasteProfile = "";
let currentArchetype = "";
let currentArchetypeSecondary = "";
let currentArchetypeTagline = "";
const seenTitles = new Set<string>();
let reviewBooks: ScannedBook[] = [];

const CATEGORY_CONFIG: Record<Category, {
  label: string;
  placeholder: string;
  dismissBtn: string;
  linkText: string | null;
  sharePrefix: string;
  shareByWord: string;
  minError: string;
}> = {
  books: {
    label: "What books have you read?",
    placeholder: "e.g. The Road, Sapiens, Dune…",
    dismissBtn: "I've read this",
    linkText: "Find on Amazon →",
    sharePrefix: "My reader profile:",
    shareByWord: "by",
    minError: "Add at least 3 books to get a good recommendation.",
  },
  podcasts: {
    label: "What podcasts have you listened to?",
    placeholder: "e.g. Serial, Hardcore History, Radiolab…",
    dismissBtn: "I've listened to this",
    linkText: "Find on Spotify →",
    sharePrefix: "My listener profile:",
    shareByWord: "hosted by",
    minError: "Add at least 3 podcasts to get a good recommendation.",
  },
  watch: {
    label: "What have you watched?",
    placeholder: "e.g. Breaking Bad, The Godfather, Succession…",
    dismissBtn: "I've watched this",
    linkText: "Find on JustWatch →",
    sharePrefix: "My viewer profile:",
    shareByWord: "dir.",
    minError: "Add at least 3 shows or films to get a good recommendation.",
  },
  games: {
    label: "What games have you played?",
    placeholder: "e.g. Elden Ring, The Last of Us, Hades…",
    dismissBtn: "I've played this",
    linkText: "Find on Amazon →",
    sharePrefix: "My gamer profile:",
    shareByWord: "by",
    minError: "Add at least 3 games to get a good recommendation.",
  },
};

const DISMISS_REASONS: Partial<Record<Category, string[]>> = {
  podcasts: [
    "Already listen to it",
    "Not my kind of host",
    "Too mainstream",
    "Not interested in the topic",
  ],
  watch: [
    "Already watched it",
    "Too long a commitment",
    "Not my kind of tone",
    "Not interested in the topic",
  ],
  games: [
    "Already played it",
    "Too long a commitment",
    "Not my kind of genre",
    "Not available on my platform",
    "Not interested in the theme",
  ],
};

// DOM element refs — assigned in initApp()
let itemInput: HTMLInputElement;
let addBtn: HTMLButtonElement;
let itemsList: HTMLUListElement;
let itemsSection: HTMLElement;
let ctaRow: HTMLElement;
let findBtn: HTMLButtonElement;
let findLoader: HTMLElement;
let findBtnText: HTMLElement;
let resultsSection: HTMLElement;
let tasteProfileText: HTMLElement;
let recsList: HTMLElement;
let copyBtn: HTMLButtonElement;
let copyLabel: HTMLElement;
let itemTemplate: HTMLTemplateElement;
let recTemplate: HTMLTemplateElement;
let importBtn: HTMLButtonElement;
let csvFileInput: HTMLInputElement;
let inputLabel: HTMLLabelElement;
let watchOptions: HTMLElement;
let deepCutsCheckbox: HTMLInputElement;
let gamesOptions: HTMLElement;
let gamesDeepCutsCheckbox: HTMLInputElement;
let emailCta: HTMLElement;
let indieBookstoreCta: HTMLElement;
let indieBookstoreBtn: HTMLButtonElement;
let indieStoreOverlay: HTMLElement;
let indieStoreContent: HTMLElement;
let indieStoreClose: HTMLButtonElement;
let indieStoreFallbackLink: HTMLAnchorElement;
let exampleSection: HTMLElement;
let emailInput: HTMLInputElement;
let emailSendBtn: HTMLButtonElement;
let emailStatus: HTMLElement;
let importBtns: HTMLElement;
let findStatus: HTMLElement;
let scanBtn: HTMLButtonElement;
let shelfImageInput: HTMLInputElement;
let shelfTipOverlay: HTMLElement;
let shelfTipCancel: HTMLButtonElement;
let shelfTipConfirm: HTMLButtonElement;
let shelfReviewOverlay: HTMLElement;
let shelfReviewClose: HTMLButtonElement;
let shelfReviewSummary: HTMLElement;
let shelfReviewList: HTMLUListElement;
let shelfReviewConfirm: HTMLButtonElement;
let inputSection: HTMLElement;
let clearBtn: HTMLButtonElement;
let startOverBtn: HTMLButtonElement;
let archetypeDisplay: HTMLElement;
let archetypeNameEl: HTMLElement;
let archetypeSecondaryEl: HTMLElement;
let shareCardBtn: HTMLButtonElement;

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getCurrentTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function clearAll(): void {
  items.length = 0;
  itemsList.innerHTML = "";
  itemsSection.style.display = "none";
  ctaRow.style.display = "none";
  resultsSection.style.display = "none";
  emailCta.style.display = "none";
  currentRecs = [];
  currentTasteProfile = "";
  currentShortTasteProfile = "";
  currentArchetype = "";
  currentArchetypeSecondary = "";
  currentArchetypeTagline = "";
  archetypeDisplay.style.display = "none";
  seenTitles.clear();
  document.querySelector(".error-banner")?.remove();
  exampleSection.style.display = activeCategory === "books" ? "flex" : "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchCategory(cat: Category): void {
  if (cat === activeCategory) return;
  activeCategory = cat;

  document.querySelectorAll<HTMLButtonElement>(".category-btn[data-category]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === cat);
  });

  items.length = 0;
  itemsList.innerHTML = "";
  itemsSection.style.display = "none";
  ctaRow.style.display = "none";
  resultsSection.style.display = "none";
  emailCta.style.display = "none";
  currentRecs = [];
  currentTasteProfile = "";
  currentShortTasteProfile = "";
  currentArchetype = "";
  currentArchetypeSecondary = "";
  currentArchetypeTagline = "";
  archetypeDisplay.style.display = "none";
  seenTitles.clear();
  document.querySelector(".error-banner")?.remove();

  const config = CATEGORY_CONFIG[cat];
  inputLabel.textContent = config.label;
  itemInput.placeholder = config.placeholder;

  importBtns.style.display = cat === "books" ? "flex" : "none";
  watchOptions.style.display = cat === "watch" ? "flex" : "none";
  gamesOptions.style.display = cat === "games" ? "flex" : "none";
  exampleSection.style.display = cat === "books" ? "flex" : "none";
}

function addItem(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase())) {
    itemInput.value = "";
    return;
  }
  const item: Item = { id: generateId(), name: trimmed, rating: null };
  items.push(item);
  renderItem(item);
  itemInput.value = "";
  updateCta();
}

function removeItem(id: string): void {
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) items.splice(idx, 1);
  document.querySelector(`[data-item-id="${id}"]`)?.remove();
  updateCta();
}

function setRating(id: string, rating: string): void {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.rating = item.rating === rating ? null : rating;
  document.querySelector(`[data-item-id="${id}"]`)
    ?.querySelectorAll(".rating-btn")
    .forEach((btn) => {
      const b = btn as HTMLElement;
      b.classList.toggle("active", b.dataset.rating === item.rating);
    });
}

function buildItemEl(item: Item): DocumentFragment {
  const clone = itemTemplate.content.cloneNode(true) as DocumentFragment;
  const li = clone.querySelector(".item-row") as HTMLElement;
  li.dataset.itemId = item.id;
  (li.querySelector(".item-name") as HTMLElement).textContent = item.name;
  li.querySelectorAll(".rating-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      setRating(item.id, (btn as HTMLElement).dataset.rating!),
    );
  });
  li.querySelector(".remove-btn")!.addEventListener("click", () =>
    removeItem(item.id),
  );
  if (item.rating) {
    li.querySelectorAll(".rating-btn").forEach((btn) => {
      const b = btn as HTMLElement;
      b.classList.toggle("active", b.dataset.rating === item.rating);
    });
  }
  return clone;
}

function renderItem(item: Item): void {
  itemsList.appendChild(buildItemEl(item));
  itemsSection.style.display = "block";
}

function updateCta(): void {
  ctaRow.style.display = items.length >= 1 ? "flex" : "none";
  if (items.length === 0) itemsSection.style.display = "none";
  exampleSection.style.display = items.length === 0 && activeCategory === "books" ? "flex" : "none";
  findBtn.disabled = items.length < 3;
  if (items.length >= 1 && items.length < 3) {
    findBtnText.textContent = `Add ${3 - items.length} more to continue`;
  } else {
    findBtnText.textContent = "Find my recommendations";
  }
}

function fillRecCard(li: HTMLElement, rec: Recommendation): void {
  (li.querySelector(".rec-title") as HTMLElement).textContent = rec.title;
  (li.querySelector(".rec-author") as HTMLElement).textContent = rec.author || "";
  (li.querySelector(".rec-score") as HTMLElement).textContent =
    typeof rec.match_score === "number"
      ? `${Math.round(rec.match_score)}%`
      : String(rec.match_score);
  (li.querySelector(".rec-why") as HTMLElement).textContent = rec.why;
  (li.querySelector(".rec-vibe") as HTMLElement).textContent = rec.vibe || "";

  const link = li.querySelector(".rec-link") as HTMLAnchorElement;
  const config = CATEGORY_CONFIG[activeCategory];
  if (config.linkText) {
    link.textContent = config.linkText;
    link.href = activeCategory === "watch"
      ? (rec.justwatch_search || `https://www.justwatch.com/uk/search?q=${encodeURIComponent(rec.title)}`)
      : rec.amazon_search ||
        (activeCategory === "podcasts"
          ? `https://open.spotify.com/search/${encodeURIComponent(rec.title)}`
          : `https://www.amazon.co.uk/s?k=${encodeURIComponent(rec.title + " " + (rec.author || ""))}&tag=uncuratedapp-20`);
    link.style.display = "";
  } else {
    link.style.display = "none";
  }

  const watchFields = li.querySelector(".watch-fields") as HTMLElement;
  if (activeCategory === "watch") {
    watchFields.style.display = "flex";
    (li.querySelector(".rec-format-badge") as HTMLElement).textContent = rec.format || "";
    (li.querySelector(".rec-runtime") as HTMLElement).textContent = rec.runtime || "";
    (li.querySelector(".rec-year") as HTMLElement).textContent = rec.year || "";
  } else {
    watchFields.style.display = "none";
  }

  const gamesFields = li.querySelector(".games-fields") as HTMLElement;
  if (activeCategory === "games") {
    gamesFields.style.display = "flex";
    (li.querySelector(".rec-platform-badge") as HTMLElement).textContent = rec.platform || "";
    (li.querySelector(".rec-playtime-badge") as HTMLElement).textContent = rec.play_time || "";
    (li.querySelector(".rec-year-badge") as HTMLElement).textContent = rec.year || "";
  } else {
    gamesFields.style.display = "none";
  }
}

function showDismissReasons(cardEl: HTMLElement): void {
  (cardEl.querySelector(".rec-footer") as HTMLElement).style.display = "none";
  (cardEl.querySelector(".dismiss-reasons") as HTMLElement).style.display = "flex";
}

function hideDismissReasons(cardEl: HTMLElement): void {
  (cardEl.querySelector(".dismiss-reasons") as HTMLElement).style.display = "none";
  (cardEl.querySelector(".rec-footer") as HTMLElement).style.display = "flex";
}

function bindCardButtons(cardEl: HTMLElement, rec: Recommendation): void {
  const readBtn = cardEl.querySelector(".read-this-btn") as HTMLButtonElement;
  const config = CATEGORY_CONFIG[activeCategory];
  readBtn.textContent = config.dismissBtn;
  readBtn.disabled = false;

  const reasons = DISMISS_REASONS[activeCategory];
  if (reasons) {
    const reasonBtnsContainer = cardEl.querySelector(".dismiss-reason-btns") as HTMLElement;
    reasonBtnsContainer.innerHTML = "";
    reasons.forEach((reason) => {
      const btn = document.createElement("button");
      btn.className = "dismiss-reason-btn";
      btn.type = "button";
      btn.dataset.reason = reason;
      btn.textContent = reason;
      btn.onclick = () => {
        hideDismissReasons(cardEl);
        replaceRec(cardEl, rec.title, reason);
      };
      reasonBtnsContainer.appendChild(btn);
    });
    readBtn.onclick = () => showDismissReasons(cardEl);
    (cardEl.querySelector(".dismiss-cancel-btn") as HTMLButtonElement).onclick = () => {
      hideDismissReasons(cardEl);
    };
  } else {
    readBtn.onclick = () => replaceRec(cardEl, rec.title);
  }
}

function renderRecCard(rec: Recommendation): void {
  const clone = recTemplate.content.cloneNode(true) as DocumentFragment;
  const li = clone.querySelector(".rec-card") as HTMLElement;
  fillRecCard(li, rec);
  bindCardButtons(li, rec);
  recsList.appendChild(clone);
}

function renderResults(data: ApiResponse): void {
  currentTasteProfile = data.taste_profile;
  currentShortTasteProfile = data.short_taste_profile || "";
  currentArchetype = data.archetype || "";
  currentArchetypeSecondary = data.archetype_secondary || "";
  currentArchetypeTagline = data.archetype_tagline || "";
  currentRecs = [...(data.recommendations || [])].sort((a, b) => b.match_score - a.match_score);
  seenTitles.clear();
  currentRecs.forEach((r) => seenTitles.add(r.title.toLowerCase()));

  if (currentArchetype) {
    archetypeNameEl.innerHTML = "";
    const archetypeEmoji = (activeCategory === "games" ? GAMES_ARCHETYPE_ICONS : activeCategory === "watch" ? WATCH_ARCHETYPE_ICONS : ARCHETYPE_ICONS)[currentArchetype];
    if (archetypeEmoji) {
      const emojiSpan = document.createElement("span");
      emojiSpan.textContent = archetypeEmoji;
      emojiSpan.style.marginRight = "8px";
      archetypeNameEl.appendChild(emojiSpan);
    }
    archetypeNameEl.appendChild(document.createTextNode(currentArchetype));
    if (currentArchetypeSecondary) {
      archetypeSecondaryEl.textContent = `with a streak of ${currentArchetypeSecondary}`;
      archetypeSecondaryEl.style.display = "";
    } else {
      archetypeSecondaryEl.style.display = "none";
    }
    archetypeDisplay.style.display = "block";
  } else {
    archetypeDisplay.style.display = "none";
  }

  tasteProfileText.textContent = currentTasteProfile;
  recsList.innerHTML = "";
  currentRecs.forEach((rec) => renderRecCard(rec));

  emailInput.value = "";
  emailStatus.textContent = "";
  emailStatus.className = "email-cta-status";
  emailSendBtn.disabled = false;
  emailSendBtn.textContent = "Send to my inbox";
  shareCardBtn.disabled = false;
  shareCardBtn.textContent = "Share my recommendations";
  shareCardBtn.querySelector("svg")?.removeAttribute("style");
  emailCta.style.display = "flex";
  indieBookstoreCta.style.display = activeCategory === "books" ? "flex" : "none";

  resultsSection.style.display = "flex";
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function replaceRec(
  cardEl: HTMLElement,
  oldTitle: string,
  dismissReason?: string,
): Promise<void> {
  const readBtn = cardEl.querySelector(".read-this-btn") as HTMLButtonElement;
  readBtn.disabled = true;
  readBtn.textContent = "Finding…";
  cardEl.classList.add("replacing");

  const excludeTitles = [
    ...Array.from(seenTitles),
    ...items.map((i) => i.name.toLowerCase()),
  ];
  const currentlyShown = currentRecs
    .filter((r) => r.title !== oldTitle)
    .map((r) => r.title);
  const payload = items.map((i) => ({ name: i.name, rating: i.rating || "unrated" }));

  const replaceBody: Record<string, unknown> = {
    items: payload,
    exclude: excludeTitles,
    currentlyShown,
    category: activeCategory,
    dismissReason,
  };
  if (activeCategory === "watch") {
    replaceBody.format = watchFormat;
    replaceBody.mood = watchMood;
    if (watchDeepCuts) replaceBody.deepCuts = true;
  }
  if (activeCategory === "games") {
    replaceBody.platform = gamesPlatforms.join(",") || "all";
    if (gamesDeepCuts) replaceBody.deepCuts = true;
  }

  try {
    const reqBody = JSON.stringify(replaceBody);
    let res = await fetch("/api/recommendations/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: reqBody,
    });
    if (!res.ok && res.status >= 500) {
      await new Promise<void>((r) => setTimeout(r, 1500));
      res = await fetch("/api/recommendations/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: reqBody,
      });
    }

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const { recommendation } = (await res.json()) as {
      recommendation: Recommendation;
    };

    seenTitles.add(recommendation.title.toLowerCase());
    const idx = currentRecs.findIndex((r) => r.title === oldTitle);
    if (idx !== -1) currentRecs[idx] = recommendation;

    cardEl.classList.add("fade-out");
    await new Promise((r) => setTimeout(r, 200));

    fillRecCard(cardEl, recommendation);
    bindCardButtons(cardEl, recommendation);
    cardEl.classList.remove("replacing", "fade-out");
    cardEl.classList.add("fade-in");
    setTimeout(() => cardEl.classList.remove("fade-in"), 400);
  } catch (err: unknown) {
    readBtn.disabled = false;
    readBtn.textContent = CATEGORY_CONFIG[activeCategory].dismissBtn;
    if (DISMISS_REASONS[activeCategory]) {
      readBtn.onclick = () => showDismissReasons(cardEl);
    } else {
      readBtn.onclick = () => replaceRec(cardEl, oldTitle);
    }
    cardEl.classList.remove("replacing");
    const msg =
      err instanceof Error ? err.message : "Something went wrong.";
    showInlineError(cardEl, msg);
  }
}

function showInlineError(cardEl: HTMLElement, msg: string): void {
  const existing = cardEl.querySelector(".inline-error");
  if (existing) existing.remove();
  const el = document.createElement("p");
  el.className = "inline-error";
  el.textContent = msg;
  cardEl.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function showError(msg: string, anchor: HTMLElement = ctaRow, extraClass?: string): void {
  document.querySelector(extraClass ? `.${extraClass}` : ".error-banner:not(.scan-error-banner)")?.remove();
  const el = document.createElement("div");
  el.className = extraClass ? `error-banner ${extraClass}` : "error-banner";
  el.textContent = msg;
  anchor.after(el);
  setTimeout(() => el.remove(), 8000);
}

async function fetchRecommendations(): Promise<void> {
  if (items.length < 3) {
    showError(CATEGORY_CONFIG[activeCategory].minError);
    return;
  }

  const payload = items.map((i) => ({ name: i.name, rating: i.rating || "unrated" }));

  findBtn.disabled = true;
  findBtnText.textContent = "Thinking…";
  findLoader.classList.add("visible");
  findStatus.textContent = "Analysing your taste…";
  resultsSection.style.display = "none";

  document.querySelector(".error-banner")?.remove();

  const t1 = setTimeout(() => { findStatus.textContent = "Matching your taste…"; }, 3000);
  const t2 = setTimeout(() => { findStatus.textContent = "Nearly there…"; }, 6000);

  const recBody: Record<string, unknown> = { items: payload, category: activeCategory };
  if (activeCategory === "watch") {
    recBody.format = watchFormat;
    recBody.mood = watchMood;
    if (watchDeepCuts) recBody.deepCuts = true;
  }
  if (activeCategory === "games") {
    recBody.platform = gamesPlatforms.join(",") || "all";
    if (gamesDeepCuts) recBody.deepCuts = true;
  }

  const fetchStart = Date.now();
  try {
    const reqBody = JSON.stringify(recBody);
    let res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: reqBody,
    });
    if (!res.ok && res.status >= 500) {
      await new Promise<void>((r) => setTimeout(r, 1500));
      res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: reqBody,
      });
    }

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = (await res.json()) as ApiResponse;
    const elapsed = Date.now() - fetchStart;
    if (elapsed < 800) await new Promise<void>((r) => setTimeout(r, 800 - elapsed));
    renderResults(data);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    showError(msg);
  } finally {
    clearTimeout(t1);
    clearTimeout(t2);
    findBtn.disabled = false;
    findBtnText.textContent = "Find my recommendations";
    findLoader.classList.remove("visible");
    findStatus.textContent = "";
  }
}

function buildShareText(): string {
  if (!currentTasteProfile || currentRecs.length === 0) return "";
  const top = currentRecs[0];
  const score =
    typeof top.match_score === "number"
      ? `${Math.round(top.match_score)}%`
      : String(top.match_score);
  const config = CATEGORY_CONFIG[activeCategory];
  const profileText = currentShortTasteProfile || currentTasteProfile;

  if (currentArchetype) {
    return (
      `I'm ${currentArchetype} — ${profileText}\n\n` +
      `Top match: ${top.title} ${config.shareByWord} ${top.author} (${score} match) — ${top.vibe}\n\n` +
      `Find yours at uncurated.app`
    );
  }

  return (
    `${config.sharePrefix} ${profileText}\n\n` +
    `Top match: ${top.title} ${config.shareByWord} ${top.author} (${score} match) — ${top.vibe}\n\n` +
    `via Uncurated`
  );
}

function getIndieDirectory(): { url: string; label: string; name: string } {
  const lang = (navigator.language ?? "").toLowerCase();
  if (lang.startsWith("en-us") || lang.startsWith("en-ca")) {
    return { url: "https://bookshop.org", label: "Browse on Bookshop.org →", name: "Bookshop.org" };
  }
  return {
    url: "https://www.booksellers.org.uk/bookshopsearch",
    label: "Browse on Booksellers Association →",
    name: "Booksellers Association",
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function showIndieStoreError(indieDir: { url: string; label: string; name: string }): void {
  indieStoreContent.innerHTML = "";
  const p = document.createElement("p");
  p.className = "indie-store-empty";
  p.textContent = `Couldn't find your location or load stores. Try the ${indieDir.name} link below.`;
  indieStoreContent.appendChild(p);
}

function renderIndieStores(elements: OsmElement[], userLat: number, userLng: number, indieDir: { url: string; label: string; name: string }): void {
  const stores = elements
    .filter(e => e.tags?.name)
    .map(e => ({ ...e, distKm: haversineKm(userLat, userLng, e.lat ?? e.center?.lat ?? 0, e.lon ?? e.center?.lon ?? 0) }))
    .sort((a, b) => a.distKm - b.distKm);

  indieStoreContent.innerHTML = "";

  if (stores.length === 0) {
    const p = document.createElement("p");
    p.className = "indie-store-empty";
    p.textContent = `No bookstores found nearby. Try the ${indieDir.name} link below.`;
    indieStoreContent.appendChild(p);
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "indie-store-list";

  stores.forEach(s => {
    const t = s.tags!;
    const addrParts = [t["addr:housenumber"], t["addr:street"], t["addr:city"]].filter(Boolean);
    const distLabel = s.distKm < 1 ? `${Math.round(s.distKm * 1000)} m` : `${s.distKm.toFixed(1)} km`;

    const li = document.createElement("li");
    li.className = "indie-store-card";

    const nameRow = document.createElement("div");
    nameRow.className = "indie-store-name-row";
    const nameSpan = document.createElement("span");
    nameSpan.className = "indie-store-name";
    nameSpan.textContent = t.name!;
    const distSpan = document.createElement("span");
    distSpan.className = "indie-store-dist";
    distSpan.textContent = distLabel;
    nameRow.appendChild(nameSpan);
    nameRow.appendChild(distSpan);
    li.appendChild(nameRow);

    if (addrParts.length > 0) {
      const addrSpan = document.createElement("span");
      addrSpan.className = "indie-store-addr";
      addrSpan.textContent = addrParts.join(", ");
      li.appendChild(addrSpan);
    }

    const linksDiv = document.createElement("div");
    linksDiv.className = "indie-store-links";
    if (t.phone) {
      const a = document.createElement("a");
      a.className = "indie-store-link";
      a.href = `tel:${t.phone}`;
      a.textContent = t.phone;
      linksDiv.appendChild(a);
    }
    if (t.website) {
      const a = document.createElement("a");
      a.className = "indie-store-link";
      a.href = t.website;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Website →";
      linksDiv.appendChild(a);
    }
    if (linksDiv.children.length > 0) li.appendChild(linksDiv);

    ul.appendChild(li);
  });

  indieStoreContent.appendChild(ul);
}

function closeIndieStore(): void {
  indieStoreOverlay.style.display = "none";
  document.body.style.overflow = "";
  indieBookstoreBtn.disabled = false;
}

function openIndieFinder(indieDir: { url: string; label: string; name: string }): void {
  indieBookstoreBtn.disabled = true;
  indieStoreOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";
  indieStoreContent.innerHTML = "";
  const p = document.createElement("p");
  p.className = "indie-store-loading";
  p.textContent = "Finding bookstores near you…";
  indieStoreContent.appendChild(p);

  if (!navigator.geolocation) { showIndieStoreError(indieDir); return; }

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const q = `[out:json][timeout:10];(node["shop"="books"](around:8000,${coords.latitude},${coords.longitude});way["shop"="books"](around:8000,${coords.latitude},${coords.longitude}););out center;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: q });
        if (!res.ok) throw new Error();
        const data = await res.json() as { elements: OsmElement[] };
        renderIndieStores(data.elements, coords.latitude, coords.longitude, indieDir);
      } catch {
        showIndieStoreError(indieDir);
      }
    },
    () => showIndieStoreError(indieDir),
    { timeout: 8000 }
  );
}

async function copyProfile(): Promise<void> {
  const text = buildShareText();
  if (!text) return;
  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch { /* user dismissed */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.classList.add("copied");
    copyLabel.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyLabel.textContent = "Share";
    }, 2000);
  } catch {
    copyLabel.textContent = "Failed";
    setTimeout(() => {
      copyLabel.textContent = "Share";
    }, 1500);
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseGoodreadsCSV(text: string): void {
  // Strip UTF-8 BOM if present (Goodreads exports sometimes include it)
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return;

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const titleIdx = headers.findIndex((h) => h === "title");
  const ratingIdx = headers.findIndex((h) => h === "my rating");
  const shelfIdx = headers.findIndex((h) => h === "exclusive shelf");

  if (titleIdx === -1) {
    showError("Couldn't find a Title column in this CSV. Is it a Goodreads export?");
    return;
  }

  interface CsvEntry { title: string; rating: string | null; }
  const rated: CsvEntry[] = [];
  const unrated: CsvEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const shelf = shelfIdx !== -1 ? cols[shelfIdx]?.trim() : "";
    if (shelf && shelf !== "read") continue;

    const title = cols[titleIdx]?.trim();
    if (!title) continue;
    if (items.some((it) => it.name.toLowerCase() === title.toLowerCase())) continue;

    const ratingRaw = ratingIdx !== -1 ? parseInt(cols[ratingIdx] ?? "0", 10) : 0;
    const rating =
      ratingRaw === 5 ? "loved"
      : ratingRaw === 4 ? "liked"
      : ratingRaw === 3 ? "meh"
      : ratingRaw === 2 ? "meh"
      : ratingRaw === 1 ? "hated"
      : null;

    if (rating) rated.push({ title, rating });
    else unrated.push({ title, rating: null });
  }

  const CAP = 500;
  const toAdd = [...rated, ...unrated].slice(0, CAP);

  if (toAdd.length > 0) {
    const frag = document.createDocumentFragment();
    for (const entry of toAdd) {
      const item: Item = { id: generateId(), name: entry.title, rating: entry.rating };
      items.push(item);
      frag.appendChild(buildItemEl(item));
    }
    itemsList.appendChild(frag);
    itemsSection.style.display = "block";
  }

  updateCta();
  if (toAdd.length === 0) {
    showError("No 'read' books found in this CSV. Make sure it's a Goodreads library export.");
  }
}

function showScanError(msg: string): void {
  showError(msg, inputSection, "scan-error-banner");
}

async function compressImageForScan(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      function tryQuality(quality: number): void {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("Failed to compress image.")); return; }
          if (blob.size <= 100 * 1024 || quality <= 0.1) {
            resolve(blob);
          } else {
            tryQuality(Math.round((quality - 0.1) * 10) / 10);
          }
        }, "image/jpeg", quality);
      }
      tryQuality(0.7);
    };
    img.src = url;
  });
}

// Synchronous scan — directly awaits the server response (no job polling)
async function handleShelfScan(file: File): Promise<void> {
  scanBtn.disabled = true;
  const origContent = scanBtn.innerHTML;
  scanBtn.innerHTML = `<span class="import-btn-spinner" aria-hidden="true"></span>Scanning…`;
  const stillTimer = setTimeout(() => {
    scanBtn.innerHTML = `<span class="import-btn-spinner" aria-hidden="true"></span>Still scanning…`;
  }, 15_000);

  try {
    const blob = await compressImageForScan(file);
    const formData = new FormData();
    formData.append("image", blob, "shelf.jpg");

    const res = await fetch("/api/scan-shelf", { method: "POST", body: formData });

    if (!res.ok) {
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("json")) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `Server error ${res.status}`);
      }
      throw new Error(`Server error ${res.status}`);
    }

    const data = (await res.json()) as {
      books?: Array<{ title: string; author: string; confidence: "high" | "medium" }>;
      unreadable_count?: number;
      error?: string;
    };

    if (data.error) throw new Error(data.error);

    if (!data.books || data.books.length === 0) {
      showScanError("No book titles were readable in this photo. Try better lighting or a closer shot.");
      return;
    }

    showShelfReview(data.books, data.unreadable_count ?? 0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    showScanError(msg);
  } finally {
    clearTimeout(stillTimer);
    scanBtn.disabled = false;
    scanBtn.innerHTML = origContent;
  }
}

function showShelfTip(): void {
  shelfTipOverlay.style.display = "flex";
}

function hideShelfTip(): void {
  shelfTipOverlay.style.display = "none";
}

function showShelfReview(
  books: Array<{ title: string; author: string; confidence: "high" | "medium" }>,
  unreadableCount: number,
): void {
  reviewBooks = books.map((b, i) => ({ ...b, id: String(i) }));

  let highCount = 0;
  let medCount = 0;
  for (const b of reviewBooks) {
    if (b.confidence === "high") highCount++;
    else medCount++;
  }

  let summary = `Found ${highCount} book${highCount !== 1 ? "s" : ""} clearly`;
  if (medCount > 0) summary += `, plus ${medCount} to double-check`;
  if (unreadableCount > 0) summary += `. Approximately ${unreadableCount} spine${unreadableCount !== 1 ? "s" : ""} weren't readable`;
  summary += ". Add any missing ones manually.";

  shelfReviewSummary.textContent = summary;
  renderReviewList();

  shelfReviewOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function renderReviewList(): void {
  shelfReviewList.innerHTML = "";

  reviewBooks.forEach((book) => {
    const li = document.createElement("li");
    li.className = "review-book-row";

    const infoDiv = document.createElement("div");
    infoDiv.className = "review-book-info";

    const titleEl = document.createElement("span");
    titleEl.className = "review-book-title";
    titleEl.textContent = book.title;
    infoDiv.appendChild(titleEl);

    if (book.author) {
      const authorEl = document.createElement("span");
      authorEl.className = "review-book-author";
      authorEl.textContent = book.author;
      infoDiv.appendChild(authorEl);
    }

    if (book.confidence === "medium") {
      const badge = document.createElement("span");
      badge.className = "review-confidence-badge";
      badge.textContent = "double check this";
      infoDiv.appendChild(badge);
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "review-remove-btn";
    removeBtn.setAttribute("aria-label", "Remove");
    removeBtn.setAttribute("type", "button");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      reviewBooks = reviewBooks.filter((b) => b.id !== book.id);
      li.remove();
      updateReviewConfirmBtn();
    });

    li.appendChild(infoDiv);
    li.appendChild(removeBtn);
    shelfReviewList.appendChild(li);
  });

  updateReviewConfirmBtn();
}

function updateReviewConfirmBtn(): void {
  const count = reviewBooks.length;
  shelfReviewConfirm.textContent =
    count === 0 ? "No books to add" : `Add ${count} book${count !== 1 ? "s" : ""}`;
  shelfReviewConfirm.disabled = count === 0;
}

function closeShelfReview(): void {
  shelfReviewOverlay.style.display = "none";
  document.body.style.overflow = "";
}

function confirmShelfBooks(): void {
  let added = 0;
  for (const book of reviewBooks) {
    if (items.some((i) => i.name.toLowerCase() === book.title.toLowerCase())) continue;
    const item: Item = { id: generateId(), name: book.title, rating: "liked" };
    items.push(item);
    renderItem(item);
    added++;
  }
  closeShelfReview();
  updateCta();
  if (added === 0) {
    showScanError("All detected books were already in your list.");
  }
}

function truncateAtWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

function buildShareCardEl(profileText: string, recs: Recommendation[], archetype?: string, archetypeSecondary?: string, archetypeTagline?: string): HTMLElement {
  const bg = getCssVar("--bg");
  const surface = getCssVar("--surface");
  const textColor = getCssVar("--text");
  const textMuted = getCssVar("--text-muted");
  const border = getCssVar("--border");
  const top = recs[0];

  const wrap = document.createElement("div");
  wrap.style.cssText = `position:absolute;left:-9999px;top:0;width:390px;height:700px;overflow:hidden;background:${bg};padding:36px 36px 44px;box-sizing:border-box;display:flex;flex-direction:column;`;

  const header = document.createElement("div");
  header.style.cssText = "text-align:center;margin-bottom:18px;";

  const wordmark = document.createElement("div");
  wordmark.style.cssText = `font-family:'DM Serif Display',Georgia,serif;font-size:22px;line-height:1;margin-bottom:6px;`;
  const unSpan = document.createElement("span");
  unSpan.style.cssText = "position:relative;color:#888;display:inline-block;";
  const unTxt = document.createElement("span");
  unTxt.textContent = "Un";
  const strike = document.createElement("span");
  strike.setAttribute("aria-hidden", "true");
  strike.style.cssText = "position:absolute;top:42%;left:-1px;right:-1px;height:2px;background:#f5a623;border-radius:1px;";
  unSpan.appendChild(unTxt);
  unSpan.appendChild(strike);
  const curatedSpan = document.createElement("span");
  curatedSpan.textContent = "curated";
  curatedSpan.style.color = textColor;
  wordmark.appendChild(unSpan);
  wordmark.appendChild(curatedSpan);
  header.appendChild(wordmark);

  const categoryLines: Partial<Record<Category, string>> = {
    books: "my reading picks",
    watch: "my watch picks",
    games: "my games picks",
    podcasts: "my listening picks",
  };
  const tagline = document.createElement("p");
  tagline.textContent = categoryLines[activeCategory] ?? "honest recommendations";
  tagline.style.cssText = `margin:0 0 14px;font-size:11px;color:${textMuted};letter-spacing:0.06em;`;
  header.appendChild(tagline);

  const headerSep = document.createElement("div");
  headerSep.style.cssText = "width:48px;height:2px;background:#f5a623;border-radius:1px;margin:0 auto;";
  header.appendChild(headerSep);

  wrap.appendChild(header);

  const topSection = document.createElement("div");
  topSection.style.cssText = "text-align:center;";

  if (archetype) {
    const archetypeEl = document.createElement("h2");
    const archetypeFontSize = archetype.length > 28 ? 26 : archetype.length >= 20 ? 29 : 34;
    archetypeEl.style.cssText = `font-family:'DM Serif Display',Georgia,serif;font-size:${archetypeFontSize}px;font-weight:400;line-height:1.2;color:${textColor};margin:0 0 10px;`;
    const emoji = (activeCategory === "games" ? GAMES_ARCHETYPE_ICONS : activeCategory === "watch" ? WATCH_ARCHETYPE_ICONS : ARCHETYPE_ICONS)[archetype];
    if (emoji) {
      const emojiSpan = document.createElement("span");
      emojiSpan.textContent = emoji + " ";
      archetypeEl.appendChild(emojiSpan);
    }
    archetypeEl.appendChild(document.createTextNode(archetype));
    topSection.appendChild(archetypeEl);

    if (archetypeSecondary) {
      const secEl = document.createElement("p");
      secEl.style.cssText = `margin:0 0 20px;font-size:13px;color:${textMuted};`;
      secEl.textContent = `with a streak of ${archetypeSecondary}`;
      topSection.appendChild(secEl);
    } else {
      (topSection.lastChild as HTMLElement).style.marginBottom = "20px";
    }
  } else {
    const label = document.createElement("p");
    label.style.cssText = `margin:0 0 20px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${textMuted};font-weight:600;`;
    label.textContent = "Your Uncurated Profile";
    topSection.appendChild(label);
  }

  const sep = document.createElement("div");
  sep.style.cssText = "width:48px;height:2px;background:#f5a623;border-radius:1px;margin:0 auto 22px;";
  topSection.appendChild(sep);

  const profileTextEl = document.createElement("p");
  const displayText = archetypeTagline || profileText;
  const isTagline = Boolean(archetypeTagline);
  profileTextEl.style.cssText = `margin:0;font-size:15px;line-height:1.65;color:${textMuted};${isTagline ? "font-style:italic;" : ""}`;
  profileTextEl.textContent = displayText;
  topSection.appendChild(profileTextEl);

  wrap.appendChild(topSection);

  if (top) {
    const matchLabel = document.createElement("p");
    matchLabel.style.cssText = `margin:12px 0 12px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${textMuted};font-weight:600;`;
    matchLabel.textContent = "Top match";
    wrap.appendChild(matchLabel);

    const matchCard = document.createElement("div");
    matchCard.style.cssText = `background:${surface};border:1px solid ${border};border-radius:12px;padding:20px 22px;`;

    const titleRow = document.createElement("div");
    titleRow.style.cssText = "display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:16px;";

    const titleEl = document.createElement("span");
    titleEl.style.cssText = `font-family:'DM Serif Display',Georgia,serif;font-size:19px;font-weight:400;line-height:1.25;color:${textColor};flex:1;`;
    titleEl.textContent = top.title;
    titleRow.appendChild(titleEl);

    const scoreWrap = document.createElement("div");
    scoreWrap.style.cssText = "text-align:right;flex-shrink:0;";
    const scoreEl = document.createElement("span");
    scoreEl.style.cssText = "font-size:26px;font-weight:700;color:#f5a623;line-height:1;display:block;";
    scoreEl.textContent = typeof top.match_score === "number" ? `${Math.round(top.match_score)}%` : String(top.match_score);
    const scoreLbl = document.createElement("span");
    scoreLbl.style.cssText = `font-size:10px;color:${textMuted};letter-spacing:0.06em;text-transform:uppercase;display:block;margin-top:2px;`;
    scoreLbl.textContent = "match";
    scoreWrap.appendChild(scoreEl);
    scoreWrap.appendChild(scoreLbl);
    titleRow.appendChild(scoreWrap);
    matchCard.appendChild(titleRow);

    const authorEl = document.createElement("p");
    authorEl.style.cssText = `margin:0 0 10px;font-size:14px;color:${textMuted};`;
    authorEl.textContent = top.author;
    matchCard.appendChild(authorEl);

    if (activeCategory === "watch" && (top.format || top.runtime || top.year)) {
      const metaEl = document.createElement("p");
      metaEl.style.cssText = "margin:0 0 12px;display:flex;gap:6px;flex-wrap:wrap;";
      [top.format, top.runtime, top.year].filter(Boolean).forEach((val) => {
        const badge = document.createElement("span");
        badge.style.cssText = `font-size:10px;padding:2px 8px;border-radius:99px;border:1px solid ${border};color:${textMuted};background:${surface};`;
        badge.textContent = val!;
        metaEl.appendChild(badge);
      });
      matchCard.appendChild(metaEl);
    }

    if (top.vibe) {
      const vibeEl = document.createElement("span");
      vibeEl.className = "rec-vibe";
      vibeEl.style.cssText = "font-size:12px;padding:4px 12px;";
      vibeEl.textContent = top.vibe;
      matchCard.appendChild(vibeEl);
    }

    wrap.appendChild(matchCard);
  }

  const alsoRecs = recs.slice(1, 3).filter(Boolean);
  if (alsoRecs.length > 0) {
    const alsoLabel = document.createElement("p");
    alsoLabel.style.cssText = `margin:16px 0 12px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${textMuted};font-weight:600;`;
    alsoLabel.textContent = "Also recommended";
    wrap.appendChild(alsoLabel);

    const alsoList = document.createElement("div");
    alsoList.style.cssText = "display:flex;flex-direction:column;gap:7px;";

    alsoRecs.forEach((rec) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:baseline;gap:6px;overflow:hidden;";

      const bullet = document.createElement("span");
      bullet.style.cssText = `font-size:12px;color:${textMuted};flex-shrink:0;line-height:1.5;`;
      bullet.textContent = "·";

      const titleSpan = document.createElement("span");
      titleSpan.style.cssText = `font-size:14px;color:${textColor};flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.5;`;
      titleSpan.textContent = rec.title;

      const scoreSpan = document.createElement("span");
      scoreSpan.style.cssText = "font-size:12px;color:#f5a623;font-weight:600;flex-shrink:0;line-height:1.5;";
      scoreSpan.textContent = `${Math.round(rec.match_score)}% match`;

      row.appendChild(bullet);
      row.appendChild(titleSpan);
      row.appendChild(scoreSpan);
      alsoList.appendChild(row);
    });

    wrap.appendChild(alsoList);
  }

  const footerUrl = document.createElement("p");
  footerUrl.style.cssText = `margin:auto 0 0;text-align:center;font-size:12px;font-weight:600;letter-spacing:0.04em;`;
  const findYoursAt = document.createElement("span");
  findYoursAt.textContent = "Find yours at ";
  findYoursAt.style.color = textMuted;
  const urlSpan = document.createElement("span");
  urlSpan.textContent = "uncurated.app";
  urlSpan.style.color = "#f5a623";
  footerUrl.appendChild(findYoursAt);
  footerUrl.appendChild(urlSpan);
  wrap.appendChild(footerUrl);

  return wrap;
}

async function generateShareCard(): Promise<void> {
  if (!currentTasteProfile || currentRecs.length === 0) return;
  shareCardBtn.disabled = true;
  const origHtml = shareCardBtn.innerHTML;
  shareCardBtn.textContent = "Generating…";

  try {
    const { default: html2canvas } = await import("html2canvas");

    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('400 26px "DM Serif Display"'),
      document.fonts.load('400 17px "DM Serif Display"'),
      document.fonts.load('400 12px "DM Sans"'),
      document.fonts.load('700 26px "DM Sans"'),
      document.fonts.load('400 1px "tabler-icons"'),
    ]).catch(() => {});

    const profileText = currentShortTasteProfile || truncateAtWordBoundary(currentTasteProfile.trim(), 120);
    const topRecs = currentRecs.slice(0, 3);

    const cardEl = buildShareCardEl(profileText, topRecs, currentArchetype || undefined, currentArchetypeSecondary || undefined, currentArchetypeTagline || undefined);
    document.body.appendChild(cardEl);

    try {
      const canvas = await html2canvas(cardEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: getCssVar("--bg"),
        logging: false,
        width: 390,
        height: 700,
        windowWidth: 390,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "my-uncurated-picks.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      document.body.removeChild(cardEl);
    }
  } finally {
    shareCardBtn.disabled = false;
    shareCardBtn.innerHTML = origHtml;
  }
}

// Creates the <template> elements programmatically so React's server render
// doesn't need to handle them (React 18 doesn't populate template.content)
function createTemplates(): void {
  if (document.getElementById("item-template")) return;

  const itemTpl = document.createElement("template");
  itemTpl.id = "item-template";
  itemTpl.innerHTML = `<li class="item-row">
    <span class="item-name"></span>
    <div class="rating-group">
      <button class="rating-btn" data-rating="loved">Loved</button>
      <button class="rating-btn" data-rating="liked">Liked</button>
      <button class="rating-btn" data-rating="meh">Meh</button>
      <button class="rating-btn" data-rating="hated">Hated</button>
      <button class="rating-btn" data-rating="abandoned">DNF</button>
    </div>
    <button class="remove-btn" aria-label="Remove">×</button>
  </li>`;
  document.body.appendChild(itemTpl);

  const recTpl = document.createElement("template");
  recTpl.id = "rec-template";
  recTpl.innerHTML = `<li class="rec-card">
    <div class="rec-header">
      <div class="rec-meta">
        <span class="rec-title"></span>
        <span class="rec-author"></span>
      </div>
      <div class="rec-score-wrap">
        <span class="rec-score"></span>
        <span class="rec-score-label">match</span>
      </div>
    </div>
    <p class="rec-why"></p>
    <div class="watch-fields" style="display:none">
      <span class="rec-format-badge"></span>
      <span class="rec-runtime"></span>
      <span class="rec-year"></span>
    </div>
    <div class="games-fields" style="display:none">
      <span class="rec-platform-badge"></span>
      <span class="rec-playtime-badge"></span>
      <span class="rec-year-badge"></span>
    </div>
    <div class="rec-footer">
      <span class="rec-vibe"></span>
      <div class="rec-actions">
        <button class="read-this-btn" type="button">I've read this</button>
        <a class="rec-link" target="_blank" rel="noopener noreferrer">Find on Amazon →</a>
      </div>
    </div>
    <div class="dismiss-reasons" style="display:none">
      <span class="dismiss-prompt">Why skip this?</span>
      <div class="dismiss-reason-btns"></div>
      <button class="dismiss-cancel-btn" type="button">Cancel</button>
    </div>
  </li>`;
  document.body.appendChild(recTpl);
}

let _initialized = false;

export function initApp(): void {
  if (_initialized) return;
  _initialized = true;

  createTemplates();

  // Assign all DOM element refs
  itemInput = document.getElementById("item-input") as HTMLInputElement;
  addBtn = document.getElementById("add-btn") as HTMLButtonElement;
  itemsList = document.getElementById("items-list") as HTMLUListElement;
  itemsSection = document.getElementById("items-section") as HTMLElement;
  ctaRow = document.getElementById("cta-row") as HTMLElement;
  findBtn = document.getElementById("find-btn") as HTMLButtonElement;
  findLoader = document.getElementById("find-loader") as HTMLElement;
  findBtnText = findBtn.querySelector(".find-btn-text") as HTMLElement;
  resultsSection = document.getElementById("results-section") as HTMLElement;
  tasteProfileText = document.getElementById("taste-profile-text") as HTMLElement;
  recsList = document.getElementById("recs-list") as HTMLElement;
  copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;
  copyLabel = copyBtn.querySelector(".copy-label") as HTMLElement;
  itemTemplate = document.getElementById("item-template") as HTMLTemplateElement;
  recTemplate = document.getElementById("rec-template") as HTMLTemplateElement;
  importBtn = document.getElementById("import-btn") as HTMLButtonElement;
  csvFileInput = document.getElementById("csv-file-input") as HTMLInputElement;
  inputLabel = document.querySelector(".input-label") as HTMLLabelElement;
  watchOptions = document.getElementById("watch-options") as HTMLElement;
  deepCutsCheckbox = document.getElementById("deep-cuts-checkbox") as HTMLInputElement;
  gamesOptions = document.getElementById("games-options") as HTMLElement;
  gamesDeepCutsCheckbox = document.getElementById("games-deep-cuts-checkbox") as HTMLInputElement;
  emailCta = document.getElementById("email-cta") as HTMLElement;
  indieBookstoreCta = document.getElementById("indie-bookstore-cta") as HTMLElement;
  indieBookstoreBtn = document.getElementById("indie-bookstore-btn") as HTMLButtonElement;
  indieStoreOverlay = document.getElementById("indie-store-overlay") as HTMLElement;
  indieStoreContent = document.getElementById("indie-store-content") as HTMLElement;
  indieStoreClose = document.getElementById("indie-store-close") as HTMLButtonElement;
  indieStoreFallbackLink = document.querySelector(".indie-store-fallback-link") as HTMLAnchorElement;
  exampleSection = document.getElementById("example-section") as HTMLElement;
  emailInput = document.getElementById("email-input") as HTMLInputElement;
  emailSendBtn = document.getElementById("email-send-btn") as HTMLButtonElement;
  emailStatus = document.getElementById("email-cta-status") as HTMLElement;
  importBtns = document.getElementById("import-btns") as HTMLElement;
  findStatus = document.getElementById("find-status") as HTMLElement;
  scanBtn = document.getElementById("scan-btn") as HTMLButtonElement;
  shelfImageInput = document.getElementById("shelf-image-input") as HTMLInputElement;
  shelfTipOverlay = document.getElementById("shelf-tip-overlay") as HTMLElement;
  shelfTipCancel = document.getElementById("shelf-tip-cancel") as HTMLButtonElement;
  shelfTipConfirm = document.getElementById("shelf-tip-confirm") as HTMLButtonElement;
  shelfReviewOverlay = document.getElementById("shelf-review-overlay") as HTMLElement;
  shelfReviewClose = document.getElementById("shelf-review-close") as HTMLButtonElement;
  shelfReviewSummary = document.getElementById("shelf-review-summary") as HTMLElement;
  shelfReviewList = document.getElementById("shelf-review-list") as HTMLUListElement;
  shelfReviewConfirm = document.getElementById("shelf-review-confirm") as HTMLButtonElement;
  inputSection = document.querySelector(".input-section") as HTMLElement;
  clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;
  startOverBtn = document.getElementById("start-over-btn") as HTMLButtonElement;
  archetypeDisplay = document.getElementById("archetype-display") as HTMLElement;
  archetypeNameEl = document.getElementById("archetype-name") as HTMLElement;
  archetypeSecondaryEl = document.getElementById("archetype-secondary") as HTMLElement;
  shareCardBtn = document.getElementById("share-card-btn") as HTMLButtonElement;

  // Set up indie bookstore link
  const indieDir = getIndieDirectory();
  indieStoreFallbackLink.href = indieDir.url;
  indieStoreFallbackLink.textContent = indieDir.label;

  // CSV import
  importBtn.addEventListener("click", () => csvFileInput.click());
  csvFileInput.addEventListener("change", () => {
    const file = csvFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseGoodreadsCSV(text);
      csvFileInput.value = "";
    };
    reader.readAsText(file);
  });

  // Shelf scanner
  scanBtn.addEventListener("click", () => showShelfTip());
  shelfTipCancel.addEventListener("click", hideShelfTip);
  shelfTipConfirm.addEventListener("click", () => {
    hideShelfTip();
    shelfImageInput.click();
  });

  shelfTipOverlay.addEventListener("click", (e) => {
    if (e.target === shelfTipOverlay) hideShelfTip();
  });

  shelfImageInput.addEventListener("change", () => {
    const file = shelfImageInput.files?.[0];
    if (!file) return;
    shelfImageInput.value = "";
    void handleShelfScan(file);
  });

  shelfReviewClose.addEventListener("click", closeShelfReview);
  shelfReviewOverlay.addEventListener("click", (e) => {
    if (e.target === shelfReviewOverlay) closeShelfReview();
  });
  shelfReviewConfirm.addEventListener("click", confirmShelfBooks);

  // Share card
  shareCardBtn.addEventListener("click", () => void generateShareCard());

  // Category buttons
  document.querySelectorAll<HTMLButtonElement>(".category-btn[data-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchCategory(btn.dataset.category as Category);
    });
  });

  // Toggle buttons (format, mood, platform)
  document.querySelectorAll<HTMLButtonElement>(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.toggle!;
      const value = btn.dataset.value!;

      if (group === "platform") {
        const allBtns = btn.closest(".toggle-btns")!.querySelectorAll<HTMLButtonElement>(".toggle-btn");
        if (value === "all") {
          gamesPlatforms = [];
          allBtns.forEach((b) => b.classList.toggle("active", b.dataset.value === "all"));
        } else {
          const idx = gamesPlatforms.indexOf(value);
          if (idx === -1) gamesPlatforms.push(value);
          else gamesPlatforms.splice(idx, 1);
          allBtns.forEach((b) => {
            if (b.dataset.value === "all") b.classList.toggle("active", gamesPlatforms.length === 0);
            else b.classList.toggle("active", gamesPlatforms.includes(b.dataset.value!));
          });
        }
      } else {
        btn.closest(".toggle-btns")!.querySelectorAll<HTMLButtonElement>(".toggle-btn").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        if (group === "format") watchFormat = value as "series" | "films" | "both";
        if (group === "mood") watchMood = value as "light" | "dark" | "any";
      }
    });
  });

  deepCutsCheckbox.addEventListener("change", () => {
    watchDeepCuts = deepCutsCheckbox.checked;
  });

  gamesDeepCutsCheckbox.addEventListener("change", () => {
    gamesDeepCuts = gamesDeepCutsCheckbox.checked;
  });

  // Email
  async function sendEmail(): Promise<void> {
    const email = emailInput.value.trim();
    if (!email) {
      emailInput.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailStatus.textContent = "Please enter a valid email address.";
      emailStatus.className = "email-cta-status error";
      return;
    }
    if (!currentTasteProfile || currentRecs.length === 0) return;

    emailSendBtn.disabled = true;
    emailSendBtn.textContent = "Sending…";
    emailStatus.textContent = "";
    emailStatus.className = "email-cta-status";

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          taste_profile: currentTasteProfile,
          recommendations: currentRecs,
          category: activeCategory,
          colorScheme: getCurrentTheme(),
          archetype: currentArchetype || undefined,
          archetype_secondary: currentArchetypeSecondary || undefined,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `Server error ${res.status}`);
      }

      emailInput.value = "";
      emailStatus.textContent = "Sent! Check your inbox.";
      emailStatus.className = "email-cta-status success";
      emailSendBtn.textContent = "Sent";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      emailStatus.textContent = msg;
      emailStatus.className = "email-cta-status error";
      emailSendBtn.disabled = false;
      emailSendBtn.textContent = "Send to my inbox";
    }
  }

  // Core interactions
  itemInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addItem(itemInput.value);
  });
  addBtn.addEventListener("click", () => addItem(itemInput.value));
  findBtn.addEventListener("click", fetchRecommendations);
  clearBtn.addEventListener("click", clearAll);
  startOverBtn.addEventListener("click", clearAll);
  copyBtn.addEventListener("click", copyProfile);
  indieBookstoreBtn.addEventListener("click", () => openIndieFinder(indieDir));
  indieStoreClose.addEventListener("click", closeIndieStore);
  indieStoreOverlay.addEventListener("click", (e) => { if (e.target === indieStoreOverlay) closeIndieStore(); });
  emailSendBtn.addEventListener("click", sendEmail);
  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendEmail();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (shelfTipOverlay.style.display !== "none") { hideShelfTip(); return; }
    if (shelfReviewOverlay.style.display !== "none") { closeShelfReview(); return; }
    if (indieStoreOverlay.style.display !== "none") { closeIndieStore(); return; }
  });
}
