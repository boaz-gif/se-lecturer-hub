
import React, { useState } from 'react';
import { LectureNote } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './LectureNotes.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type NoteForm = {
  title: string;
  content: string;
  course: string;
  topic: string;
  sessionDate: string;
  timetableEventId: string;
  tags: string;
};

const emptyForm: NoteForm = {
  title: '', content: '', course: '', topic: '',
  sessionDate: new Date().toISOString().split('T')[0],
  timetableEventId: '', tags: ''
};

export default function LectureNotes() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState<LectureNote | null>(null);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'course' | 'topic'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<NoteForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (loading || !data) return <LoadingSkeleton rows={5} type="cards" />;

  const filteredNotes = data.lectureNotes
    .filter(n => !filterCourse || n.course === filterCourse)
    .filter(n => !filterTopic || n.topic.toLowerCase().includes(filterTopic.toLowerCase()))
    .filter(n => !searchQuery || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'course') return a.course.localeCompare(b.course);
      return a.topic.localeCompare(b.topic);
    });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.course) errors.course = 'Please select a course';
    if (!form.topic.trim()) errors.topic = 'Topic is required';
    if (!form.sessionDate) errors.sessionDate = 'Session Date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    
    await updateStore(prev => {
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      let updatedNotes: LectureNote[];
      if (editNote) {
        updatedNotes = prev.lectureNotes.map(n => n.id === editNote.id ? { ...editNote, ...form, tags: tagsArray, updatedAt: now } : n);
      } else {
        const newNote: LectureNote = { id: 'n' + Date.now(), ...form, tags: tagsArray, createdAt: now, updatedAt: now };
        updatedNotes = [...prev.lectureNotes, newNote];
      }
      return { ...prev, lectureNotes: updatedNotes };
    });
    closeModal();
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, lectureNotes: prev.lectureNotes.filter(n => n.id !== id) }));
  };

  const openEdit = (note: LectureNote) => {
    setEditNote(note);
    setForm({
      title: note.title, content: note.content, course: note.course, topic: note.topic,
      sessionDate: note.sessionDate, timetableEventId: note.timetableEventId || '', tags: note.tags.join(', ')
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditNote(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  return (
    <div className="lecturenotes-page">
      <div className="page-header">
        <div>
          <h1>📓 Lecture Notes</h1>
          <p className="page-subtitle">Rich notes linked to timetable sessions — searchable by topic, course, date</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditNote(null); setForm(emptyForm); setShowModal(true); }}>
          + New Note
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search notes by title, content, topic, tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select className="filter-select" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
            <option value="">All Courses</option>
            {data.courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
            <option value="">All Topics</option>
            {Array.from([...new Set(data.lectureNotes.map(n => n.topic))]).filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="date">Newest First</option>
            <option value="title">Title A-Z</option>
            <option value="course">Course</option>
            <option value="topic">Topic</option>
          </select>
        </div>
        <div className="view-toggle">
          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid View">⊞</button>
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="List View">☰</button>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📓</div>
          <h3>No lecture notes yet</h3>
          <p>Create your first note linked to a timetable session</p>
          <button className="btn-primary" onClick={() => { setEditNote(null); setForm(emptyForm); setShowModal(true); }}>
            Create Note
          </button>
        </div>
      ) : (
        <div className={`notes-${viewMode}`}>
          {viewMode === 'grid' ? (
            <div className="notes-grid">
              {filteredNotes.map(note => (
                <article key={note.id} className="note-card" onClick={() => openEdit(note)}>
                  <div className="note-header">
                    <span className="note-course">{note.course}</span>
                    <span className="note-date">{new Date(note.sessionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <h3 className="note-title">{note.title}</h3>
                  <p className="note-topic">📍 {note.topic}</p>
                  <div className="note-tags">
                    {note.tags.slice(0, 4).map(tag => <span key={tag} className="note-tag">{tag}</span>)}
                    {note.tags.length > 4 && <span className="note-tag more">+{note.tags.length - 4}</span>}
                  </div>
                  <div className="note-meta">
                    <span className="note-preview">{note.content.slice(0, 120)}...</span>
                    {note.timetableEventId && <span className="linked-badge">🔗 Linked</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="notes-list">
              {filteredNotes.map(note => (
                <div key={note.id} className="note-row" onClick={() => openEdit(note)}>
                  <div className="note-col-date">
                    <span className="note-day">{new Date(note.sessionDate).getDate()}</span>
                    <span className="note-month">{new Date(note.sessionDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                  </div>
                  <div className="note-col-main">
                    <div className="note-row-top">
                      <span className="note-course">{note.course}</span>
                      <span className="note-topic">{note.topic}</span>
                    </div>
                    <h4 className="note-title">{note.title}</h4>
                    <div className="note-tags-row">
                      {note.tags.slice(0, 3).map(tag => <span key={tag} className="note-tag">{tag}</span>)}
                      {note.tags.length > 3 && <span className="note-tag more">+{note.tags.length - 3}</span>}
                    </div>
                  </div>
                  <div className="note-col-preview">
                    <span className="note-preview">{note.content.slice(0, 80)}...</span>
                    {note.timetableEventId && <span className="linked-badge">🔗</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <h2>{editNote ? 'Edit Lecture Note' : 'New Lecture Note'}</h2>
            <div className="form-grid">
              <label className="full-width">
                <span>Title *</span>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Introduction to Microservices Architecture" />
                {formErrors.title && <div className="form-error">{formErrors.title}</div>}
              </label>
              <label className="full-width">
                <span>Topic *</span>
                <input type="text" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Microservices Patterns, Service Discovery" />
                {formErrors.topic && <div className="form-error">{formErrors.topic}</div>}
              </label>
              <label>
                <span>Course *</span>
                <select value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}>
                  <option value="">Select course</option>
                  {data.courses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {formErrors.course && <div className="form-error">{formErrors.course}</div>}
              </label>
              <label>
                <span>Session Date *</span>
                <input type="date" value={form.sessionDate} onChange={e => setForm({ ...form, sessionDate: e.target.value })} />
                {formErrors.sessionDate && <div className="form-error">{formErrors.sessionDate}</div>}
              </label>
              <label className="full-width">
                <span>Linked Timetable Event</span>
                <select value={form.timetableEventId} onChange={e => setForm({ ...form, timetableEventId: e.target.value })}>
                  <option value="">None (standalone note)</option>
                  {data.timetable.map(e => (
                    <option key={e.id} value={e.id}>
                      {DAYS[e.day]} {e.startHour}:00 — {e.title} ({e.course})
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                <span>Tags (comma-separated)</span>
                <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="architecture, patterns, distributed-systems" />
              </label>
            </div>
            
            <div className="editor-section">
              <label className="full-width editor-label">
                <span>Content (Markdown supported)</span>
                <textarea
                  className="markdown-editor"
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  placeholder="# Heading\n\n## Subheading\n\n- Bullet points\n- **Bold** text"
                />
              </label>
            </div>

            <div className="modal-actions">
              {editNote && <button className="btn-danger" onClick={() => { requestConfirm(editNote.id); closeModal(); }}>Delete</button>}
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save Note</button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Note"
          message="Are you sure you want to delete this lecture note? This action cannot be undone."
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}