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
  const el = document.querySelector(`[data-item-id="${id}"]`);
  if (el) el.remove();
  updateCta();
}

function setRating(id: string, rating: string): void {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.rating = item.rating === rating ? null : rating;
  const el = document.querySelector(`[data-item-id="${id}"]`);
  if (!el) return;
  el.querySelectorAll(".rating-btn").forEach((btn) => {
    const btnEl = btn as HTMLElement;
    btnEl.classList.toggle("active", btnEl.dataset.rating === item.rating);
  });
}

function renderItem(item: Item): void {
  const clone = itemTemplate.content.cloneNode(true) as DocumentFragment;
  const li = clone.querySelector(".item-row") as HTMLElement;
  li.dataset.itemId = item.id;
  (li.querySelector(".item-name") as HTMLElement).textContent = item.name;
  li.querySelectorAll(".rating-btn").forEach((btn) => {
    btn.addEventListener("click", () => setRating(item.id, (btn as HTMLElement).dataset.rating!));
  });
  li.querySelector(".remove-btn")!.addEventListener("click", () => removeItem(item.id));
  itemsList.appendChild(clone);
  itemsSection.style.display = "block";
}

function updateCta(): void {
  ctaRow.style.display = items.length >= 1 ? "flex" : "none";
  if (items.length === 0) itemsSection.style.display = "none";
}

function renderResults(data: ApiResponse): void {
  tasteProfileText.textContent = data.taste_profile;
  recsList.innerHTML = "";

  (data.recommendations || []).forEach((rec) => {
    const clone = recTemplate.content.cloneNode(true) as DocumentFragment;
    (clone.querySelector(".rec-title") as HTMLElement).textContent = rec.title;
    (clone.querySelector(".rec-author") as HTMLElement).textContent = rec.author || "";
    (clone.querySelector(".rec-score") as HTMLElement).textContent =
      typeof rec.match_score === "number" ? `${Math.round(rec.match_score)}%` : String(rec.match_score);
    (clone.querySelector(".rec-why") as HTMLElement).textContent = rec.why;
    (clone.querySelector(".rec-vibe") as HTMLElement).textContent = rec.vibe || "";
    const link = clone.querySelector(".rec-link") as HTMLAnchorElement;
    link.href =
      rec.amazon_search ||
      `https://www.amazon.com/s?k=${encodeURIComponent(rec.title + " " + (rec.author || ""))}`;
    recsList.appendChild(clone);
  });

  resultsSection.style.display = "flex";
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const payload = items.map((i) => ({ name: i.name, rating: i.rating || "unrated" }));

  findBtn.disabled = true;
  findBtnText.textContent = "Thinking…";
  findLoader.classList.add("visible");
  resultsSection.style.display = "none";

  const existing = document.querySelector(".error-banner");
  if (existing) existing.remove();

  try {
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload, category: "books" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = (await res.json()) as ApiResponse;
    renderResults(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    showError(msg);
  } finally {
    findBtn.disabled = false;
    findBtnText.textContent = "Find my recommendations";
    findLoader.classList.remove("visible");
  }
}

async function copyProfile(): Promise<void> {
  const text = tasteProfileText.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.classList.add("copied");
    copyLabel.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyLabel.textContent = "Copy";
    }, 2000);
  } catch {
    copyLabel.textContent = "Failed";
    setTimeout(() => {
      copyLabel.textContent = "Copy";
    }, 1500);
  }
}

itemInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addItem(itemInput.value);
});
addBtn.addEventListener("click", () => addItem(itemInput.value));
findBtn.addEventListener("click", fetchRecommendations);
copyBtn.addEventListener("click", copyProfile);
