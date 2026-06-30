
import React, { useState, useMemo } from 'react';
import { LabExercise, LabRubricItem } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './LabTracker.css';

const STATUS_LABELS = { planned: 'Planned', active: 'Active', completed: 'Completed', graded: 'Graded' };
const STATUS_COLORS = { planned: '#64748b', active: '#6366f1', completed: '#10b981', graded: '#8b5cf6' };
const STATUS_BG = { planned: 'rgba(100,116,139,0.2)', active: 'rgba(99,102,241,0.2)', completed: 'rgba(16,185,129,0.2)', graded: 'rgba(139,92,246,0.2)' };

type LabForm = {
  title: string;
  course: string;
  description: string;
  scheduledDate: string;
  rubric: LabRubricItem[];
  submissionsReceived: number;
  totalStudents: number;
  commonErrors: string[];
  status: LabExercise['status'];
};

const emptyForm: LabForm = {
  title: '', course: '', description: '', scheduledDate: new Date().toISOString().split('T')[0],
  rubric: [], submissionsReceived: 0, totalStudents: 0, commonErrors: [''], status: 'planned'
};

export default function LabTracker() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editLab, setEditLab] = useState<LabExercise | null>(null);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<LabForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredLabs = useMemo(() => {
    if (!data) return [];
    return data.labExercises
      .filter(l => !filterCourse || l.course === filterCourse)
      .filter(l => !filterStatus || l.status === filterStatus)
      .filter(l => !searchQuery || 
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.commonErrors.some(e => e.toLowerCase().includes(searchQuery.toLowerCase())))
      .sort((a, b) => {
        const statusOrder = { active: 0, planned: 1, completed: 2, graded: 3 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      });
  }, [data, filterCourse, filterStatus, searchQuery]);

  if (loading || !data) return <LoadingSkeleton rows={5} type="cards" />;

  const totalRubricPoints = (rubric: LabRubricItem[]) => rubric.reduce((sum, r) => sum + r.maxPoints, 0);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.course) errors.course = 'Please select a course';
    if (!form.scheduledDate) errors.scheduledDate = 'Scheduled Date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    
    await updateStore(prev => {
      let updatedLabs: LabExercise[];
      if (editLab) {
        updatedLabs = prev.labExercises.map(l => l.id === editLab.id ? { 
          ...editLab, ...form, commonErrors: form.commonErrors.filter(Boolean), updatedAt: now 
        } : l);
      } else {
        const newLab: LabExercise = {
          id: 'lb' + Date.now(), ...form, commonErrors: form.commonErrors.filter(Boolean),
          createdAt: now, updatedAt: now,
        };
        updatedLabs = [...prev.labExercises, newLab];
      }
      return { ...prev, labExercises: updatedLabs };
    });
    closeModal();
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, labExercises: prev.labExercises.filter(l => l.id !== id) }));
  };

  const openEdit = (lab: LabExercise) => {
    setEditLab(lab);
    setForm({
      title: lab.title, course: lab.course, description: lab.description, scheduledDate: lab.scheduledDate,
      rubric: lab.rubric.map(r => ({ ...r })), submissionsReceived: lab.submissionsReceived,
      totalStudents: lab.totalStudents, commonErrors: [...lab.commonErrors, ''], status: lab.status,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditLab(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const addRubricItem = () => setForm(prev => ({ ...prev, rubric: [...prev.rubric, { id: 'r' + Date.now(), criterion: '', maxPoints: 0, description: '' }] }));
  const removeRubricItem = (index: number) => setForm(prev => ({ ...prev, rubric: prev.rubric.filter((_, i) => i !== index) }));
  const updateRubricItem = (index: number, field: keyof LabRubricItem, value: string | number) => setForm(prev => ({ ...prev, rubric: prev.rubric.map((r, i) => i === index ? { ...r, [field]: value } : r) }));
  const addError = () => setForm(prev => ({ ...prev, commonErrors: [...prev.commonErrors, ''] }));
  const removeError = (index: number) => setForm(prev => ({ ...prev, commonErrors: prev.commonErrors.filter((_, i) => i !== index) }));
  const updateError = (index: number, value: string) => setForm(prev => ({ ...prev, commonErrors: prev.commonErrors.map((e, i) => i === index ? value : e) }));

  const activeLabs = data.labExercises.filter(l => l.status === 'active').length;
  const totalSubmissions = data.labExercises.reduce((sum, l) => sum + l.submissionsReceived, 0);
  const totalExpected = data.labExercises.reduce((sum, l) => sum + l.totalStudents, 0);
  const avgSubmissionRate = totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;

  return (
    <div className="labtracker-page">
      <div className="page-header">
        <div>
          <h1>🧪 Coding Lab Tracker</h1>
          <p className="page-subtitle">Track lab exercises per course with rubric, submissions, and common student errors</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditLab(null); setForm(emptyForm); setShowModal(true); }}>
          + New Lab
        </button>
      </div>

      <div className="stats-bar">
        <div className="stat-pill">
          <span className="stat-value" style={{ color: 'var(--accent)' }}>{activeLabs}</span>
          <span className="stat-label">Active Labs</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{totalSubmissions}/{totalExpected}</span>
          <span className="stat-label">Submissions</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{avgSubmissionRate}%</span>
          <span className="stat-label">Submission Rate</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{data.labExercises.length}</span>
          <span className="stat-label">Total Labs</span>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search labs by title, description, errors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="filter-group">
          <select className="filter-select" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
            <option value="">All Courses</option>
            {data.courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="graded">Graded</option>
          </select>
          <div className="view-toggle">
            <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>Cards</button>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>Table</button>
          </div>
        </div>
      </div>

      {viewMode === 'cards' && (
        <div className="labs-grid">
          {filteredLabs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧪</div>
              <h3>No lab exercises yet</h3>
              <p>Create your first coding lab with rubric and tracking</p>
              <button className="btn-primary" onClick={() => { setEditLab(null); setForm(emptyForm); setShowModal(true); }}>Create Lab</button>
            </div>
          ) : (
            filteredLabs.map(lab => (
              <article key={lab.id} className="lab-card" style={{ borderLeftColor: STATUS_COLORS[lab.status] }}>
                <div className="lab-header">
                  <div>
                    <h3 className="lab-title">{lab.title}</h3>
                    <span className="lab-course">{lab.course}</span>
                  </div>
                  <span className="lab-status" style={{ background: STATUS_BG[lab.status], color: STATUS_COLORS[lab.status] }}>{STATUS_LABELS[lab.status]}</span>
                </div>
                <p className="lab-description">{lab.description || 'No description'}</p>
                <div className="lab-meta">
                  <span className="lab-date">📅 {new Date(lab.scheduledDate).toLocaleDateString()}</span>
                  <span className="lab-rubric">📋 Rubric: {totalRubricPoints(lab.rubric)} pts ({lab.rubric.length} criteria)</span>
                </div>
                <div className="lab-progress">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${lab.totalStudents > 0 ? Math.round((lab.submissionsReceived / lab.totalStudents) * 100) : 0}%`, background: STATUS_COLORS[lab.status] }}></div>
                  </div>
                  <div className="progress-meta">
                    <span>{lab.submissionsReceived}/{lab.totalStudents} submissions</span>
                    <span>{lab.totalStudents > 0 ? Math.round((lab.submissionsReceived / lab.totalStudents) * 100) : 0}% received</span>
                  </div>
                </div>
                {lab.commonErrors.length > 0 && (
                  <div className="lab-errors">
                    <span className="errors-label">⚠ Common Errors:</span>
                    {lab.commonErrors.slice(0, 3).map((err, i) => (
                      <span key={i} className="error-chip">{err}</span>
                    ))}
                    {lab.commonErrors.length > 3 && <span className="error-chip more">+{lab.commonErrors.length - 3} more</span>}
                  </div>
                )}
                <div className="lab-actions">
                  <button className="icon-btn" onClick={() => openEdit(lab)} title="Edit">✏️</button>
                  <button className="icon-btn danger" onClick={() => requestConfirm(lab.id)} title="Delete">🗑️</button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="labs-table-container">
          {filteredLabs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧪</div>
              <h3>No lab exercises yet</h3>
              <p>Create your first coding lab with rubric and tracking</p>
              <button className="btn-primary" onClick={() => { setEditLab(null); setForm(emptyForm); setShowModal(true); }}>Create Lab</button>
            </div>
          ) : (
            <table className="labs-table">
              <thead>
                <tr>
                  <th>Lab</th>
                  <th>Course</th>
                  <th>Date</th>
                  <th>Rubric</th>
                  <th>Submissions</th>
                  <th>Status</th>
                  <th>Errors</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredLabs.map(lab => (
                  <tr key={lab.id}>
                    <td><div className="table-lab-title">{lab.title}</div></td>
                    <td><span className="lab-course">{lab.course}</span></td>
                    <td>{new Date(lab.scheduledDate).toLocaleDateString()}</td>
                    <td>{totalRubricPoints(lab.rubric)} pts / {lab.rubric.length} criteria</td>
                    <td>
                      <div className="table-progress">
                        <div className="progress-track-sm">
                          <div className="progress-fill" style={{ width: `${lab.totalStudents > 0 ? Math.round((lab.submissionsReceived / lab.totalStudents) * 100) : 0}%`, background: STATUS_COLORS[lab.status] }}></div>
                        </div>
                        <span>{lab.submissionsReceived}/{lab.totalStudents}</span>
                      </div>
                    </td>
                    <td><span className="lab-status" style={{ background: STATUS_BG[lab.status], color: STATUS_COLORS[lab.status] }}>{STATUS_LABELS[lab.status]}</span></td>
                    <td>
                      <span className="error-preview">{lab.commonErrors.slice(0, 2).join(', ')}{lab.commonErrors.length > 2 ? '...' : ''}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="icon-btn" onClick={() => openEdit(lab)}>✏️</button>
                        <button className="icon-btn danger" onClick={() => requestConfirm(lab.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <h2>{editLab ? 'Edit Lab Exercise' : 'New Lab Exercise'}</h2>
            
            <div className="form-grid">
              <label className="full-width">
                <span>Lab Title *</span>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Binary Search Tree Implementation" />
                {formErrors.title && <div className="form-error">{formErrors.title}</div>}
              </label>
              <label className="full-width">
                <span>Description</span>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Lab objectives, requirements, starter code..." />
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
                <span>Scheduled Date *</span>
                <input type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
                {formErrors.scheduledDate && <div className="form-error">{formErrors.scheduledDate}</div>}
              </label>
              <label>
                <span>Status *</span>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as LabExercise['status'] })}>
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="graded">Graded</option>
                </select>
              </label>
              <label>
                <span>Submissions Received</span>
                <input type="number" min="0" value={form.submissionsReceived} onChange={e => setForm({ ...form, submissionsReceived: parseInt(e.target.value) || 0 })} />
              </label>
              <label>
                <span>Total Students</span>
                <input type="number" min="0" value={form.totalStudents} onChange={e => setForm({ ...form, totalStudents: parseInt(e.target.value) || 0 })} />
              </label>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>📋 Rubric</h3>
                <button type="button" className="btn-secondary small" onClick={addRubricItem}>+ Add Criterion</button>
              </div>
              {form.rubric.map((item, idx) => (
                <div key={item.id} className="rubric-row">
                  <input type="text" value={item.criterion} onChange={e => updateRubricItem(idx, 'criterion', e.target.value)} placeholder="Criterion (e.g. Correctness, Code Style)" />
                  <input type="number" min="0" value={item.maxPoints} onChange={e => updateRubricItem(idx, 'maxPoints', parseInt(e.target.value) || 0)} placeholder="Points" style={{ width: '80px' }} />
                  <input type="text" value={item.description} onChange={e => updateRubricItem(idx, 'description', e.target.value)} placeholder="Description" />
                  <button type="button" className="icon-btn danger" onClick={() => removeRubricItem(idx)}>🗑️</button>
                </div>
              ))}
              {form.rubric.length > 0 && (
                <div className="rubric-total">Total: {form.rubric.reduce((sum, r) => sum + r.maxPoints, 0)} points</div>
              )}
              {form.rubric.length === 0 && <p className="empty-hint">Add rubric criteria to define grading structure</p>}
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>⚠ Common Student Errors</h3>
                <button type="button" className="btn-secondary small" onClick={addError}>+ Add Error</button>
              </div>
              {form.commonErrors.map((err, idx) => (
                <div key={idx} className="item-row">
                  <input type="text" value={err} onChange={e => updateError(idx, e.target.value)} placeholder="e.g. Off-by-one in loop bounds" />
                  {form.commonErrors.length > 1 && <button type="button" className="icon-btn danger" onClick={() => removeError(idx)}>🗑️</button>}
                </div>
              ))}
              {form.commonErrors.length === 1 && !form.commonErrors[0] && <p className="empty-hint">Track common mistakes to improve future teaching</p>}
            </div>

            <div className="modal-actions">
              {editLab && <button className="btn-danger" onClick={() => requestConfirm(editLab.id)}>Delete</button>}
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editLab ? 'Save Changes' : 'Create Lab'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Lab Exercise"
          message="Are you sure you want to delete this lab exercise? This action cannot be undone."
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}