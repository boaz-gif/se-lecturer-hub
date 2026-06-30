
import React, { useState } from 'react';
import { Assignment } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './Assignments.css';

type AssignmentForm = { title: string; course: string; dueDate: string; status: Assignment['status']; description: string; submissions: number; totalStudents: number; };
const emptyForm: AssignmentForm = { title: '', course: '', dueDate: '', status: 'draft', description: '', submissions: 0, totalStudents: 20 };

export default function Assignments() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editAssignment, setEditAssignment] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (loading || !data) return <LoadingSkeleton rows={4} type="list" />;

  const today = new Date().toISOString().split('T')[0];

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.course) errors.course = 'Please select a course';
    if (!form.dueDate) {
      errors.dueDate = 'Due date is required';
    } else if (!editAssignment && form.dueDate < today) {
      errors.dueDate = 'Due date cannot be in the past';
    }
    if (form.submissions < 0) errors.submissions = 'Submissions cannot be negative';
    if (form.totalStudents < 0) errors.totalStudents = 'Total students cannot be negative';
    if (form.submissions > form.totalStudents && form.totalStudents > 0) {
      errors.submissions = 'Submissions cannot exceed total students';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await updateStore(prev => {
      let updated: Assignment[];
      if (editAssignment) {
        updated = prev.assignments.map(a => a.id === editAssignment.id ? { ...editAssignment, ...form } : a);
      } else {
        const newA: Assignment = { id: 'a' + Date.now(), ...form };
        updated = [...prev.assignments, newA];
      }
      return { ...prev, assignments: updated };
    });
    setShowModal(false);
    setEditAssignment(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, assignments: prev.assignments.filter(a => a.id !== id) }));
  };

  const openEdit = (a: Assignment) => {
    setEditAssignment(a);
    setForm({ title: a.title, course: a.course, dueDate: a.dueDate, status: a.status, description: a.description, submissions: a.submissions, totalStudents: a.totalStudents });
    setFormErrors({});
    setShowModal(true);
  };

  const openAdd = () => {
    setEditAssignment(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  const filtered = data.assignments.filter(a => !filterStatus || a.status === filterStatus);

  return (
    <div className="assignments-page">
      <div className="page-header">
        <div>
          <h1>📝 Assignments</h1>
          <p className="page-subtitle">{data.assignments.length} total assignments</p>
        </div>
        <button id="new-assignment-btn" className="btn-primary" onClick={openAdd}>+ New Assignment</button>
      </div>

      <div className="filters-bar">
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="assignments-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No assignments found</h3>
            <p>Create a new assignment to get started</p>
            <button className="btn-primary" onClick={openAdd}>+ New Assignment</button>
          </div>
        ) : (
          filtered.map(a => {
            const progress = a.totalStudents > 0 ? Math.round((a.submissions / a.totalStudents) * 100) : 0;
            const daysLeft = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div key={a.id} className="assignment-card-full">
                <div className="assignment-card-top">
                  <div>
                    <h3>{a.title}</h3>
                    <span className="assignment-course-tag">{a.course}</span>
                  </div>
                  <div className="assignment-card-actions">
                    <span className={`status-badge ${a.status}`}>{a.status}</span>
                    <button className="icon-btn" onClick={() => openEdit(a)} title="Edit">✏️</button>
                    <button className="icon-btn danger" onClick={() => requestConfirm(a.id)} title="Delete">🗑️</button>
                  </div>
                </div>
                {a.description && <p className="assignment-desc">{a.description}</p>}
                <div className="assignment-stats">
                  <div className="stat-item">
                    <span className="stat-item-label">Due Date</span>
                    <span className="stat-item-value">{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-item-label">Days Left</span>
                    <span className={`stat-item-value ${daysLeft < 3 ? 'urgent' : ''}`}>
                      {daysLeft > 0 ? daysLeft : 'Overdue'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-item-label">Submissions</span>
                    <span className="stat-item-value">{a.submissions}/{a.totalStudents}</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="progress-text">{progress}% submitted</span>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editAssignment ? 'Edit Assignment' : 'New Assignment'}</h2>
            <div className="form-grid">
              <label className="full-width">
                <span>Title *</span>
                <input
                  id="assignment-title-input"
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. UML Diagrams Project"
                />
                {formErrors.title && <div className="form-error">{formErrors.title}</div>}
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
                <span>Status</span>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Assignment['status'] })}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label>
                <span>Due Date *</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                />
                {formErrors.dueDate && <div className="form-error">{formErrors.dueDate}</div>}
              </label>
              <label>
                <span>Total Students</span>
                <input
                  type="number"
                  min="0"
                  value={form.totalStudents}
                  onChange={e => setForm({ ...form, totalStudents: parseInt(e.target.value) || 0 })}
                />
                {formErrors.totalStudents && <div className="form-error">{formErrors.totalStudents}</div>}
              </label>
              {editAssignment && (
                <label>
                  <span>Submissions Received</span>
                  <input
                    type="number"
                    min="0"
                    value={form.submissions}
                    onChange={e => setForm({ ...form, submissions: parseInt(e.target.value) || 0 })}
                  />
                  {formErrors.submissions && <div className="form-error">{formErrors.submissions}</div>}
                </label>
              )}
              <label className="full-width">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Assignment description…"
                  rows={3}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="assignment-save-btn" className="btn-primary" onClick={handleSave}>
                {editAssignment ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Assignment"
          message="Are you sure you want to delete this assignment? This cannot be undone."
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}
