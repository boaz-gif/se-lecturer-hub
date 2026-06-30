
import React, { useState } from 'react';
import { Student } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './Students.css';

type StudentForm = { name: string; email: string; group: string; enrolledCourse: string; notes: string };
const emptyForm: StudentForm = { name: '', email: '', group: '', enrolledCourse: '', notes: '' };

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Students() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<StudentForm>>({});

  if (loading || !data) return <LoadingSkeleton rows={6} type="cards" />;

  const validate = (): boolean => {
    const errors: Partial<StudentForm> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (form.email && !validateEmail(form.email)) errors.email = 'Enter a valid email address';
    if (!form.enrolledCourse) errors.enrolledCourse = 'Please select a course';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await updateStore(prev => {
      let updated: Student[];
      if (editStudent) {
        updated = prev.students.map(s => s.id === editStudent.id ? { ...editStudent, ...form } : s);
      } else {
        updated = [...prev.students, { id: 's' + Date.now(), ...form }];
      }
      return { ...prev, students: updated };
    });
    setShowModal(false);
    setEditStudent(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, students: prev.students.filter(s => s.id !== id) }));
  };

  const openEdit = (student: Student) => {
    setEditStudent(student);
    setForm({ name: student.name, email: student.email, group: student.group, enrolledCourse: student.enrolledCourse, notes: student.notes });
    setFormErrors({});
    setShowModal(true);
  };

  const openAdd = () => {
    setEditStudent(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  const groups = [...new Set(data.students.map(s => s.group))].filter(Boolean);
  const filtered = data.students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.email.toLowerCase().includes(search.toLowerCase());
    const matchGroup = !filterGroup || s.group === filterGroup;
    return matchSearch && matchGroup;
  });

  return (
    <div className="students-page">
      <div className="page-header">
        <div>
          <h1>👥 Students</h1>
          <p className="page-subtitle">{data.students.length} students enrolled</p>
        </div>
        <button id="add-student-btn" className="btn-primary" onClick={openAdd}>+ Add Student</button>
      </div>

      <div className="filters-bar">
        <input
          id="student-search"
          type="text"
          className="search-input"
          placeholder="🔍 Search students…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
          <option value="">All Groups</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="students-grid">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">📭</div>
            <h3>No students found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          filtered.map(student => (
            <div key={student.id} className="student-card">
              <div className="student-card-header">
                <div className="student-avatar">
                  {student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="student-actions">
                  <button className="icon-btn" onClick={() => openEdit(student)} title="Edit">✏️</button>
                  <button className="icon-btn danger" onClick={() => requestConfirm(student.id)} title="Delete">🗑️</button>
                </div>
              </div>
              <h3 className="student-name">{student.name}</h3>
              <p className="student-email">{student.email || '—'}</p>
              <div className="student-meta">
                {student.group && <span className="tag">{student.group}</span>}
                {student.enrolledCourse && <span className="tag course">{student.enrolledCourse}</span>}
              </div>
              {student.notes && <p className="student-notes">📝 {student.notes}</p>}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editStudent ? 'Edit Student' : 'Add New Student'}</h2>
            <div className="form-grid">
              <label className="full-width">
                <span>Full Name *</span>
                <input
                  id="student-name-input"
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
                {formErrors.name && <div className="form-error">{formErrors.name}</div>}
              </label>
              <label>
                <span>Email</span>
                <input
                  id="student-email-input"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. john@uni.edu"
                />
                {formErrors.email && <div className="form-error">{formErrors.email}</div>}
              </label>
              <label>
                <span>Group</span>
                <input
                  type="text"
                  value={form.group}
                  onChange={e => setForm({ ...form, group: e.target.value })}
                  placeholder="e.g. Group A"
                />
              </label>
              <label className="full-width">
                <span>Course *</span>
                <select
                  id="student-course-select"
                  value={form.enrolledCourse}
                  onChange={e => setForm({ ...form, enrolledCourse: e.target.value })}
                >
                  <option value="">Select course</option>
                  {data.courses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {formErrors.enrolledCourse && <div className="form-error">{formErrors.enrolledCourse}</div>}
              </label>
              <label className="full-width">
                <span>Notes</span>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes…"
                  rows={3}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="student-save-btn" className="btn-primary" onClick={handleSave}>
                {editStudent ? 'Save Changes' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Student"
          message="Are you sure you want to delete this student? This action cannot be undone."
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}
