import React, { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import SubjectList from '../components/SubjectList';
import MaterialList from '../components/MaterialList';
import { fetchDashboardStats, fetchMaterials } from '../services/api';

export default function Dashboard() {
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [stats, setStats] = useState({ total_materials: 0, subject_counts: {} });
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announceMessage, setAnnounceMessage] = useState('');

  const loadData = async (subj = selectedSubject) => {
    try {
      const [statsData, materialsData] = await Promise.all([
        fetchDashboardStats(),
        fetchMaterials(subj)
      ]);
      setStats(statsData);
      setMaterials(materialsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedSubject);
  }, [selectedSubject]);

  const handleSelectSubject = (subj) => {
    setSelectedSubject(subj);
    setAnnounceMessage(`Filter set to ${subj === 'ALL' ? 'All Materials' : subj}`);
  };

  const handleUploadSuccess = () => {
    loadData(selectedSubject);
  };

  const handleDeleteSuccess = () => {
    loadData(selectedSubject);
  };

  return (
    <main id="main-content" className="app-container" tabIndex="-1">
      {/* Screen Reader Live Region for Announcements */}
      <div className="aria-announcer" aria-live="polite" aria-atomic="true">
        {announceMessage}
      </div>

      {/* Top Section: Upload Box */}
      <FileUpload
        onUploadSuccess={handleUploadSuccess}
        setAnnounceMessage={setAnnounceMessage}
      />

      {/* Main Content Grid: Left Subject Navigation, Right Materials List */}
      <div className="main-grid">
        <aside aria-label="Subject sidebar">
          <SubjectList
            selectedSubject={selectedSubject}
            onSelectSubject={handleSelectSubject}
            counts={stats.subject_counts}
            totalCount={stats.total_materials}
          />
        </aside>

        <section aria-label="Materials content area">
          {loading ? (
            <div className="card-section" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading study materials...</p>
            </div>
          ) : (
            <MaterialList
              materials={materials}
              selectedSubject={selectedSubject}
              onDeleteSuccess={handleDeleteSuccess}
              setAnnounceMessage={setAnnounceMessage}
            />
          )}
        </section>
      </div>
    </main>
  );
}
