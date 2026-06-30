
import React, { useState } from 'react';
import { SmartGoal, GoalMilestone } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './SmartGoals.css';

const CATEGORIES = [
  { value: 'teaching', label: '📚 Teaching', color: '#6366f1' },
  { value: 'research', label: '🔬 Research', color: '#8b5cf6' },
  { value: 'admin', label: '📋 Admin', color: '#06b6d4' },
  { value: 'personal', label: '👤 Personal', color: '#10b981' },
  { value: 'professional-dev', label: '🎓 Prof. Dev.', color: '#f59e0b' },
];

const STATUS_COLORS: Record<SmartGoal['status'], string> = {
  active: '#10b981',
  completed: '#6366f1',
  paused: '#f59e0b',
  archived: '#64748b',
};

type SmartGoalForm = {
  title: string;
  description: string;
  course: string;
  category: SmartGoal['category'];
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  milestones: GoalMilestone[];
};

const emptyForm: SmartGoalForm = {
  title: '', description: '', course: '', category: 'teaching',
  specific: '', measurable: '', achievable: '', relevant: '', timeBound: '', milestones: []
};

export default function SmartGoals() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<SmartGoal | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<SmartGoalForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (loading || !data) return <LoadingSkeleton rows={4} type="cards" />;

  const filteredGoals = data.smartGoals
    .filter(g => !filterCategory || g.category === filterCategory)
    .filter(g => !filterStatus || g.status === filterStatus)
    .filter(g => !filterCourse || g.course === filterCourse)
    .filter(g => showCompleted || g.status !== 'completed')
    .sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return new Date(a.timeBound).getTime() - new Date(b.timeBound).getTime();
    });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.timeBound) errors.timeBound = 'Target Date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateProgress = (milestones: GoalMilestone[]): number => {
    if (milestones.length === 0) return 0;
    const completed = milestones.filter(m => m.completed).length;
    return Math.round((completed / milestones.length) * 100);
  };

  const handleSave = async () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    
    await updateStore(prev => {
      let updatedGoals: SmartGoal[];
      if (editGoal) {
        const updated = { ...editGoal, ...form, progress: calculateProgress(form.milestones), updatedAt: now };
        updatedGoals = prev.smartGoals.map(g => g.id === editGoal.id ? updated : g);
      } else {
        const newGoal: SmartGoal = { id: 'g' + Date.now(), ...form, progress: 0, status: 'active', createdAt: now, updatedAt: now };
        updatedGoals = [...prev.smartGoals, newGoal];
      }
      return { ...prev, smartGoals: updatedGoals };
    });
    closeModal();
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, smartGoals: prev.smartGoals.filter(g => g.id !== id) }));
  };

  const handleStatusChange = async (goal: SmartGoal, newStatus: SmartGoal['status']) => {
    await updateStore(prev => ({
      ...prev,
      smartGoals: prev.smartGoals.map(g => g.id === goal.id ? { ...g, status: newStatus, updatedAt: new Date().toISOString() } : g)
    }));
  };

  const openEdit = (goal: SmartGoal) => {
    setEditGoal(goal);
    setForm({
      title: goal.title, description: goal.description, course: goal.course, category: goal.category,
      specific: goal.specific, measurable: goal.measurable, achievable: goal.achievable,
      relevant: goal.relevant, timeBound: goal.timeBound, milestones: goal.milestones.map(m => ({ ...m })),
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditGoal(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleAddMilestone = () => {
    setForm(prev => ({
      ...prev,
      milestones: [...prev.milestones, { id: 'm' + Date.now(), goalId: '', title: '', description: '', targetDate: '', completed: false }],
    }));
  };

  const removeMilestone = (index: number) => {
    setForm(prev => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== index) }));
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueGoals = data.smartGoals.filter(g => g.status === 'active' && g.timeBound < today).length;
  const activeGoals = data.smartGoals.filter(g => g.status === 'active').length;
  const completedGoals = data.smartGoals.filter(g => g.status === 'completed').length;

  return (
    <div className="smartgoals-page">
      <div className="page-header">
        <div>
          <h1>🎯 Smart Goals</h1>
          <p className="page-subtitle">SMART goals per course + personal — milestones, progress, accountability</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditGoal(null); setForm(emptyForm); setShowModal(true); }}>
          + New Goal
        </button>
      </div>

      <div className="stats-bar">
        <div className="stat-pill">
          <span className="stat-value">{activeGoals}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value" style={{ color: 'var(--success)' }}>{completedGoals}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value" style={{ color: 'var(--danger)' }}>{overdueGoals}</span>
          <span className="stat-label">Overdue</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{data.smartGoals.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      <div className="filters-bar">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="filter-select">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="filter-select">
          <option value="">All Courses</option>
          <option value="">Personal (no course)</option>
          {data.courses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="filter-checkbox">
          <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />
          Show Completed
        </label>
      </div>

      <div className="goals-grid">
        {filteredGoals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No goals yet</h3>
            <p>Create your first SMART goal to start tracking progress</p>
            <button className="btn-primary" onClick={() => { setEditGoal(null); setForm(emptyForm); setShowModal(true); }}>
              Create Goal
            </button>
          </div>
        ) : (
          filteredGoals.map(goal => (
            <article key={goal.id} className="goal-card" style={{ borderLeftColor: CATEGORIES.find(c => c.value === goal.category)?.color }}>
              <div className="goal-header">
                <div className="goal-title-row">
                  <h3 className="goal-title">{goal.title}</h3>
                  <span className={`goal-status status-${goal.status}`}>{goal.status}</span>
                </div>
                {goal.course && <span className="goal-course">{goal.course}</span>}
                <p className="goal-description">{goal.description}</p>
              </div>

              <div className="smart-badges">
                <span className={`smart-badge${goal.specific ? ' checked' : ''}`} title="Specific">{goal.specific ? '✓ S' : 'S'}</span>
                <span className={`smart-badge${goal.measurable ? ' checked' : ''}`} title="Measurable">{goal.measurable ? '✓ M' : 'M'}</span>
                <span className={`smart-badge${goal.achievable ? ' checked' : ''}`} title="Achievable">{goal.achievable ? '✓ A' : 'A'}</span>
                <span className={`smart-badge${goal.relevant ? ' checked' : ''}`} title="Relevant">{goal.relevant ? '✓ R' : 'R'}</span>
                <span className={`smart-badge${goal.timeBound ? ' checked' : ''}`} title="Time-bound">{goal.timeBound ? '✓ T' : 'T'}</span>
              </div>

              <div className="goal-progress">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${goal.progress}%`, background: STATUS_COLORS[goal.status] }}></div>
                </div>
                <div className="progress-meta">
                  <span>{goal.progress}% complete</span>
                  <span>Target: {new Date(goal.timeBound).toLocaleDateString()}</span>
                  {goal.milestones.length > 0 && (
                    <span>{goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} milestones</span>
                  )}
                </div>
              </div>

              {goal.milestones.length > 0 && (
                <div className="milestones-preview">
                  {goal.milestones.slice(0, 3).map(ms => (
                    <div key={ms.id} className={`milestone-dot ${ms.completed ? 'done' : ''}`}>
                      <span className="milestone-title">{ms.title}</span>
                      <span className="milestone-date">{ms.targetDate ? new Date(ms.targetDate).toLocaleDateString() : 'No date'}</span>
                    </div>
                  ))}
                  {goal.milestones.length > 3 && <span className="more-milestones">+{goal.milestones.length - 3} more</span>}
                </div>
              )}

              <div className="goal-actions">
                <button className="icon-btn" onClick={() => handleStatusChange(goal, goal.status === 'active' ? 'paused' : 'active')} title={goal.status === 'active' ? 'Pause' : 'Activate'}>
                  {goal.status === 'active' ? '⏸️' : '▶️'}
                </button>
                <button className="icon-btn" onClick={() => openEdit(goal)} title="Edit">✏️</button>
                <button className="icon-btn danger" onClick={() => requestConfirm(goal.id)} title="Delete">🗑️</button>
              </div>
            </article>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <h2>{editGoal ? 'Edit SMART Goal' : 'Create SMART Goal'}</h2>
            
            <div className="form-grid">
              <label className="full-width">
                <span>Goal Title *</span>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Complete 3 code-along labs for DSA by end of term" />
                {formErrors.title && <div className="form-error">{formErrors.title}</div>}
              </label>
              <label className="full-width">
                <span>Description</span>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Brief overview..." />
              </label>
              <label>
                <span>Course (optional)</span>
                <select value={form.course} onChange={e => setForm({...form, course: e.target.value})}>
                  <option value="">Personal Goal</option>
                  {data.courses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>
                <span>Category</span>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value as SmartGoal['category']})}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label className="full-width">
                <span>Target Date *</span>
                <input type="date" value={form.timeBound} onChange={e => setForm({...form, timeBound: e.target.value})} />
                {formErrors.timeBound && <div className="form-error">{formErrors.timeBound}</div>}
              </label>
            </div>

            <div className="smart-section">
              <h3>SMART Breakdown</h3>
              <div className="smart-grid">
                <label>
                  <span>Specific — What exactly?</span>
                  <textarea value={form.specific} onChange={e => setForm({...form, specific: e.target.value})} rows={2} placeholder="I will complete 3 code-along labs..." />
                </label>
                <label>
                  <span>Measurable — How will you measure?</span>
                  <textarea value={form.measurable} onChange={e => setForm({...form, measurable: e.target.value})} rows={2} placeholder="3 labs completed..." />
                </label>
                <label>
                  <span>Achievable — Is it realistic?</span>
                  <textarea value={form.achievable} onChange={e => setForm({...form, achievable: e.target.value})} rows={2} placeholder="2 hrs/week allocated..." />
                </label>
                <label>
                  <span>Relevant — Why does this matter?</span>
                  <textarea value={form.relevant} onChange={e => setForm({...form, relevant: e.target.value})} rows={2} placeholder="Improves my teaching demos..." />
                </label>
                <label className="full-width">
                  <span>Time-bound — Deadline (also above)</span>
                  <input type="date" value={form.timeBound} onChange={e => setForm({...form, timeBound: e.target.value})} />
                </label>
              </div>
            </div>

            <div className="milestones-section">
              <div className="section-header">
                <h3>Milestones</h3>
                <button type="button" className="btn-secondary" onClick={handleAddMilestone}>+ Add Milestone</button>
              </div>
              {form.milestones.map((ms, idx) => (
                <div key={ms.id} className="milestone-row">
                  <input type="text" value={ms.title} onChange={e => setForm({...form, milestones: form.milestones.map((m, i) => i === idx ? {...m, title: e.target.value} : m)})} placeholder="Milestone title" />
                  <input type="date" value={ms.targetDate} onChange={e => setForm({...form, milestones: form.milestones.map((m, i) => i === idx ? {...m, targetDate: e.target.value} : m)})} />
                  <button type="button" className="icon-btn danger" onClick={() => removeMilestone(idx)}>🗑️</button>
                </div>
              ))}
              {form.milestones.length === 0 && <p className="empty-hint">Add milestones to break your goal into trackable steps</p>}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editGoal ? 'Save Changes' : 'Create Goal'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Goal"
          message="Are you sure you want to delete this SMART goal? All milestones will be lost. This action cannot be undone."
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}