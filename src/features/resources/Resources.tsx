
import React, { useState } from 'react';
import { Resource } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './Resources.css';

type ResourceForm = { title: string; type: Resource['type']; course: string; tags: string };
const emptyForm: ResourceForm = { title: '', type: 'document', course: '', tags: '' };

export default function Resources() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (loading || !data) return <LoadingSkeleton rows={4} type="cards" />;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.course) errors.course = 'Please select a course';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await updateStore(prev => {
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      let updated: Resource[];
      if (editResource) {
        updated = prev.resources.map(r => r.id === editResource.id ? { ...editResource, ...form, tags: tagsArray } : r);
      } else {
        const newR: Resource = {
          id: 'r' + Date.now(),
          ...form,
          tags: tagsArray,
          dateAdded: new Date().toISOString().split('T')[0]
        };
        updated = [...prev.resources, newR];
      }
      return { ...prev, resources: updated };
    });
    setShowModal(false);
    setEditResource(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, resources: prev.resources.filter(r => r.id !== id) }));
  };

  const openEdit = (r: Resource) => {
    setEditResource(r);
    setForm({ title: r.title, type: r.type, course: r.course, tags: r.tags.join(', ') });
    setFormErrors({});
    setShowModal(true);
  };

  const openAdd = () => {
    setEditResource(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  const filtered = data.resources.filter(r => {
    const matchType = !filterType || r.type === filterType;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || 
                        r.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="resources-page">
      <div className="page-header">
        <div>
          <h1>📁 Resources</h1>
          <p className="page-subtitle">{data.resources.length} materials available</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Upload Resource</button>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search resources or tags…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="slide">Slides</option>
          <option value="document">Documents</option>
          <option value="code">Code</option>
          <option value="video">Videos</option>
          <option value="link">Links</option>
        </select>
      </div>

      <div className="resources-grid">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">📭</div>
            <h3>No resources found</h3>
            <p>Upload materials to share with your students</p>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="resource-card">
              <div className="resource-card-header">
                <span className="resource-type-badge">
                  {getTypeIcon(r.type)} {r.type}
                </span>
                <div className="resource-actions">
                  <button className="icon-btn" onClick={() => openEdit(r)}>✏️</button>
                  <button className="icon-btn danger" onClick={() => requestConfirm(r.id)}>🗑️</button>
                </div>
              </div>
              <h3 className="resource-title">{r.title}</h3>
              <p className="resource-course">{r.course}</p>
              <div className="resource-tags">
                {r.tags.map(tag => (
                  <span key={tag} className="resource-tag">#{tag}</span>
                ))}
              </div>
              <span className="resource-date">Added {new Date(r.dateAdded).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editResource ? 'Edit Resource' : 'Upload Resource'}</h2>
            <div className="form-grid">
              <label className="full-width">
                <span>Title *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Intro to React Slides"
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
                <span>Type</span>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Resource['type'] })}>
                  <option value="document">Document</option>
                  <option value="slide">Slide</option>
                  <option value="code">Code</option>
                  <option value="video">Video</option>
                  <option value="link">Link</option>
                </select>
              </label>
              <label className="full-width">
                <span>Tags (comma separated)</span>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. react, intro, week1"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>
                {editResource ? 'Save Changes' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Resource"
          message="Are you sure you want to delete this resource?"
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}

function getTypeIcon(type: string) {
  const icons: Record<string, string> = { slide: '📊', code: '💻', link: '🔗', document: '📄', video: '🎥' };
  return icons[type] || '📄';
}
