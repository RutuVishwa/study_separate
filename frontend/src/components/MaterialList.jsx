import React, { useState } from 'react';
import { ExternalLink, Download, Trash2, FileCode, FileText, File } from 'lucide-react';
import { getDownloadUrl, deleteMaterial } from '../services/api';
import ConfirmModal from './ConfirmModal';

export default function MaterialList({ materials, selectedSubject, onDeleteSuccess, setAnnounceMessage }) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getFileIcon = (fileType) => {
    const ext = (fileType || '').toLowerCase();
    if (['cpp', 'c', 'h', 'hpp', 'py', 'java', 'js', 'ts'].includes(ext)) {
      return <FileCode className="w-5 h-5" aria-hidden="true" />;
    }
    if (['pdf', 'txt', 'md'].includes(ext)) {
      return <FileText className="w-5 h-5" aria-hidden="true" />;
    }
    return <File className="w-5 h-5" aria-hidden="true" />;
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteMaterial(deleteTarget.id);
      setAnnounceMessage(`Deleted ${deleteTarget.filename}`);
      onDeleteSuccess(deleteTarget.id);
    } catch (err) {
      setAnnounceMessage(`Failed to delete file: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <section className="card-section" aria-labelledby="materials-section-title">
      <div className="materials-header">
        <div>
          <h2 id="materials-section-title" className="section-title" style={{ marginBottom: '4px' }}>
            <span>{selectedSubject === 'ALL' ? 'All Materials' : selectedSubject}</span>
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {materials.length} {materials.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="empty-state">
          <FileText className="w-12 h-12 stroke-1" style={{ margin: '0 auto 12px auto', color: 'var(--text-muted)' }} aria-hidden="true" />
          <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>No materials found in this subject yet.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            Upload a PDF, source code, or note file above to organize it into {selectedSubject}.
          </p>
        </div>
      ) : (
        <div className="materials-grid" role="list" aria-label="Study material list">
          {materials.map((item) => (
            <div key={item.id} className="material-card" role="listitem">
              <div className="file-info">
                <div className="file-icon-box" title={item.file_type}>
                  {getFileIcon(item.file_type)}
                </div>

                <div className="file-details">
                  <span className="file-title">{item.filename}</span>
                  <div className="file-meta">
                    <span className="badge-tag" style={{ fontSize: '0.7rem' }}>{item.subject}</span>
                    <span>{(item.file_size / 1024).toFixed(1)} KB</span>
                    {item.uploaded_at && (
                      <span>{new Date(item.uploaded_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="action-buttons">
                <a
                  href={getDownloadUrl(item.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-action"
                  aria-label={`Open ${item.filename} in new browser tab`}
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  <span>Open</span>
                </a>

                <a
                  href={getDownloadUrl(item.id)}
                  download={item.filename}
                  className="btn-action"
                  aria-label={`Download ${item.filename}`}
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Download</span>
                </a>

                <button
                  type="button"
                  className="btn-action danger"
                  onClick={() => setDeleteTarget(item)}
                  aria-label={`Delete ${item.filename}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accessible Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Material"
        message={`Are you sure you want to delete "${deleteTarget?.filename}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete File"}
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
