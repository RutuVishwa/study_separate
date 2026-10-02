import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadMaterial, confirmUpload } from '../services/api';

const ALLOWED_SUBJECTS = [
  "Discrete Mathematics",
  "DSA",
  "OOP",
  "DBMS",
  "LDM"
];

export default function FileUpload({ onUploadSuccess, setAnnounceMessage }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [lowConfidenceData, setLowConfidenceData] = useState(null);

  const handleFileChange = (e) => {
    setErrorMsg(null);
    setLowConfidenceData(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setAnnounceMessage(`Selected file: ${file.name}`);
    }
  };

  const handleUpload = async (subjectOverride = null) => {
    if (!selectedFile && !lowConfidenceData) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (lowConfidenceData && subjectOverride) {
        // Confirming low confidence upload
        setCurrentStep('Saving confirmed classification...');
        setAnnounceMessage(`Confirming classification as ${subjectOverride}...`);

        const res = await confirmUpload(lowConfidenceData.temp_file_id, subjectOverride);
        setLowConfidenceData(null);
        setSelectedFile(null);
        setAnnounceMessage(res.message);
        onUploadSuccess(res.material);
      } else {
        // Initial Upload Flow
        setCurrentStep('Uploading file to server...');
        setAnnounceMessage(`Uploading ${selectedFile.name}...`);
        
        await new Promise(r => setTimeout(r, 300));
        setCurrentStep('Extracting text content...');
        setAnnounceMessage('Extracting readable text...');

        await new Promise(r => setTimeout(r, 400));
        setCurrentStep('Analyzing material with AI...');
        setAnnounceMessage('Sending extracted text to AI classifier...');

        const result = await uploadMaterial(selectedFile, subjectOverride);

        if (result.needs_confirmation) {
          setLowConfidenceData(result);
          setAnnounceMessage(result.message);
        } else {
          setSelectedFile(null);
          setAnnounceMessage(result.message);
          onUploadSuccess(result.material);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong while processing the file.');
      setAnnounceMessage(`Upload error: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  return (
    <section className="card-section" aria-labelledby="upload-section-title">
      <h2 id="upload-section-title" className="section-title">
        <span>Upload Study Material</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto AI Classification</span>
      </h2>

      {errorMsg && (
        <div className="confidence-box" style={{ borderColor: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', marginBottom: '16px' }} role="alert">
          <div className="confidence-header" style={{ color: 'var(--danger)' }}>
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            <span>Upload Failed</span>
          </div>
          <p style={{ fontSize: '0.9rem' }}>{errorMsg}</p>
        </div>
      )}

      {!lowConfidenceData ? (
        <div className="upload-box">
          <input
            id="file-upload-input"
            type="file"
            className="file-input-hidden"
            accept=".pdf,.c,.cpp,.h,.hpp,.py,.java,.js,.ts,.txt,.md"
            onChange={handleFileChange}
            disabled={isProcessing}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <label htmlFor="file-upload-input" className="file-select-label">
              <FileText className="w-5 h-5" aria-hidden="true" />
              <span>{selectedFile ? 'Change File' : 'Choose Study Material'}</span>
            </label>

            {selectedFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: '600' }}>
                <span>Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Drop or select PDF notes, source code, or text notes
              </span>
            )}

            <button
              type="button"
              className="upload-btn"
              onClick={() => handleUpload()}
              disabled={!selectedFile || isProcessing}
              aria-label={selectedFile ? `Upload and classify ${selectedFile.name}` : "Upload file"}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>Upload & Classify</span>
                </>
              )}
            </button>

            <div className="supported-types">
              Supported: <code>.pdf, .cpp, .c, .h, .py, .java, .js, .ts, .txt, .md</code>
            </div>
          </div>

          {isProcessing && (
            <div className="progress-container" aria-live="polite">
              <div className="progress-step active">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>{currentStep}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Low Confidence Confirmation UI (Section 21) */
        <div className="confidence-box" role="region" aria-label="AI Classification Confirmation">
          <div className="confidence-header">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            <span>Low Confidence Classification ({intPercent(lowConfidenceData.confidence)}%)</span>
          </div>

          <p style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
            We're not completely certain where this material belongs.
          </p>

          <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AI Suggested Subject:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--warning)' }}>
              {lowConfidenceData.suggested_subject}
            </div>
            {lowConfidenceData.extracted_preview && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
                Preview: "{lowConfidenceData.extracted_preview}"
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>
            Choose the correct subject:
          </div>

          <div className="subject-options-grid">
            <button
              type="button"
              className="subject-option-btn primary"
              onClick={() => handleUpload(lowConfidenceData.suggested_subject)}
              disabled={isProcessing}
            >
              Accept {lowConfidenceData.suggested_subject}
            </button>

            {ALLOWED_SUBJECTS.filter(s => s !== lowConfidenceData.suggested_subject).map(subj => (
              <button
                key={subj}
                type="button"
                className="subject-option-btn"
                onClick={() => handleUpload(subj)}
                disabled={isProcessing}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function intPercent(conf) {
  return Math.round((conf || 0) * 100);
}
