
import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './Journal.css';

const MOOD_EMOJIS = {
  great: '😄',
  good: '🙂',
  okay: '😐',
  tough: '😟',
  burnout: '😰',
};

const MOOD_LABELS = {
  great: 'Great',
  good: 'Good',
  okay: 'Okay',
  tough: 'Tough',
  burnout: 'Burnout',
};

const MOOD_COLORS = {
  great: '#10b981',
  good: '#34d399',
  okay: '#f59e0b',
  tough: '#f97316',
  burnout: '#ef4444',
};

type JournalForm = {
  date: string;
  mood: JournalEntry['mood'];
  wins: string[];
  blockers: string[];
  notes: string;
  timeSpent: Record<string, number>;
  timeTopic: string;
  timeMinutes: string;
};

const DEFAULT_ENTRY: JournalForm = {
  date: new Date().toISOString().split('T')[0],
  mood: 'okay',
  wins: [''],
  blockers: [''],
  notes: '',
  timeSpent: {},
  timeTopic: '',
  timeMinutes: '',
};

export default function Journal() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [filterMood, setFilterMood] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<JournalForm>(DEFAULT_ENTRY);

  const monthEntries = useMemo(() => {
    if (!data) return [];
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return data.journalEntries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= start && entryDate <= end;
    });
  }, [data, currentMonth]);

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    return data.journalEntries
      .filter(e => !filterMood || e.mood === filterMood)
      .filter(e => !searchQuery || 
        e.wins.some(w => w.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.blockers.some(b => b.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.keys(e.timeSpent).some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, filterMood, searchQuery]);

  const streak = useMemo(() => {
    if (!data || data.journalEntries.length === 0) return 0;
    const sorted = [...data.journalEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let currentStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const entry of sorted) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      const diff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === currentStreak) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (diff > currentStreak) {
        break;
      }
    }
    return currentStreak;
  }, [data]);

  const weeklySummary = useMemo(() => {
    if (!data) return { totalMinutes: 0, topics: {} as Record<string, number>, moodCounts: {} as Record<string, number> };
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = data.journalEntries.filter(e => new Date(e.date) >= weekAgo);
    
    let totalMinutes = 0;
    const topics: Record<string, number> = {};
    const moodCounts: Record<string, number> = {};
    
    thisWeek.forEach(e => {
      Object.entries(e.timeSpent).forEach(([topic, mins]) => {
        totalMinutes += mins;
        topics[topic] = (topics[topic] || 0) + mins;
      });
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });
    
    return { totalMinutes, topics, moodCounts };
  }, [data]);

  if (loading || !data) return <LoadingSkeleton rows={5} type="cards" />;

  const handleSave = async () => {
    if (!form.date || !form.mood) return;
    const now = new Date().toISOString();
    const timeSpent: Record<string, number> = { ...form.timeSpent };
    if (form.timeTopic && form.timeMinutes) {
      timeSpent[form.timeTopic] = (timeSpent[form.timeTopic] || 0) + parseInt(form.timeMinutes);
    }
    
    await updateStore(prev => {
      let updatedEntries: JournalEntry[];
      if (editEntry) {
        updatedEntries = prev.journalEntries.map(e => e.id === editEntry.id ? { 
          ...editEntry, date: form.date, mood: form.mood, wins: form.wins.filter(Boolean),
          blockers: form.blockers.filter(Boolean), notes: form.notes, timeSpent, updatedAt: now 
        } : e);
      } else {
        const newEntry: JournalEntry = {
          id: 'j' + Date.now(), date: form.date, mood: form.mood, wins: form.wins.filter(Boolean),
          blockers: form.blockers.filter(Boolean), notes: form.notes, timeSpent, createdAt: now, updatedAt: now,
        };
        updatedEntries = [...prev.journalEntries, newEntry];
      }
      return { ...prev, journalEntries: updatedEntries };
    });
    closeModal();
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, journalEntries: prev.journalEntries.filter(e => e.id !== id) }));
  };

  const openEdit = (entry: JournalEntry) => {
    setEditEntry(entry);
    setForm({
      date: entry.date, mood: entry.mood, wins: [...entry.wins, ''], blockers: [...entry.blockers, ''],
      notes: entry.notes, timeSpent: { ...entry.timeSpent }, timeTopic: '', timeMinutes: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditEntry(null);
    setForm({ ...DEFAULT_ENTRY, date: new Date().toISOString().split('T')[0] });
  };

  const addItem = (field: 'wins' | 'blockers') => setForm(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  const removeItem = (field: 'wins' | 'blockers', index: number) => setForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  const updateItem = (field: 'wins' | 'blockers', index: number, value: string) => setForm(prev => ({ ...prev, [field]: prev[field].map((v, i) => i === index ? value : v) }));

  const addTimeSpent = () => {
    if (!form.timeTopic || !form.timeMinutes) return;
    setForm(prev => ({
      ...prev, timeSpent: { ...prev.timeSpent, [form.timeTopic]: (prev.timeSpent[form.timeTopic] || 0) + parseInt(form.timeMinutes) },
      timeTopic: '', timeMinutes: '',
    }));
  };
  const removeTimeSpent = (topic: string) => {
    setForm(prev => { const next = { ...prev.timeSpent }; delete next[topic]; return { ...prev, timeSpent: next }; });
  };

  const handleNewEntry = (date: string) => {
    setEditEntry(null);
    setForm({ ...DEFAULT_ENTRY, date });
    setShowModal(true);
  };

  const prevMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const today = () => setCurrentMonth(new Date());

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="journal-page">
      <div className="page-header">
        <div>
          <h1>📔 Progress Journal</h1>
          <p className="page-subtitle">Daily/weekly logs — mood, wins, blockers, time tracking, auto-summary</p>
        </div>
        <button className="btn-primary" onClick={() => handleNewEntry(new Date().toISOString().split('T')[0])}>
          + Today's Entry
        </button>
      </div>

      <div className="stats-bar">
        <div className="stat-pill">
          <span className="stat-value">{data.journalEntries.length}</span>
          <span className="stat-label">Total Entries</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value" style={{ color: 'var(--success)' }}>{streak}</span>
          <span className="stat-label">Day Streak</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{weeklySummary.totalMinutes}h</span>
          <span className="stat-label">This Week</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{Object.keys(weeklySummary.topics).length}</span>
          <span className="stat-label">Topics Tracked</span>
        </div>
      </div>

      <div className="weekly-summary">
        <h3>📊 This Week's Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Time Logged</span>
            <span className="summary-value">{weeklySummary.totalMinutes} min</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Top Topics</span>
            <span className="summary-value">
              {Object.entries(weeklySummary.topics).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, m]) => `${t} (${m}m)`).join(', ') || '—'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Mood Trend</span>
            <span className="summary-value">
              {Object.entries(weeklySummary.moodCounts).sort((a, b) => b[1] - a[1]).map(([m, c]) => `${MOOD_EMOJIS[m as keyof typeof MOOD_EMOJIS]} ${c}`).join(' · ') || '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search wins, blockers, notes, topics..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="filter-group">
          <select className="filter-select" value={filterMood} onChange={e => setFilterMood(e.target.value)}>
            <option value="">All Moods</option>
            {(Object.keys(MOOD_EMOJIS) as Array<keyof typeof MOOD_EMOJIS>).map(m => (
              <option key={m} value={m}>{MOOD_EMOJIS[m]} {MOOD_LABELS[m]}</option>
            ))}
          </select>
          <div className="view-toggle">
            <button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}>📅</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>☰</button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' && (
        <div className="calendar-view">
          <div className="calendar-header">
            <button className="btn-secondary" onClick={prevMonth}>‹</button>
            <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <button className="btn-secondary" onClick={nextMonth}>›</button>
            <button className="btn-primary" onClick={today}>Today</button>
          </div>
          <div className="calendar-grid">
            {DAYS.map(d => <div key={d} className="day-name">{d.slice(0, 3)}</div>)}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="day empty" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const entry = monthEntries.find(e => e.date === dateStr);
              const isToday = dateStr === todayStr;
              return (
                <div key={day} className={`day ${isToday ? 'today' : ''} ${entry ? 'has-entry' : ''}`} onClick={() => entry ? openEdit(entry) : handleNewEntry(dateStr)}>
                  <span className="day-number">{day}</span>
                  {entry && (
                    <div className="day-entry">
                      <span className="day-mood" style={{ background: MOOD_COLORS[entry.mood] }}>{MOOD_EMOJIS[entry.mood]}</span>
                      {entry.wins.length > 0 && <span className="day-win">✓ {entry.wins[0].slice(0, 20)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="entries-list">
          {filteredEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📔</div>
              <h3>No journal entries yet</h3>
              <p>Start tracking your daily progress, mood, and time</p>
              <button className="btn-primary" onClick={() => handleNewEntry(new Date().toISOString().split('T')[0])}>Create First Entry</button>
            </div>
          ) : (
            filteredEntries.map(entry => (
              <article key={entry.id} className="entry-card">
                <div className="entry-header">
                  <div className="entry-date">
                    <span className="entry-day">{new Date(entry.date).getDate()}</span>
                    <span className="entry-month">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  </div>
                  <div className="entry-main">
                    <div className="entry-mood-row">
                      <span className="entry-mood" style={{ background: MOOD_COLORS[entry.mood] }}>{MOOD_EMOJIS[entry.mood]} {MOOD_LABELS[entry.mood]}</span>
                      <span className="entry-weekday">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                    </div>
                    {entry.wins.length > 0 && (
                      <div className="entry-wins">
                        {entry.wins.map((w, i) => <span key={i} className="win-chip">✓ {w}</span>)}
                      </div>
                    )}
                    {entry.blockers.length > 0 && (
                      <div className="entry-blockers">
                        {entry.blockers.map((b, i) => <span key={i} className="blocker-chip">⚠ {b}</span>)}
                      </div>
                    )}
                    {entry.notes && <p className="entry-notes">{entry.notes}</p>}
                    {Object.keys(entry.timeSpent).length > 0 && (
                      <div className="entry-time">
                        <span className="time-label">⏱ Time:</span>
                        {Object.entries(entry.timeSpent).map(([topic, mins]) => (
                          <span key={topic} className="time-chip">{topic}: {mins}m</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="entry-actions">
                    <button className="icon-btn" onClick={() => openEdit(entry)} title="Edit">✏️</button>
                    <button className="icon-btn danger" onClick={() => requestConfirm(entry.id)} title="Delete">🗑️</button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <h2>{editEntry ? 'Edit Journal Entry' : 'New Journal Entry'}</h2>
            <div className="form-grid">
              <label>
                <span>Date *</span>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </label>
              <label>
                <span>Mood *</span>
                <select value={form.mood} onChange={e => setForm({ ...form, mood: e.target.value as JournalEntry['mood'] })}>
                  {(Object.keys(MOOD_EMOJIS) as Array<keyof typeof MOOD_EMOJIS>).map(m => (
                    <option key={m} value={m}>{MOOD_EMOJIS[m]} {MOOD_LABELS[m]}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="section-card">
              <h3>✅ Wins</h3>
              {form.wins.map((w, i) => (
                <div key={i} className="item-row">
                  <input type="text" value={w} onChange={e => updateItem('wins', i, e.target.value)} placeholder="What went well today?" />
                  {form.wins.length > 1 && <button type="button" className="icon-btn danger" onClick={() => removeItem('wins', i)}>🗑️</button>}
                </div>
              ))}
              <button type="button" className="btn-secondary small" onClick={() => addItem('wins')}>+ Add Win</button>
            </div>
            <div className="section-card">
              <h3>⚠ Blockers</h3>
              {form.blockers.map((b, i) => (
                <div key={i} className="item-row">
                  <input type="text" value={b} onChange={e => updateItem('blockers', i, e.target.value)} placeholder="What got in the way?" />
                  {form.blockers.length > 1 && <button type="button" className="icon-btn danger" onClick={() => removeItem('blockers', i)}>🗑️</button>}
                </div>
              ))}
              <button type="button" className="btn-secondary small" onClick={() => addItem('blockers')}>+ Add Blocker</button>
            </div>
            <div className="section-card">
              <h3>📝 Notes</h3>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Free-form reflections, ideas, observations..." />
            </div>
            <div className="section-card">
              <h3>⏱ Time Spent by Topic</h3>
              <div className="time-input-row">
                <input type="text" value={form.timeTopic} onChange={e => setForm({ ...form, timeTopic: e.target.value })} placeholder="Topic (e.g. React, Grading, Research)" />
                <input type="number" value={form.timeMinutes} onChange={e => setForm({ ...form, timeMinutes: e.target.value })} placeholder="Minutes" min="1" max="480" style={{ width: '80px' }} />
                <button type="button" className="btn-primary" onClick={addTimeSpent}>Add</button>
              </div>
              {Object.keys(form.timeSpent).length > 0 && (
                <div className="time-spent-list">
                  {Object.entries(form.timeSpent).map(([topic, mins]) => (
                    <div key={topic} className="time-spent-item">
                      <span>{topic}</span>
                      <span>{mins} min</span>
                      <button type="button" className="icon-btn danger" onClick={() => removeTimeSpent(topic)}>🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              {editEntry && <button className="btn-danger" onClick={() => requestConfirm(editEntry.id)}>Delete</button>}
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save Entry</button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Journal Entry"
          message="Are you sure you want to delete this journal entry? This action cannot be undone."
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}