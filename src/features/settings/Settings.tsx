
import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { defaultData, exportToJson, importFromJson } from '../../utils/store';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './Settings.css';

export default function Settings() {
  const { data, loading, updateStore } = useStore();
  const [name, setName] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [saved, setSaved] = useState(false);

  // Sync local name state when data loads
  React.useEffect(() => {
    if (data) setName(data.userName);
  }, [data?.userName]);

  if (loading || !data) return <LoadingSkeleton rows={3} type="list" />;

  const handleSaveName = async () => {
    if (!name.trim()) return;
    await updateStore(prev => ({ ...prev, userName: name.trim() }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddCourse = async () => {
    const trimmed = newCourse.trim();
    if (!trimmed || data.courses.includes(trimmed)) return;
    await updateStore(prev => ({ ...prev, courses: [...prev.courses, trimmed] }));
    setNewCourse('');
  };

  const handleRemoveCourse = async (course: string) => {
    await updateStore(prev => ({ ...prev, courses: prev.courses.filter(c => c !== course) }));
  };

  const handleReset = async () => {
    if (!window.confirm('This will delete ALL data and restore defaults. Are you sure?')) return;
    await updateStore(() => ({ ...defaultData }));
    setName(defaultData.userName);
  };

  // ─── Data export ────────────────────────────────────────────────────────────
  const handleExportJSON = async () => {
    const json = await exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `se-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Group', 'Course', 'Notes'],
      ...data.students.map(s => [s.name, s.email, s.group, s.enrolledCourse, s.notes]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importFromJson(text, updateStore);
      alert('Data imported successfully!');
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to parse file. Make sure it is a valid JSON backup.');
    }
    e.target.value = '';
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>⚙️ Settings</h1>
          <p className="page-subtitle">Manage your workspace preferences</p>
        </div>
      </div>

      <div className="settings-section">
        <h2>👤 Profile</h2>
        <div className="settings-row">
          <label>
            <span>Display Name</span>
            <input
              id="settings-name-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
          </label>
          <button id="settings-save-name" className="btn-primary" onClick={handleSaveName}>
            {saved ? '✓ Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2>📚 Courses</h2>
        <p className="settings-hint">Manage the courses you teach. These appear in all dropdowns.</p>
        <div className="course-list">
          {data.courses.map(course => (
            <div key={course} className="course-item">
              <span>{course}</span>
              <button className="icon-btn danger" onClick={() => handleRemoveCourse(course)} title={`Remove ${course}`}>🗑️</button>
            </div>
          ))}
          {data.courses.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No courses yet. Add one below.</p>}
        </div>
        <div className="settings-row">
          <label>
            <span>New Course Name</span>
            <input
              id="new-course-input"
              type="text"
              value={newCourse}
              onChange={e => setNewCourse(e.target.value)}
              placeholder="e.g. Algorithms & Data Structures"
              onKeyDown={e => e.key === 'Enter' && handleAddCourse()}
            />
          </label>
          <button className="btn-primary" onClick={handleAddCourse}>+ Add</button>
        </div>
      </div>

      <div className="settings-section">
        <h2>💾 Data Backup & Export</h2>
        <p className="settings-hint">Export your data for backup or import a previous backup.</p>
        <div className="export-buttons">
          <button id="export-json-btn" className="btn-secondary" onClick={handleExportJSON}>
            📥 Export Full Backup (JSON)
          </button>
          <button id="export-csv-btn" className="btn-secondary" onClick={handleExportCSV}>
            📊 Export Students (CSV)
          </button>
          <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            📤 Import Backup (JSON)
            <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>🗑️ Danger Zone</h2>
        <p className="settings-hint">This will permanently erase all data and restore defaults.</p>
        <button id="reset-data-btn" className="btn-danger" onClick={handleReset}>Reset All Data</button>
      </div>
    </div>
  );
}
