import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Keyboard, X } from 'lucide-react';

export default function Header() {
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (showKeyboardModal) {
      closeBtnRef.current?.focus();
    }
  }, [showKeyboardModal]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && showKeyboardModal) {
      setShowKeyboardModal(false);
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="app-header" role="banner">
        <div className="logo-area">
          <BookOpen className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
          <h1>AI Study Material Organizer</h1>
          <span className="badge-tag">3rd Sem MVP</span>
        </div>

        <button
          type="button"
          className="keyboard-hint-btn"
          onClick={() => setShowKeyboardModal(true)}
          aria-label="View Keyboard Shortcuts Guide"
        >
          <Keyboard className="w-4 h-4" aria-hidden="true" />
          <span>Keyboard Guide</span>
        </button>
      </header>

      {showKeyboardModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kbd-modal-title"
          onKeyDown={handleKeyDown}
        >
          <div className="modal-content" ref={modalRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 id="kbd-modal-title" style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                Keyboard Navigation Guide
              </h2>
              <button
                type="button"
                ref={closeBtnRef}
                className="btn-action"
                onClick={() => setShowKeyboardModal(false)}
                aria-label="Close keyboard shortcuts dialog"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              This application is built for <strong>100% mouse-free keyboard operation</strong>.
            </p>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <kbd style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Tab / Shift+Tab</kbd>
                <span>Navigate between controls</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <kbd style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Enter / Space</kbd>
                <span>Select file / Trigger action</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <kbd style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Arrow Keys</kbd>
                <span>Navigate subject tabs</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <kbd style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Escape</kbd>
                <span>Close modal dialogs</span>
              </li>
            </ul>

            <div className="modal-actions">
              <button
                type="button"
                className="upload-btn"
                onClick={() => setShowKeyboardModal(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
