
import React, { useState } from 'react';
import { TimetableEvent } from '../../utils/store';
import { useStore } from '../../hooks/useStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './Timetable.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8am to 7pm
const TYPE_COLORS: Record<string, string> = {
  lecture: '#6366f1',
  lab: '#8b5cf6',
  seminar: '#10b981',
  meeting: '#ec4899',
};

type TimetableForm = { title: string; course: string; day: number; startHour: number; duration: number; room: string; type: TimetableEvent['type'] };
const emptyForm: TimetableForm = { title: '', course: '', day: 0, startHour: 9, duration: 1, room: '', type: 'lecture' };

export default function Timetable() {
  const { data, loading, updateStore } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState<TimetableEvent | null>(null);
  const { confirmId, requestConfirm, cancelConfirm } = useConfirm();
  const [form, setForm] = useState<TimetableForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (loading || !data) return <LoadingSkeleton rows={5} type="table" />;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.course) errors.course = 'Please select a course';
    if (form.duration <= 0) errors.duration = 'Duration must be > 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await updateStore(prev => {
      let updated: TimetableEvent[];
      if (editEvent) {
        updated = prev.timetable.map(e => e.id === editEvent.id ? { ...editEvent, ...form, color: TYPE_COLORS[form.type] } : e);
      } else {
        const newE: TimetableEvent = { id: 't' + Date.now(), ...form, color: TYPE_COLORS[form.type] };
        updated = [...prev.timetable, newE];
      }
      return { ...prev, timetable: updated };
    });
    setShowModal(false);
    setEditEvent(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleDelete = async (id: string) => {
    await updateStore(prev => ({ ...prev, timetable: prev.timetable.filter(e => e.id !== id) }));
  };

  const openEdit = (e: TimetableEvent) => {
    setEditEvent(e);
    setForm({ title: e.title, course: e.course, day: e.day, startHour: e.startHour, duration: e.duration, room: e.room, type: e.type });
    setFormErrors({});
    setShowModal(true);
  };

  const openAdd = () => {
    setEditEvent(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  return (
    <div className="timetable-page">
      <div className="page-header">
        <div>
          <h1>📅 Weekly Timetable</h1>
          <p className="page-subtitle">Manage your class schedule</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Event</button>
      </div>

      <div className="timetable-controls">
        <div className="legend">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <span key={type} className="legend-item">
              <span className="legend-dot" style={{ background: color }}></span>
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="timetable-grid">
        <div className="timetable-header">
          <div className="time-label"></div>
          {DAYS.map(day => <div key={day} className="day-label">{day}</div>)}
        </div>
        {HOURS.map(hour => (
          <div key={hour} className="timetable-row">
            <div className="time-label">{hour}:00</div>
            {DAYS.map((_, dayIdx) => {
              const events = data.timetable.filter(e => e.day === dayIdx && e.startHour <= hour && e.startHour + e.duration > hour);
              const startEvent = events.find(e => e.day === dayIdx && e.startHour === hour);
              return (
                <div key={dayIdx} className="timetable-cell">
                  {startEvent && (
                    <div
                      className="timetable-event"
                      style={{ background: startEvent.color, height: `calc(${startEvent.duration * 100}% + ${startEvent.duration - 1}px)` }}
                      onClick={() => openEdit(startEvent)}
                    >
                      <strong>{startEvent.title}</strong>
                      <span>{startEvent.room}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editEvent ? 'Edit Event' : 'Add New Event'}</h2>
            <div className="form-grid">
              <label className="full-width">
                <span>Title *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. SE 101 Lecture"
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
                <span>Day</span>
                <select value={form.day} onChange={e => setForm({ ...form, day: Number(e.target.value) })}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </label>
              <label>
                <span>Start Hour</span>
                <select value={form.startHour} onChange={e => setForm({ ...form, startHour: Number(e.target.value) })}>
                  {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </label>
              <label>
                <span>Duration (hours)</span>
                <input
                  type="number"
                  min="0.5"
                  max="6"
                  step="0.5"
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: Number(e.target.value) })}
                />
                {formErrors.duration && <div className="form-error">{formErrors.duration}</div>}
              </label>
              <label>
                <span>Room</span>
                <input
                  type="text"
                  value={form.room}
                  onChange={e => setForm({ ...form, room: e.target.value })}
                  placeholder="e.g. Room 201"
                />
              </label>
              <label>
                <span>Type</span>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as TimetableEvent['type'] })}>
                  <option value="lecture">Lecture</option>
                  <option value="lab">Lab</option>
                  <option value="seminar">Seminar</option>
                  <option value="meeting">Meeting</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              {editEvent && <button className="btn-danger" onClick={() => { requestConfirm(editEvent.id); setShowModal(false); }}>Delete</button>}
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
      {confirmId && (
        <ConfirmDialog
          title="Delete Event"
          message="Are you sure you want to delete this event?"
          onConfirm={() => { handleDelete(confirmId); cancelConfirm(); }}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  );
}
