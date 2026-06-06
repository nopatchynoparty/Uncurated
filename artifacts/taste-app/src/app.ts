import "./styles.css";

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
  where_to_watch?: string;
  year?: string;
  platform?: string;
  play_time?: string;
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
    linkText: null,
    sharePrefix: "My viewer profile:",
    shareByWord: "by",
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
    "Not available on my platforms",
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

const itemInput = document.getElementById("item-input") as HTMLInputElement;
const addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const itemsList = document.getElementById("items-list") as HTMLUListElement;
const itemsSection = document.getElementById("items-section") as HTMLElement;
const ctaRow = document.getElementById("cta-row") as HTMLElement;
const findBtn = document.getElementById("find-btn") as HTMLButtonElement;
const findLoader = document.getElementById("find-loader") as HTMLElement;
const findBtnText = findBtn.querySelector(".find-btn-text") as HTMLElement;
const resultsSection = document.getElementById("results-section") as HTMLElement;
const tasteProfileText = document.getElementById("taste-profile-text") as HTMLElement;
const recsList = document.getElementById("recs-list") as HTMLElement;
const copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;
const copyLabel = copyBtn.querySelector(".copy-label") as HTMLElement;
const itemTemplate = document.getElementById("item-template") as HTMLTemplateElement;
const recTemplate = document.getElementById("rec-template") as HTMLTemplateElement;
const importBtn = document.getElementById("import-btn") as HTMLButtonElement;
const csvFileInput = document.getElementById("csv-file-input") as HTMLInputElement;
const inputLabel = document.querySelector(".input-label") as HTMLLabelElement;
const watchOptions = document.getElementById("watch-options") as HTMLElement;
const deepCutsCheckbox = document.getElementById("deep-cuts-checkbox") as HTMLInputElement;
const gamesOptions = document.getElementById("games-options") as HTMLElement;
const gamesDeepCutsCheckbox = document.getElementById("games-deep-cuts-checkbox") as HTMLInputElement;
const emailCta = document.getElementById("email-cta") as HTMLElement;
const indieBookstoreCta = document.getElementById("indie-bookstore-cta") as HTMLElement;
const indieBookstoreBtn = document.getElementById("indie-bookstore-btn") as HTMLButtonElement;
const indieStoreOverlay = document.getElementById("indie-store-overlay") as HTMLElement;
const indieStoreContent = document.getElementById("indie-store-content") as HTMLElement;
const indieStoreClose        = document.getElementById("indie-store-close")        as HTMLButtonElement;
const indieStoreFallbackLink = document.querySelector(".indie-store-fallback-link") as HTMLAnchorElement;
const exampleSection = document.getElementById("example-section") as HTMLElement;
const emailInput = document.getElementById("email-input") as HTMLInputElement;
const emailSendBtn = document.getElementById("email-send-btn") as HTMLButtonElement;
const emailStatus = document.getElementById("email-cta-status") as HTMLElement;
const importBtns = document.getElementById("import-btns") as HTMLElement;
const findStatus = document.getElementById("find-status") as HTMLElement;

// Shelf scanner elements
const scanBtn = document.getElementById("scan-btn") as HTMLButtonElement;
const shelfImageInput = document.getElementById("shelf-image-input") as HTMLInputElement;
const shelfTipOverlay = document.getElementById("shelf-tip-overlay") as HTMLElement;
const shelfTipCancel = document.getElementById("shelf-tip-cancel") as HTMLButtonElement;
const shelfTipConfirm = document.getElementById("shelf-tip-confirm") as HTMLButtonElement;
const shelfReviewOverlay = document.getElementById("shelf-review-overlay") as HTMLElement;
const shelfReviewClose = document.getElementById("shelf-review-close") as HTMLButtonElement;
const shelfReviewSummary = document.getElementById("shelf-review-summary") as HTMLElement;
const shelfReviewList = document.getElementById("shelf-review-list") as HTMLUListElement;
const shelfReviewConfirm = document.getElementById("shelf-review-confirm") as HTMLButtonElement;
const inputSection = document.querySelector(".input-section") as HTMLElement;

// Clear / start-over elements
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;
const startOverBtn = document.getElementById("start-over-btn") as HTMLButtonElement;

// Archetype display elements
const archetypeDisplay = document.getElementById("archetype-display") as HTMLElement;
const archetypeNameEl = document.getElementById("archetype-name") as HTMLElement;
const archetypeSecondaryEl = document.getElementById("archetype-secondary") as HTMLElement;

// Share card element
const shareCardBtn = document.getElementById("share-card-btn") as HTMLButtonElement;

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

function renderItem(item: Item): void {
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
  itemsList.appendChild(clone);
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
    link.href = rec.amazon_search ||
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
    (li.querySelector(".rec-where-to-watch") as HTMLElement).textContent = rec.where_to_watch || "";
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

function renderRecCard(rec: Recommendation): HTMLElement {
  const clone = recTemplate.content.cloneNode(true) as DocumentFragment;
  const li = clone.querySelector(".rec-card") as HTMLElement;
  fillRecCard(li, rec);
  bindCardButtons(li, rec);
  recsList.appendChild(clone);
  return li;
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
    const res = await fetch("/api/recommendations/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(replaceBody),
    });

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

  try {
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recBody),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = (await res.json()) as ApiResponse;
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
      `Top match: ${top.title} by ${top.author} (${score} match) — ${top.vibe}\n\n` +
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

const indieDir = getIndieDirectory();
indieStoreFallbackLink.href = indieDir.url;
indieStoreFallbackLink.textContent = indieDir.label;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function showIndieStoreError(): void {
  indieStoreContent.innerHTML = "";
  const p = document.createElement("p");
  p.className = "indie-store-empty";
  p.textContent = `Couldn’t find your location or load stores. Try the ${indieDir.name} link below.`;
  indieStoreContent.appendChild(p);
}

function renderIndieStores(elements: OsmElement[], userLat: number, userLng: number): void {
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
}

function openIndieFinder(): void {
  indieStoreOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";
  indieStoreContent.innerHTML = "";
  const p = document.createElement("p");
  p.className = "indie-store-loading";
  p.textContent = "Finding bookstores near you…";
  indieStoreContent.appendChild(p);

  if (!navigator.geolocation) { showIndieStoreError(); return; }

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const q = `[out:json][timeout:10];(node["shop"="books"](around:8000,${coords.latitude},${coords.longitude});way["shop"="books"](around:8000,${coords.latitude},${coords.longitude}););out center;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: q });
        if (!res.ok) throw new Error();
        const data = await res.json() as { elements: OsmElement[] };
        renderIndieStores(data.elements, coords.latitude, coords.longitude);
      } catch {
        showIndieStoreError();
      }
    },
    () => showIndieStoreError(),
    { timeout: 8000 }
  );
}

async function copyProfile(): Promise<void> {
  const text = buildShareText();
  if (!text) return;
  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch { /* user dismissed — no-op */ }
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

// ── Goodreads CSV import ──────────────────────────────────────────────────────

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
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
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

  let imported = 0;
  for (const entry of toAdd) {
    const item: Item = { id: generateId(), name: entry.title, rating: entry.rating };
    items.push(item);
    renderItem(item);
    if (entry.rating) {
      const el = document.querySelector(`[data-item-id="${item.id}"]`);
      el?.querySelectorAll(".rating-btn").forEach((btn) => {
        const b = btn as HTMLElement;
        b.classList.toggle("active", b.dataset.rating === entry.rating);
      });
    }
    imported++;
  }

  updateCta();
  if (imported === 0) {
    showError("No 'read' books found in this CSV. Make sure it's a Goodreads library export.");
  }
}

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

// ── Bookshelf scanner ─────────────────────────────────────────────────────────

function showScanError(msg: string): void {
  showError(msg, inputSection, "scan-error-banner");
}

async function resizeImageForScan(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 960;
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
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  });
}

async function handleShelfScan(file: File): Promise<void> {
  scanBtn.disabled = true;
  const origContent = scanBtn.innerHTML;
  scanBtn.innerHTML = `<span class="import-btn-spinner" aria-hidden="true"></span>Scanning…`;

  try {
    const imageData = await resizeImageForScan(file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100_000);
    let res: Response;
    try {
      res = await fetch("/api/scan-shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        throw new Error("Scan timed out. Please try again.");
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    // Server responds with SSE (text/event-stream) to bypass proxy buffering.
    // Read the stream chunk-by-chunk and extract the first `data:` line.
    const data = await (async () => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          for (const line of buf.split("\n")) {
            if (line.startsWith("data: ")) {
              return JSON.parse(line.slice(6)) as {
                books?: Array<{ title: string; author: string; confidence: "high" | "medium" }>;
                unreadable_count?: number;
                error?: string;
              };
            }
          }
        }
      } finally {
        reader.cancel();
      }
      return {} as { books?: Array<{ title: string; author: string; confidence: "high" | "medium" }>; unreadable_count?: number; error?: string };
    })();

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.books || data.books.length === 0) {
      showScanError("No book titles were readable in this photo. Try better lighting or a closer shot.");
      return;
    }

    showShelfReview(data.books!, data.unreadable_count ?? 0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    showScanError(msg);
  } finally {
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

// Scan button → tip modal → file picker
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

// ── Shareable recommendation card (Canvas) ────────────────────────────────────

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

  // Outer wrapper — 390×700px flex column; no overflow clipping so flex distributes space
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:absolute;left:-9999px;top:0;width:390px;height:700px;overflow:hidden;background:${bg};padding:36px 36px 44px;box-sizing:border-box;display:flex;flex-direction:column;`;

  // ── Branded header (wordmark + tagline + separator) ───────────────────
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

  // ── Archetype / profile header ────────────────────────────────────────
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

  // ── Top match card ────────────────────────────────────────────────────
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
    authorEl.style.cssText = `margin:0 0 14px;font-size:14px;color:${textMuted};`;
    authorEl.textContent = top.author;
    matchCard.appendChild(authorEl);

    if (top.vibe) {
      const vibeEl = document.createElement("span");
      vibeEl.className = "rec-vibe";
      vibeEl.style.cssText = "font-size:12px;padding:4px 12px;";
      vibeEl.textContent = top.vibe;
      matchCard.appendChild(vibeEl);
    }

    wrap.appendChild(matchCard);
  }

  // ── Also recommended (2nd + 3rd) ──────────────────────────────────────
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

  // ── Footer URL ────────────────────────────────────────────────────────
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

shareCardBtn.addEventListener("click", () => void generateShareCard());

// ── Event listeners ───────────────────────────────────────────────────────────

document.querySelectorAll<HTMLButtonElement>(".category-btn[data-category]").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchCategory(btn.dataset.category as Category);
  });
});

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

itemInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addItem(itemInput.value);
});
addBtn.addEventListener("click", () => addItem(itemInput.value));
findBtn.addEventListener("click", fetchRecommendations);
clearBtn.addEventListener("click", clearAll);
startOverBtn.addEventListener("click", clearAll);
copyBtn.addEventListener("click", copyProfile);
indieBookstoreBtn.addEventListener("click", openIndieFinder);
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
