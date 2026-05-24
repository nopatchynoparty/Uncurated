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
}

interface ApiResponse {
  taste_profile: string;
  short_taste_profile?: string;
  recommendations: Recommendation[];
}

interface ScannedBook {
  id: string;
  title: string;
  author: string;
  confidence: "high" | "medium";
}

type Category = "books" | "podcasts" | "watch";

let activeCategory: Category = "books";
let watchFormat: "series" | "films" | "both" = "both";
let watchMood: "light" | "dark" | "any" = "any";
const items: Item[] = [];
let currentRecs: Recommendation[] = [];
let currentTasteProfile = "";
let currentShortTasteProfile = "";
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
    label: "What podcasts have you loved?",
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
const emailCta = document.getElementById("email-cta") as HTMLElement;
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

// Share card element
const shareCardBtn = document.getElementById("share-card-btn") as HTMLButtonElement;

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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
  seenTitles.clear();
  document.querySelector(".error-banner")?.remove();

  const config = CATEGORY_CONFIG[cat];
  inputLabel.textContent = config.label;
  itemInput.placeholder = config.placeholder;

  importBtns.style.display = cat === "books" ? "flex" : "none";
  watchOptions.style.display = cat === "watch" ? "flex" : "none";
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
  currentRecs = [...(data.recommendations || [])].sort((a, b) => b.match_score - a.match_score);
  seenTitles.clear();
  currentRecs.forEach((r) => seenTitles.add(r.title.toLowerCase()));

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

  const recBody: Record<string, unknown> = { items: payload, category: activeCategory };
  if (activeCategory === "watch") {
    recBody.format = watchFormat;
    recBody.mood = watchMood;
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
  return (
    `${config.sharePrefix} ${currentTasteProfile}\n\n` +
    `Top match: ${top.title} ${config.shareByWord} ${top.author} (${score} match) — ${top.vibe}\n\n` +
    `via Uncurated`
  );
}

async function copyProfile(): Promise<void> {
  const text = buildShareText();
  if (!text) return;
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
      : ratingRaw >= 1 ? "hated"
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
      const MAX = 1280;
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
      resolve(canvas.toDataURL("image/jpeg", 0.82));
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

    const res = await fetch("/api/scan-shelf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = (await res.json()) as {
      books: Array<{ title: string; author: string; confidence: "high" | "medium" }>;
      unreadable_count: number;
    };

    if (data.books.length === 0) {
      showScanError("No book titles were readable in this photo. Try better lighting or a closer shot.");
      return;
    }

    showShelfReview(data.books, data.unreadable_count);
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

function buildShareCardEl(profileText: string, recs: Recommendation[]): HTMLElement {
  const bg = getCssVar("--bg");
  const textMuted = getCssVar("--text-muted");
  const border = getCssVar("--border");

  // Outer wrapper — exactly 390×844px (Instagram Stories); overflow:hidden hard-clips any overflow
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:absolute;left:-9999px;top:0;width:390px;height:844px;overflow:hidden;background:${bg};padding:64px 28px 32px;box-sizing:border-box;`;

  // ── Branding header ───────────────────────────────────────────────────
  const header = document.createElement("div");
  header.style.cssText = "text-align:center;margin-bottom:24px;";

  const logoDiv = document.createElement("div");
  logoDiv.style.cssText = "font-family:'DM Serif Display',Georgia,serif;font-size:26px;line-height:1;margin-bottom:8px;";
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
  curatedSpan.style.color = "#f5f5f5";
  logoDiv.appendChild(unSpan);
  logoDiv.appendChild(curatedSpan);
  header.appendChild(logoDiv);

  const tagline = document.createElement("p");
  tagline.textContent = "No algorithms. No sponsors. Just honest recommendations.";
  tagline.style.cssText = `margin:0 0 14px;font-size:11px;color:${textMuted};line-height:1.4;`;
  header.appendChild(tagline);

  const sep = document.createElement("div");
  sep.style.cssText = "width:72px;height:1px;background:#f5a623;margin:0 auto;";
  header.appendChild(sep);
  wrap.appendChild(header);

  // ── Profile card ──────────────────────────────────────────────────────
  const profileCard = document.createElement("div");
  profileCard.className = "taste-profile-card";
  profileCard.style.cssText = "margin-bottom:20px;padding:18px 20px;";

  const profileCardHeader = document.createElement("div");
  profileCardHeader.className = "taste-profile-header";
  profileCardHeader.style.marginBottom = "10px";
  const profileTitle = document.createElement("h2");
  profileTitle.className = "taste-profile-title";
  profileTitle.style.cssText = "margin:0;font-size:13px;";
  profileTitle.textContent = "Your Uncurated Profile";
  profileCardHeader.appendChild(profileTitle);
  profileCard.appendChild(profileCardHeader);

  const profileTextEl = document.createElement("p");
  profileTextEl.className = "taste-profile-text";
  profileTextEl.style.cssText = "margin:0;font-size:14px;line-height:1.6;";
  profileTextEl.textContent = profileText;
  profileCard.appendChild(profileTextEl);
  wrap.appendChild(profileCard);

  // ── Recs heading ──────────────────────────────────────────────────────
  const recsTitle = document.createElement("h2");
  recsTitle.className = "recs-title";
  recsTitle.style.cssText = "margin:0 0 12px;font-size:11px;";
  recsTitle.textContent = "Recommended for you";
  wrap.appendChild(recsTitle);

  // ── Rec cards ─────────────────────────────────────────────────────────
  const recsList = document.createElement("ol");
  recsList.className = "recs-list";
  recsList.style.cssText = "margin-bottom:20px;gap:12px;";

  recs.forEach((rec) => {
    const li = document.createElement("li");
    li.className = "rec-card";
    li.style.cssText = "padding:16px 18px;gap:8px;";

    const recHeader = document.createElement("div");
    recHeader.className = "rec-header";
    recHeader.style.gap = "8px";

    const meta = document.createElement("div");
    meta.className = "rec-meta";

    const titleEl = document.createElement("span");
    titleEl.className = "rec-title";
    titleEl.style.fontSize = "22px";
    titleEl.textContent = rec.title;
    meta.appendChild(titleEl);

    const authorEl = document.createElement("span");
    authorEl.className = "rec-author";
    authorEl.style.fontSize = "13px";
    authorEl.textContent = rec.author;
    meta.appendChild(authorEl);

    recHeader.appendChild(meta);

    const scoreWrap = document.createElement("div");
    scoreWrap.className = "rec-score-wrap";

    const scoreEl = document.createElement("span");
    scoreEl.className = "rec-score";
    scoreEl.style.fontSize = "20px";
    scoreEl.textContent = typeof rec.match_score === "number" ? `${Math.round(rec.match_score)}%` : String(rec.match_score);
    scoreWrap.appendChild(scoreEl);

    const scoreLbl = document.createElement("span");
    scoreLbl.className = "rec-score-label";
    scoreLbl.style.fontSize = "10px";
    scoreLbl.textContent = "match";
    scoreWrap.appendChild(scoreLbl);

    recHeader.appendChild(scoreWrap);
    li.appendChild(recHeader);

    const footer = document.createElement("div");
    footer.className = "rec-footer";

    const vibeEl = document.createElement("span");
    vibeEl.className = "rec-vibe";
    vibeEl.style.cssText = "max-width:100%;font-size:12px;padding:3px 10px;";
    vibeEl.textContent = rec.vibe || "";
    footer.appendChild(vibeEl);

    li.appendChild(footer);
    recsList.appendChild(li);
  });

  wrap.appendChild(recsList);

  // ── Footer URL ────────────────────────────────────────────────────────
  const divider = document.createElement("div");
  divider.style.cssText = `height:1px;background:${border};margin-bottom:14px;`;
  wrap.appendChild(divider);

  const footerUrl = document.createElement("p");
  footerUrl.textContent = "uncurated.app";
  footerUrl.style.cssText = "margin:0;text-align:center;font-size:12px;font-weight:600;color:#f5a623;";
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
    ]).catch(() => {});

    const profileText = currentShortTasteProfile || truncateAtWordBoundary(currentTasteProfile.trim(), 120);
    const topRecs = currentRecs.slice(0, 3);

    const cardEl = buildShareCardEl(profileText, topRecs);
    document.body.appendChild(cardEl);

    try {
      const canvas = await html2canvas(cardEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: getCssVar("--bg"),
        logging: false,
        width: 390,
        height: 844,
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
    btn.closest(".toggle-btns")!.querySelectorAll<HTMLButtonElement>(".toggle-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
    });
    if (group === "format") watchFormat = value as "series" | "films" | "both";
    if (group === "mood") watchMood = value as "light" | "dark" | "any";
  });
});

async function sendEmail(): Promise<void> {
  const email = emailInput.value.trim();
  if (!email) {
    emailInput.focus();
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
        colorScheme: window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || `Server error ${res.status}`);
    }

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
copyBtn.addEventListener("click", copyProfile);
emailSendBtn.addEventListener("click", sendEmail);
emailInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendEmail();
});
