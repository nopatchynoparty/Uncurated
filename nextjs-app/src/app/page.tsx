'use client';

import { useEffect } from 'react';
import { initApp } from '../lib/app-init';

export default function Home() {
  useEffect(() => {
    initApp();
  }, []);

  return (
    <>
      <div className="app">
        <header className="header">
          <div className="logo">
            <span className="logo-text">
              <span className="logo-un">Un</span>curated
            </span>
          </div>
          <a
            href="https://tally.so/r/2E1DP9"
            className="header-feedback-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Give feedback
          </a>
        </header>

        <section className="hero">
          <h1 className="hero-headline">Find books you&apos;ll actually love.</h1>
          <p className="hero-sub">
            Tired of algorithms surfacing what&apos;s popular rather than what suits you? Tell us
            what you&apos;ve read — we&apos;ll do the rest.
          </p>
          <div className="hero-proof">
            <span className="hero-proof-item">5 recommendations per session</span>
            <span className="hero-proof-item">Zero sponsored picks</span>
            <span className="hero-proof-item">Free for any reader</span>
          </div>
          <p className="hero-extras">
            Plus your reader archetype, a shareable card, and your results to your inbox.
          </p>
        </section>

        <main className="main">
          <section
            className="example-section"
            id="example-section"
            aria-label="Example output preview"
          >
            <div className="example-label-row">
              <span className="example-label-tag">Example — not your results</span>
              <span className="example-input-summary">
                Harry Potter (loved) · The Da Vinci Code (loved) · Gone Girl (liked) · Twilight
                (meh)
              </span>
            </div>
            <p className="example-intro">
              Here&apos;s what your personalised profile and recommendations look like. Add your
              books below to get yours.
            </p>

            <div className="taste-profile-card">
              <div className="taste-profile-header">
                <h2 className="taste-profile-title">YOUR UNCURATED PROFILE</h2>
              </div>
              <p className="taste-profile-text">
                This reader gravitates toward fast-paced, plot-driven narratives with strong hooks
                and accessible writing. They love stories that blend mystery, intrigue, and
                page-turning momentum, but aren&apos;t drawn to romance-heavy paranormal fiction,
                suggesting they prefer sharper, more grounded thriller elements over atmospheric
                fantasy.
              </p>
            </div>

            <h2 className="recs-title">Recommended for you</h2>
            <ol className="recs-list example-recs-list">
              <li className="rec-card">
                <div className="rec-header">
                  <div className="rec-meta">
                    <span className="rec-title">The Girl on the Train</span>
                    <span className="rec-author">Paula Hawkins</span>
                  </div>
                  <div className="rec-score-wrap">
                    <span className="rec-score">94%</span>
                    <span className="rec-score-label">match</span>
                  </div>
                </div>
                <p className="rec-why">
                  A taut psychological thriller built on unreliable narrators and escalating dread —
                  if Gone Girl&apos;s twisty tension and The Da Vinci Code&apos;s compulsive pacing
                  are your speed, this delivers both in one sitting.
                </p>
                <div className="rec-footer">
                  <span className="rec-vibe">Psychological thriller</span>
                </div>
              </li>
            </ol>
          </section>

          <section className="categories" style={{ display: 'none' }}>
            <button className="category-btn active" data-category="books">
              Read
            </button>
            <button className="category-btn" data-category="watch">
              Watch
            </button>
            <button className="category-btn" data-category="podcasts">
              Listen
            </button>
            <button className="category-btn" data-category="games">
              Play
            </button>
          </section>

          <section className="input-section">
            <div className="input-label-row">
              <label className="input-label" htmlFor="item-input">
                What books have you read?
              </label>
              <div className="import-btns" id="import-btns">
                <button className="import-btn" id="scan-btn" type="button">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Scan my bookshelf
                </button>
                <button className="import-btn" id="import-btn" type="button">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Import Goodreads CSV
                </button>
                <input type="file" id="csv-file-input" accept=".csv" style={{ display: 'none' }} />
                <input
                  type="file"
                  id="shelf-image-input"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            <div className="input-row">
              <input
                type="text"
                id="item-input"
                className="item-input"
                placeholder="e.g. The Road, Sapiens, Dune…"
                autoComplete="off"
                spellCheck={false}
              />
              <button className="add-btn" id="add-btn" aria-label="Add item">
                +
              </button>
            </div>
            <p className="input-hint">
              Press Enter or click + to add. Add at least 3 items for better results. Free for any
              reader, anywhere.
            </p>
          </section>

          <section className="watch-options" id="watch-options" style={{ display: 'none' }}>
            <div className="toggle-group">
              <span className="toggle-label">Format</span>
              <div className="toggle-btns">
                <button className="toggle-btn" data-toggle="format" data-value="series">
                  Series
                </button>
                <button className="toggle-btn" data-toggle="format" data-value="films">
                  Films
                </button>
                <button className="toggle-btn active" data-toggle="format" data-value="both">
                  Both
                </button>
              </div>
            </div>
            <div className="toggle-group">
              <span className="toggle-label">Mood</span>
              <div className="toggle-btns">
                <button className="toggle-btn" data-toggle="mood" data-value="light">
                  Light
                </button>
                <button className="toggle-btn" data-toggle="mood" data-value="dark">
                  Dark
                </button>
                <button className="toggle-btn active" data-toggle="mood" data-value="any">
                  Doesn&apos;t matter
                </button>
              </div>
            </div>
            <label className="deep-cuts-label">
              <input type="checkbox" id="deep-cuts-checkbox" />
              I watch a lot — go deeper
            </label>
          </section>

          <section className="games-options" id="games-options" style={{ display: 'none' }}>
            <div className="toggle-group">
              <span className="toggle-label">Platform</span>
              <div className="toggle-btns">
                <button className="toggle-btn active" data-toggle="platform" data-value="all">
                  All
                </button>
                <button className="toggle-btn" data-toggle="platform" data-value="pc">
                  PC
                </button>
                <button className="toggle-btn" data-toggle="platform" data-value="playstation">
                  PlayStation
                </button>
                <button className="toggle-btn" data-toggle="platform" data-value="xbox">
                  Xbox
                </button>
                <button className="toggle-btn" data-toggle="platform" data-value="switch">
                  Switch
                </button>
                <button className="toggle-btn" data-toggle="platform" data-value="mobile">
                  Mobile
                </button>
              </div>
            </div>
            <label className="deep-cuts-label">
              <input type="checkbox" id="games-deep-cuts-checkbox" />
              I play a lot — go deeper
            </label>
          </section>

          <section className="items-section" id="items-section" style={{ display: 'none' }}>
            <ul className="items-list" id="items-list" />
          </section>

          <div className="cta-row" id="cta-row" style={{ display: 'none' }}>
            <div className="cta-inner">
              <button className="find-btn" id="find-btn">
                <span className="find-btn-text">Find my recommendations</span>
                <span className="find-btn-loader" id="find-loader" aria-hidden="true" />
              </button>
              <p className="find-expectation">
                Add your books → get a personalised taste profile + 5 recommendations in seconds.
              </p>
              <p className="find-status" id="find-status" />
              <button className="clear-btn" id="clear-btn" type="button">
                Clear list
              </button>
            </div>
          </div>

          <section className="results-section" id="results-section" style={{ display: 'none' }}>
            <div
              className="archetype-display"
              id="archetype-display"
              style={{ display: 'none' }}
            >
              <h2 className="archetype-name" id="archetype-name" />
              <p className="archetype-secondary" id="archetype-secondary" style={{ display: 'none' }} />
            </div>

            <div className="taste-profile-card" id="taste-profile-card">
              <div className="taste-profile-header">
                <h2 className="taste-profile-title">YOUR UNCURATED PROFILE</h2>
                <button
                  className="copy-btn"
                  id="copy-btn"
                  title="Copy shareable summary"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span className="copy-label">Share</span>
                </button>
              </div>
              <p className="taste-profile-text" id="taste-profile-text" />
            </div>

            <h2 className="recs-title">Recommended for you</h2>
            <ol className="recs-list" id="recs-list" />

            <div className="email-cta" id="email-cta" style={{ display: 'none' }}>
              <p className="email-cta-label">Save or share your recommendations</p>
              <div className="email-cta-row">
                <input
                  type="email"
                  id="email-input"
                  className="email-input"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
                <button className="email-send-btn" id="email-send-btn" type="button">
                  Send to my inbox
                </button>
              </div>
              <p className="email-cta-status" id="email-cta-status" />
              <div className="email-share-divider">
                <span>or</span>
              </div>
              <button className="share-card-btn" id="share-card-btn" type="button">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Share my recommendations
              </button>
              <div id="indie-bookstore-cta" className="indie-bookstore-cta-inner" style={{ display: 'none' }}>
                <div className="email-share-divider">
                  <span>or</span>
                </div>
                <button className="share-card-btn" id="indie-bookstore-btn" type="button">
                  <i className="ti ti-map-pin" />
                  Find your nearest indie bookstore
                </button>
              </div>
              <button className="clear-btn start-over-btn" id="start-over-btn" type="button">
                Start over
              </button>
            </div>
          </section>
        </main>

        <footer className="footer">
          <p>
            Uncurated · © 2025 · Powered by Claude · No affiliate data collected ·{' '}
            <a
              href="https://tally.so/r/2E1DP9"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              Give feedback
            </a>
          </p>
        </footer>
      </div>

      {/* Shelf scan tip modal */}
      <div
        className="scan-overlay"
        id="shelf-tip-overlay"
        style={{ display: 'none' }}
        role="dialog"
        aria-modal={true}
        aria-labelledby="shelf-tip-title"
      >
        <div className="scan-modal scan-tip-modal">
          <div className="scan-modal-icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <p className="scan-modal-title" id="shelf-tip-title">
            Scan my bookshelf
          </p>
          <p className="scan-modal-tip">
            Best results: good lighting, camera straight-on to the shelf.
          </p>
          <div className="scan-modal-actions">
            <button className="scan-cancel-btn" id="shelf-tip-cancel" type="button">
              Cancel
            </button>
            <button className="scan-confirm-btn" id="shelf-tip-confirm" type="button">
              Choose photo
            </button>
          </div>
        </div>
      </div>

      {/* Shelf review modal */}
      <div
        className="scan-overlay"
        id="shelf-review-overlay"
        style={{ display: 'none' }}
        role="dialog"
        aria-modal={true}
        aria-labelledby="shelf-review-title"
      >
        <div className="scan-modal shelf-review-modal">
          <div className="shelf-review-header">
            <h3 className="shelf-review-title" id="shelf-review-title">
              Review detected books
            </h3>
            <button
              className="shelf-review-close"
              id="shelf-review-close"
              type="button"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="shelf-review-summary" id="shelf-review-summary" />
          <ul className="shelf-review-list" id="shelf-review-list" />
          <div className="shelf-review-footer">
            <button className="shelf-review-confirm-btn" id="shelf-review-confirm" type="button">
              Add books
            </button>
          </div>
        </div>
      </div>

      {/* Indie bookstore modal */}
      <div
        className="scan-overlay"
        id="indie-store-overlay"
        style={{ display: 'none' }}
        role="dialog"
        aria-modal={true}
        aria-labelledby="indie-store-title"
      >
        <div className="scan-modal shelf-review-modal indie-store-modal">
          <div className="shelf-review-header">
            <h3 className="shelf-review-title" id="indie-store-title">
              Indie bookstores near you
            </h3>
            <button
              className="shelf-review-close"
              id="indie-store-close"
              type="button"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div id="indie-store-content" className="indie-store-content" />
          <div className="shelf-review-footer indie-store-footer">
            <a
              className="indie-store-fallback-link"
              href="https://www.booksellers.org.uk/bookshopsearch"
              target="_blank"
              rel="noopener noreferrer"
            >
              Browse all on Booksellers Association →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
