(() => {
  const items = [];

  const itemInput = document.getElementById('item-input');
  const addBtn = document.getElementById('add-btn');
  const itemsList = document.getElementById('items-list');
  const itemsSection = document.getElementById('items-section');
  const ctaRow = document.getElementById('cta-row');
  const findBtn = document.getElementById('find-btn');
  const findLoader = document.getElementById('find-loader');
  const resultsSection = document.getElementById('results-section');
  const tasteProfileText = document.getElementById('taste-profile-text');
  const recsList = document.getElementById('recs-list');
  const copyBtn = document.getElementById('copy-btn');
  const itemTemplate = document.getElementById('item-template');
  const recTemplate = document.getElementById('rec-template');

  function generateId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function addItem(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (items.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      itemInput.value = '';
      return;
    }
    const item = { id: generateId(), name: trimmed, rating: null };
    items.push(item);
    renderItem(item);
    itemInput.value = '';
    updateCta();
  }

  function removeItem(id) {
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) items.splice(idx, 1);
    const el = document.querySelector(`[data-item-id="${id}"]`);
    if (el) el.remove();
    updateCta();
  }

  function setRating(id, rating) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.rating = item.rating === rating ? null : rating;
    const el = document.querySelector(`[data-item-id="${id}"]`);
    if (!el) return;
    el.querySelectorAll('.rating-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.rating === item.rating);
    });
  }

  function renderItem(item) {
    const clone = itemTemplate.content.cloneNode(true);
    const li = clone.querySelector('.item-row');
    li.dataset.itemId = item.id;
    li.querySelector('.item-name').textContent = item.name;
    li.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => setRating(item.id, btn.dataset.rating));
    });
    li.querySelector('.remove-btn').addEventListener('click', () => removeItem(item.id));
    itemsList.appendChild(clone);
    itemsSection.style.display = 'block';
  }

  function updateCta() {
    ctaRow.style.display = items.length >= 1 ? 'flex' : 'none';
    if (items.length === 0) itemsSection.style.display = 'none';
  }

  function renderResults(data) {
    tasteProfileText.textContent = data.taste_profile;

    recsList.innerHTML = '';
    (data.recommendations || []).forEach(rec => {
      const clone = recTemplate.content.cloneNode(true);
      clone.querySelector('.rec-title').textContent = rec.title;
      clone.querySelector('.rec-author').textContent = rec.author || '';
      clone.querySelector('.rec-score').textContent =
        typeof rec.match_score === 'number'
          ? `${Math.round(rec.match_score)}%`
          : rec.match_score;
      clone.querySelector('.rec-why').textContent = rec.why;
      clone.querySelector('.rec-vibe').textContent = rec.vibe || '';
      const link = clone.querySelector('.rec-link');
      link.href = rec.amazon_search || `https://www.amazon.com/s?k=${encodeURIComponent(rec.title + ' ' + (rec.author || ''))}`;
      recsList.appendChild(clone);
    });

    resultsSection.style.display = 'flex';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showError(msg) {
    const existing = document.querySelector('.error-banner');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'error-banner';
    el.textContent = msg;
    ctaRow.after(el);
    setTimeout(() => el.remove(), 8000);
  }

  async function fetchRecommendations() {
    const payload = items.map(i => ({ name: i.name, rating: i.rating || 'unrated' }));

    findBtn.disabled = true;
    findBtn.querySelector('.find-btn-text').textContent = 'Thinking…';
    findLoader.classList.add('visible');
    resultsSection.style.display = 'none';

    const existing = document.querySelector('.error-banner');
    if (existing) existing.remove();

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload, category: 'books' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      renderResults(data);
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      findBtn.disabled = false;
      findBtn.querySelector('.find-btn-text').textContent = 'Find my recommendations';
      findLoader.classList.remove('visible');
    }
  }

  async function copyProfile() {
    const text = tasteProfileText.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add('copied');
      copyBtn.querySelector('svg').style.display = 'none';
      copyBtn.childNodes[copyBtn.childNodes.length - 1].textContent = ' Copied!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.querySelector('svg').style.display = '';
        copyBtn.childNodes[copyBtn.childNodes.length - 1].textContent = ' Copy';
      }, 2000);
    } catch {
      copyBtn.childNodes[copyBtn.childNodes.length - 1].textContent = ' Failed';
      setTimeout(() => {
        copyBtn.childNodes[copyBtn.childNodes.length - 1].textContent = ' Copy';
      }, 1500);
    }
  }

  itemInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem(itemInput.value);
  });
  addBtn.addEventListener('click', () => addItem(itemInput.value));
  findBtn.addEventListener('click', fetchRecommendations);
  copyBtn.addEventListener('click', copyProfile);
})();
