import React, { useState, useMemo } from 'react';
import { Commitment, CheckIn } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import './Accountability.css';

const FREQ_LABELS = { daily: 'Daily', weekly: 'Weekly', 'bi-weekly': 'Bi-Weekly' };
const CATEGORY_COLORS: Record<string, string> = {
  teaching: '#6366f1', research: '#8b5cf6', personal: '#10b981', admin: '#f59e0b',
};
const MOOD_EMOJIS: Record<string, string> = { great: '😄', good: '🙂', okay: '😐', tough: '😟' };

type CommitForm = {
  title: string;
  description: string;
  category: Commitment['category'];
  targetDate: string;
  checkInFrequency: Commitment['checkInFrequency'];
};

const emptyForm: CommitForm = {
  title: '', description: '', category: 'teaching',
  targetDate: '', checkInFrequency: 'weekly',
};

export default function Accountability() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editCommit, setEditCommit] = useState<Commitment | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openCheckIn, setOpenCheckIn] = useState<string | null>(null);
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<CommitForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInMood, setCheckInMood] = useState<CheckIn['mood']>('okay');

  if (loading || !data) return <LoadingSkeleton rows={4} type="cards" />;

  const filtered = useMemo(() => {
    return data.commitments
      .filter(c => !filterCategory || c.category === filterCategory)
      .filter(c => !filterStatus || c.status === filterStatus)
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [data, filterCategory, filterStatus]);

  const todayStr = new Date().toISOString().split('T')[0];
  const activeCount = data.commitments.filter(c => c.status === 'active').length;
  const streak = useMemo(() => {
    // Count consecutive days with at least one check-in
    const allCheckIns = data.commitments.flatMap(c => c.checkIns.filter(ci => ci.completed));
    const dates = [...new Set(allCheckIns.map(ci => ci.date))].sort().reverse();
    if (dates.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const dateStr of dates) {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === streak) { streak++; }
      else if (diff > streak) break;
    }
    return streak;
  }, [data]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.targetDate) errors.targetDate = 'Target date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    await updateStore(prev => {
      let updated: Commitment[];
      if (editCommit) {
        updated = prev.commitments.map(c => c.id === editCommit.id
          ? { ...editCommit, ...form, updatedAt: now } : c);
      } else {
        const newC: Commitment = {
          id: 'cm' + Date.now(), ...form, checkIns: [],
          status: 'active', createdAt: now, updatedAt: now,
        };
        updated = [...prev.commitments, newC];
      }
      return { ...prev, commitments: updated };
    });
    closeModal();
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, commitments: prev.commitments.filter(c => c.id !== id) }));
  };

  const handleCheckIn = async (commitId: string) => {
    if (!checkInNotes.trim() && !openCheckIn) return;
    const now = new Date().toISOString();
    const newCheckIn: CheckIn = {
      id: 'ci' + Date.now(), commitmentId: commitId,
      date: todayStr, completed: true, notes: checkInNotes, mood: checkInMood,
    };
    await updateStore(prev => ({
      ...prev,
      commitments: prev.commitments.map(c => c.id === commitId
        ? { ...c, checkIns: [...c.checkIns, newCheckIn], updatedAt: now } : c),
    }));
    setOpenCheckIn(null);
    setCheckInNotes('');
    setCheckInMood('okay');
  };

  const handleComplete = async (commit: Commitment) => {
    await updateStore(prev => ({
      ...prev,
      commitments: prev.commitments.map(c => c.id === commit.id
        ? { ...c, status: 'completed' as const, updatedAt: new Date().toISOString() } : c),
    }));
  };

  const openEdit = (commit: Commitment) => {
    setEditCommit(commit);
    setForm({
      title: commit.title, description: commit.description, category: commit.category,
      targetDate: commit.targetDate, checkInFrequency: commit.checkInFrequency,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditCommit(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const todayCheckIn = (commit: Commitment) =>
    commit.checkIns.find(ci => ci.date === todayStr && ci.completed);

  return (
    <div className="accountability-page">
      <PageHeader
        title="📋 Accountability"
        subtitle="Commitments with peer-style check-ins, streaks, and progress tracking"
        action={<button className="btn-primary" onClick={() => { setEditCommit(null); setForm(emptyForm); setShowModal(true); }}>+ New Commitment</button>}
      />

      <div className="stats-bar">
        <div className="stat-pill">
          <span className="stat-value">{activeCount}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value" style={{ color: 'var(--success)' }}>{streak}</span>
          <span className="stat-label">Day Streak</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value" style={{ color: 'var(--info)' }}>
            {data.commitments.reduce((s, c) => s + c.checkIns.filter(ci => ci.completed).length, 0)}
          </span>
          <span className="stat-label">Check-ins</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{data.commitments.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      <div className="filters-bar">
        <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="teaching">📚 Teaching</option>
          <option value="research">🔬 Research</option>
          <option value="personal">👤 Personal</option>
          <option value="admin">📋 Admin</option>
        </select>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="missed">Missed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No commitments yet"
          description="Create your first commitment to start tracking progress with regular check-ins"
          action={<button className="btn-primary" onClick={() => { setEditCommit(null); setForm(emptyForm); setShowModal(true); }}>Create Commitment</button>}
        />
      ) : (
        <div className="commitments-grid">
          {filtered.map(commit => {
            const totalCheckIns = commit.checkIns.filter(ci => ci.completed).length;
            const daysSinceStart = Math.ceil((Date.now() - new Date(commit.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const adherenceRate = daysSinceStart > 0 ? Math.round((totalCheckIns / daysSinceStart) * 100) : 0;
            const doneToday = todayCheckIn(commit);

            return (
              <article key={commit.id} className="commit-card" style={{ borderLeftColor: CATEGORY_COLORS[commit.category] }}>
                <div className="commit-header">
                  <div>
                    <h3 className="commit-title">{commit.title}</h3>
                    <span className="commit-category" style={{ background: `${CATEGORY_COLORS[commit.category]}20`, color: CATEGORY_COLORS[commit.category] }}>
                      {commit.category}
                    </span>
                    <span className="commit-frequency">{FREQ_LABELS[commit.checkInFrequency]}</span>
                  </div>
                  <span className={`commit-status status-${commit.status}`}>{commit.status}</span>
                </div>
                {commit.description && <p className="commit-description">{commit.description}</p>}
                <div className="commit-meta">
                  <span>🎯 Target: {new Date(commit.targetDate).toLocaleDateString()}</span>
                  <span>📅 Created: {new Date(commit.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="commit-progress">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(adherenceRate, 100)}%` }}></div>
                  </div>
                  <div className="progress-meta">
                    <span>{adherenceRate}% adherence</span>
                    <span>{totalCheckIns} check-ins</span>
                  </div>
                </div>

                {commit.checkIns.length > 0 && (
                  <div className="recent-checkins">
                    <span className="checkins-label">Recent check-ins:</span>
                    <div className="checkins-dots">
                      {commit.checkIns.slice(-7).reverse().map(ci => (
                        <span key={ci.id} className={`checkin-dot ${ci.completed ? 'done' : ''}`}
                          title={`${ci.date}: ${ci.completed ? '✓' : '✗'} ${ci.notes || ''}`}
                        >{ci.completed ? '✓' : '○'}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="commit-actions">
                  {commit.status === 'active' && (
                    doneToday ? (
                      <span className="checkin-done-badge">✅ Checked in today</span>
                    ) : (
                      <button className="btn-primary small" onClick={() => setOpenCheckIn(commit.id)}>
                        + Check In
                      </button>
                    )
                  )}
                  <button className="icon-btn" onClick={() => openEdit(commit)} title="Edit">✏️</button>
                  {commit.status === 'active' && (
                    <button className="btn-secondary small" onClick={() => handleComplete(commit)} title="Mark Complete">✓ Done</button>
                  )}
                  <button className="icon-btn danger" onClick={() => requestConfirm(commit.id)} title="Delete">🗑️</button>
                </div>

                {openCheckIn === commit.id && (
                  <div className="checkin-form">
                    <select value={checkInMood} onChange={e => setCheckInMood(e.target.value as CheckIn['mood'])}>
                      {(['great', 'good', 'okay', 'tough'] as const).map(m => (
                        <option key={m} value={m}>{MOOD_EMOJIS[m]} {m}</option>
                      ))}
                    </select>
                    <input type="text" value={checkInNotes} onChange={e => setCheckInNotes(e.target.value)}
                      placeholder="How's it going? Any progress or blockers?" />
                    <div className="checkin-form-actions">
                      <button className="btn-primary small" onClick={() => handleCheckIn(commit.id)}>Log Check-in</button>
                      <button className="btn-secondary small" onClick={() => { setOpenCheckIn(null); setCheckInNotes(''); }}>Cancel</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editCommit ? 'Edit Commitment' : 'New Commitment'}</h2>
            <div className="form-grid">
              <label className="full-width">
                <span>Commitment Title *</span>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Complete 2 research paper reviews per week" />
                {formErrors.title && <div className="form-error">{formErrors.title}</div>}
              </label>
              <label className="full-width">
                <span>Description</span>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="What does this commitment involve?" />
              </label>
              <label>
                <span>Category</span>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Commitment['category'] })}>
                  <option value="teaching">📚 Teaching</option>
                  <option value="research">🔬 Research</option>
                  <option value="personal">👤 Personal</option>
                  <option value="admin">📋 Admin</option>
                </select>
              </label>
              <label>
                <span>Check-in Frequency</span>
                <select value={form.checkInFrequency} onChange={e => setForm({ ...form, checkInFrequency: e.target.value as Commitment['checkInFrequency'] })}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                </select>
              </label>
              <label className="full-width">
                <span>Target Date *</span>
                <input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
                {formErrors.targetDate && <div className="form-error">{formErrors.targetDate}</div>}
              </label>
            </div>
            <div className="modal-actions">
              {editCommit && <button className="btn-danger" onClick={() => { requestConfirm(editCommit.id); closeModal(); }}>Delete</button>}
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editCommit ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Commitment"
          message="Are you sure you want to delete this commitment? All check-in data will be lost."
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}