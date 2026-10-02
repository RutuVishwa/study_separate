import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', isDanger = false }) {
  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      cancelBtnRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div className="modal-content" ref={modalRef}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          {isDanger && <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} aria-hidden="true" />}
          <h2 id="confirm-modal-title" style={{ fontSize: '1.15rem', fontWeight: '700' }}>
            {title}
          </h2>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px' }}>
          {message}
        </p>

        <div className="modal-actions">
          <button
            type="button"
            ref={cancelBtnRef}
            className="btn-action"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn-action ${isDanger ? 'danger' : ''}`}
            onClick={onConfirm}
            style={isDanger ? { backgroundColor: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' } : {}}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
