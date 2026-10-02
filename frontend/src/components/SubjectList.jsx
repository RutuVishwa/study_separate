import React, { useRef } from 'react';
import { Folder, Layers } from 'lucide-react';

const SUBJECT_LIST = [
  "ALL",
  "Discrete Mathematics",
  "DSA",
  "OOP",
  "DBMS",
  "LDM"
];

export default function SubjectList({ selectedSubject, onSelectSubject, counts, totalCount }) {
  const navRef = useRef(null);

  const handleKeyDown = (e, index) => {
    let nextIndex = index;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % SUBJECT_LIST.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + SUBJECT_LIST.length) % SUBJECT_LIST.length;
    }

    if (nextIndex !== index) {
      const buttons = navRef.current?.querySelectorAll('button');
      if (buttons && buttons[nextIndex]) {
        buttons[nextIndex].focus();
        onSelectSubject(SUBJECT_LIST[nextIndex]);
      }
    }
  };

  return (
    <section className="card-section" aria-labelledby="subjects-title">
      <h2 id="subjects-title" className="section-title">
        <span>Subjects</span>
        <span className="badge-tag">5 Subjects</span>
      </h2>

      <div className="subject-nav" role="tablist" aria-label="3rd Semester Subjects" ref={navRef}>
        {SUBJECT_LIST.map((subj, idx) => {
          const isActive = selectedSubject === subj;
          const count = subj === 'ALL' ? totalCount : (counts[subj] || 0);

          return (
            <button
              key={subj}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`subject-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectSubject(subj)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {subj === 'ALL' ? (
                  <Layers className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Folder className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{subj === 'ALL' ? 'All Materials' : subj}</span>
              </div>
              <span className="subject-count-badge">
                {count} {count === 1 ? 'file' : 'files'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
