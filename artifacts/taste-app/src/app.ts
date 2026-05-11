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
}

interface ApiResponse {
  taste_profile: string;
  recommendations: Recommendation[];
}

const items: Item[] = [];
let currentRecs: Recommendation[] = [];
let currentTasteProfile = "";
const seenTitles = new Set<string>();

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

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
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
}

function fillRecCard(li: HTMLElement, rec: Recommendation): void {
  (li.querySelector(".rec-title") as HTMLElement).textContent = rec.title;
  (li.querySelector(".rec-author") as HTMLElement).textContent =
    rec.author || "";
  (li.querySelector(".rec-score") as HTMLElement).textContent =
    typeof rec.match_score === "number"
      ? `${Math.round(rec.match_score)}%`
      : String(rec.match_score);
  (li.querySelector(".rec-why") as HTMLElement).textContent = rec.why;
  (li.querySelector(".rec-vibe") as HTMLElement).textContent = rec.vibe || "";
  const link = li.querySelector(".rec-link") as HTMLAnchorElement;
  link.href =
    rec.amazon_search ||
    `https://www.amazon.com/s?k=${encodeURIComponent(rec.title + " " + (rec.author || ""))}`;
}

function renderRecCard(rec: Recommendation): HTMLElement {
  const clone = recTemplate.content.cloneNode(true) as DocumentFragment;
  const li = clone.querySelector(".rec-card") as HTMLElement;
  fillRecCard(li, rec);

  const readBtn = li.querySelector(".read-this-btn") as HTMLButtonElement;
  readBtn.addEventListener("click", () => replaceRec(li, rec.title));

  recsList.appendChild(clone);
  return li;
}

function renderResults(data: ApiResponse): void {
  currentTasteProfile = data.taste_profile;
  currentRecs = [...(data.recommendations || [])];
  seenTitles.clear();
  currentRecs.forEach((r) => seenTitles.add(r.title.toLowerCase()));

  tasteProfileText.textContent = currentTasteProfile;
  recsList.innerHTML = "";
  currentRecs.forEach((rec) => renderRecCard(rec));

  resultsSection.style.display = "flex";
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function replaceRec(cardEl: HTMLElement, oldTitle: string): Promise<void> {
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

  try {
    const res = await fetch("/api/recommendations/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: payload,
        exclude: excludeTitles,
        currentlyShown,
        category: "books",
      }),
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
    readBtn.disabled = false;
    readBtn.textContent = "I've read this";
    readBtn.addEventListener("click", () =>
      replaceRec(cardEl, recommendation.title),
    );
    cardEl.classList.remove("replacing", "fade-out");
    cardEl.classList.add("fade-in");
    setTimeout(() => cardEl.classList.remove("fade-in"), 400);
  } catch (err: unknown) {
    readBtn.disabled = false;
    readBtn.textContent = "Try again";
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

function showError(msg: string): void {
  const existing = document.querySelector(".error-banner");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "error-banner";
  el.textContent = msg;
  ctaRow.after(el);
  setTimeout(() => el.remove(), 8000);
}

async function fetchRecommendations(): Promise<void> {
  if (items.length < 3) {
    showError("Add at least 3 books to get a good recommendation.");
    return;
  }

  const payload = items.map((i) => ({ name: i.name, rating: i.rating || "unrated" }));

  findBtn.disabled = true;
  findBtnText.textContent = "Thinking…";
  findLoader.classList.add("visible");
  resultsSection.style.display = "none";

  document.querySelector(".error-banner")?.remove();

  try {
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload, category: "books" }),
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
  }
}

function buildShareText(): string {
  if (!currentTasteProfile || currentRecs.length === 0) return "";
  const top = currentRecs[0];
  const score =
    typeof top.match_score === "number"
      ? `${Math.round(top.match_score)}%`
      : String(top.match_score);
  return (
    `My reader profile: ${currentTasteProfile}\n\n` +
    `Top match: ${top.title} by ${top.author} (${score} match) — ${top.vibe}\n\n` +
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
  const authorIdx = headers.findIndex((h) => h === "author");
  const ratingIdx = headers.findIndex((h) => h === "my rating");
  const shelfIdx = headers.findIndex((h) => h === "exclusive shelf");

  if (titleIdx === -1) {
    showError("Couldn't find a Title column in this CSV. Is it a Goodreads export?");
    return;
  }

  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const shelf = shelfIdx !== -1 ? cols[shelfIdx]?.trim() : "";
    if (shelf && shelf !== "read") continue;

    const title = cols[titleIdx]?.trim();
    if (!title) continue;

    const ratingRaw = ratingIdx !== -1 ? parseInt(cols[ratingIdx] ?? "0", 10) : 0;
    const rating =
      ratingRaw === 5 ? "loved"
      : ratingRaw === 4 ? "liked"
      : ratingRaw === 3 ? "meh"
      : ratingRaw >= 1 ? "abandoned"
      : null;

    const author = authorIdx !== -1 ? cols[authorIdx]?.trim() : undefined;

    if (items.some((it) => it.name.toLowerCase() === title.toLowerCase())) continue;

    const item: Item = { id: generateId(), name: title, rating };
    items.push(item);
    renderItem(item);
    if (rating) {
      const el = document.querySelector(`[data-item-id="${item.id}"]`);
      el?.querySelectorAll(".rating-btn").forEach((btn) => {
        const b = btn as HTMLElement;
        b.classList.toggle("active", b.dataset.rating === rating);
      });
    }
    void author;
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

itemInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addItem(itemInput.value);
});
addBtn.addEventListener("click", () => addItem(itemInput.value));
findBtn.addEventListener("click", fetchRecommendations);
copyBtn.addEventListener("click", copyProfile);
