
import React, { useState, useMemo } from 'react';
import { PersonalTask } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './Tasks.css';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER = { todo: 0, 'in-progress': 1, review: 2, blocked: 3, done: 4 };

const PRIORITY_COLORS = { urgent: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' };
const PRIORITY_LABELS = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
const STATUS_LABELS = { todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', blocked: 'Blocked', done: 'Done' };
const STATUS_COLORS = { todo: '#64748b', 'in-progress': '#6366f1', review: '#8b5cf6', blocked: '#ef4444', done: '#10b981' };

type TaskForm = {
  title: string;
  description: string;
  priority: PersonalTask['priority'];
  status: PersonalTask['status'];
  dueDate: string;
  course: string;
  tags: string;
};

const emptyForm: TaskForm = {
  title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', course: '', tags: ''
};

export default function Tasks() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<PersonalTask | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return data.personalTasks
      .filter(t => !filterStatus || t.status === filterStatus)
      .filter(t => !filterPriority || t.priority === filterPriority)
      .filter(t => !filterCourse || t.course === filterCourse)
      .filter(t => !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [data, filterStatus, filterPriority, filterCourse, searchQuery]);

  const boardColumns = useMemo(() => {
    const statuses: PersonalTask['status'][] = ['todo', 'in-progress', 'review', 'blocked', 'done'];
    return statuses.map(status => ({
      status, label: STATUS_LABELS[status], color: STATUS_COLORS[status],
      tasks: filteredTasks.filter(t => t.status === status),
    }));
  }, [filteredTasks]);

  if (loading || !data) return <LoadingSkeleton rows={5} type="cards" />;

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = data.personalTasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < today).length;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    await updateStore(prev => {
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      let updatedTasks: PersonalTask[];
      if (editTask) {
        updatedTasks = prev.personalTasks.map(t => t.id === editTask.id ? { 
          ...editTask, ...form, tags: tagsArray, updatedAt: now, 
          completedAt: form.status === 'done' && editTask.status !== 'done' ? now : editTask.completedAt 
        } : t);
      } else {
        const newTask: PersonalTask = {
          id: 'tk' + Date.now(), ...form, tags: tagsArray, createdAt: now, updatedAt: now,
          completedAt: form.status === 'done' ? now : undefined,
        };
        updatedTasks = [...prev.personalTasks, newTask];
      }
      return { ...prev, personalTasks: updatedTasks };
    });
    closeModal();
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, personalTasks: prev.personalTasks.filter(t => t.id !== id) }));
  };

  const openEdit = (task: PersonalTask) => {
    setEditTask(task);
    setForm({
      title: task.title, description: task.description, priority: task.priority,
      status: task.status, dueDate: task.dueDate || '', course: task.course || '', tags: task.tags.join(', '),
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTask(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleNewTask = (status: PersonalTask['status']) => {
    setEditTask(null);
    setForm({ ...emptyForm, status });
    setShowModal(true);
  };

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1>✅ Task Manager</h1>
          <p className="page-subtitle">Personal tasks — grading, prep, admin, research with priorities, due dates, status</p>
        </div>
        <button className="btn-primary" onClick={() => handleNewTask('todo')}>
          + New Task
        </button>
      </div>

      <div className="stats-bar">
        <div className="stat-pill">
          <span className="stat-value">{data.personalTasks.filter(t => t.status !== 'done').length}</span>
          <span className="stat-label">Open</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value" style={{ color: 'var(--danger)' }}>{overdueCount}</span>
          <span className="stat-label">Overdue</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value" style={{ color: 'var(--success)' }}>{data.personalTasks.filter(t => t.status === 'done').length}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{data.personalTasks.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search tasks by title, description, tags..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="filter-group">
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
          <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="filter-select" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
            <option value="">All Courses</option>
            <option value="">No Course (Personal)</option>
            {data.courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="view-toggle">
            <button className={viewMode === 'board' ? 'active' : ''} onClick={() => setViewMode('board')}>⊞ Board</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>☰ List</button>
          </div>
        </div>
      </div>

      {viewMode === 'board' && (
        <div className="board-view">
          {boardColumns.map(col => (
            <div key={col.status} className="board-column">
              <div className="column-header" style={{ borderBottomColor: col.color }}>
                <div className="column-title-row">
                  <h3 className="column-title">{col.label}</h3>
                  <span className="column-count">{col.tasks.length}</span>
                </div>
                <button className="add-task-btn" onClick={() => handleNewTask(col.status)}>+</button>
              </div>
              <div className="column-tasks">
                {col.tasks.length === 0 ? (
                  <div className="column-empty">Drop tasks here</div>
                ) : (
                  col.tasks.map(task => (
                    <article key={task.id} className="task-card" style={{ borderLeftColor: PRIORITY_COLORS[task.priority] }}>
                      <div className="task-header">
                        <h4 className="task-title">{task.title}</h4>
                        <span className="task-priority" style={{ background: PRIORITY_COLORS[task.priority] }}>{PRIORITY_LABELS[task.priority]}</span>
                      </div>
                      {task.description && <p className="task-description">{task.description}</p>}
                      <div className="task-meta">
                        {task.course && <span className="task-course">{task.course}</span>}
                        {task.dueDate && (
                          <span className={`task-due ${task.dueDate < today && task.status !== 'done' ? 'overdue' : ''}`}>
                            📅 {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {task.tags.length > 0 && (
                        <div className="task-tags">
                          {task.tags.slice(0, 3).map(tag => <span key={tag} className="task-tag">{tag}</span>)}
                          {task.tags.length > 3 && <span className="task-tag more">+{task.tags.length - 3}</span>}
                        </div>
                      )}
                      <div className="task-actions">
                        <button className="icon-btn" onClick={() => openEdit(task)}>✏️</button>
                        <button className="icon-btn danger" onClick={() => requestConfirm(task.id)}>🗑️</button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="tasks-list">
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>No tasks yet</h3>
              <p>Create your first task to start managing your workload</p>
              <button className="btn-primary" onClick={() => handleNewTask('todo')}>Create Task</button>
            </div>
          ) : (
            filteredTasks.map(task => (
              <article key={task.id} className="task-row" style={{ borderLeftColor: PRIORITY_COLORS[task.priority] }}>
                <div className="task-col-main">
                  <div className="task-row-top">
                    <h4 className="task-title">{task.title}</h4>
                    <span className="task-priority" style={{ background: PRIORITY_COLORS[task.priority] }}>{PRIORITY_LABELS[task.priority]}</span>
                    <span className="task-status" style={{ background: STATUS_COLORS[task.status] }}>{STATUS_LABELS[task.status]}</span>
                  </div>
                  {task.description && <p className="task-description">{task.description}</p>}
                  <div className="task-meta-row">
                    {task.course && <span className="task-course">{task.course}</span>}
                    {task.dueDate && (
                      <span className={`task-due ${task.dueDate < today && task.status !== 'done' ? 'overdue' : ''}`}>
                        📅 {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {task.tags.length > 0 && (
                      <span className="task-tags-inline">
                        {task.tags.slice(0, 3).map(tag => <span key={tag} className="task-tag">{tag}</span>)}
                        {task.tags.length > 3 && <span className="task-tag more">+{task.tags.length - 3}</span>}
                      </span>
                    )}
                  </div>
                </div>
                <div className="task-col-actions">
                  <button className="icon-btn" onClick={() => openEdit(task)}>✏️</button>
                  <button className="icon-btn danger" onClick={() => requestConfirm(task.id)}>🗑️</button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editTask ? 'Edit Task' : 'New Task'}</h2>
            <div className="form-grid">
              <label className="full-width">
                <span>Title *</span>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Grade SE 101 UML diagrams" />
                {formErrors.title && <div className="form-error">{formErrors.title}</div>}
              </label>
              <label className="full-width">
                <span>Description</span>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Details, links, context..." />
              </label>
              <label>
                <span>Priority *</span>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as PersonalTask['priority'] })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label>
                <span>Status *</span>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as PersonalTask['status'] })}>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <label>
                <span>Due Date</span>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </label>
              <label>
                <span>Course (optional)</span>
                <select value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}>
                  <option value="">Personal / No Course</option>
                  {data.courses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="full-width">
                <span>Tags (comma-separated)</span>
                <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="grading, urgent, se101, uml" />
              </label>
            </div>
            <div className="modal-actions">
              {editTask && <button className="btn-danger" onClick={() => requestConfirm(editTask.id)}>Delete</button>}
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editTask ? 'Save Changes' : 'Create Task'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}