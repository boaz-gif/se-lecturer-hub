
import React, { useState, useEffect } from 'react';
import { ViewType } from '../App';
import { getStore, AppData } from '../utils/store';
import LoadingSkeleton from './ui/LoadingSkeleton';
import './Dashboard.css';

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    getStore().then(setData);
  }, []);

  if (!data) return <LoadingSkeleton rows={4} type="cards" />;

  // getDay() returns 0=Sunday … 6=Saturday
  // Store day 0=Monday … 4=Friday (5-day week), so convert:
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, …
  // Map JS day to store index (Mon=0 … Fri=4). Sun/Sat → no classes.
  const storeDay = jsDay === 0 ? -1 : jsDay - 1; // -1 means Sunday

  const todayEvents = storeDay >= 0 ? data.timetable.filter(e => e.day === storeDay) : [];
  const activeAssignments = data.assignments.filter(a => a.status === 'active');
  const pendingSubmissions = activeAssignments.reduce((sum, a) => sum + (a.totalStudents - a.submissions), 0);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  // jsDay 1=Mon→index0 … jsDay 7=Sun→index6
  const todayName = dayNames[(jsDay + 6) % 7];

  const activeTasks = data.personalTasks?.filter(t => t.status !== 'done').length ?? 0;
  const activeGoals = data.smartGoals?.filter(g => g.status === 'active').length ?? 0;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome back, {data.userName} 👋</h1>
          <p className="dashboard-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => onNavigate('students')} role="button" tabIndex={0} title="View Students">
          <div className="stat-icon students-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">{data.students.length}</span>
            <span className="stat-label">Students</span>
          </div>
        </div>
        <div className="stat-card" onClick={() => onNavigate('assignments')} role="button" tabIndex={0} title="View Assignments">
          <div className="stat-icon assignments-icon">📝</div>
          <div className="stat-info">
            <span className="stat-value">{activeAssignments.length}</span>
            <span className="stat-label">Active Assignments</span>
          </div>
        </div>
        <div className="stat-card" onClick={() => onNavigate('tasks')} role="button" tabIndex={0} title="View Tasks">
          <div className="stat-icon pending-icon">✅</div>
          <div className="stat-info">
            <span className="stat-value">{activeTasks}</span>
            <span className="stat-label">Pending Tasks</span>
          </div>
        </div>
        <div className="stat-card" onClick={() => onNavigate('smartgoals')} role="button" tabIndex={0} title="View Goals">
          <div className="stat-icon resources-icon">🎯</div>
          <div className="stat-info">
            <span className="stat-value">{activeGoals}</span>
            <span className="stat-label">Active Goals</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-section today-schedule">
          <h2>📅 Today's Schedule</h2>
          <p className="section-subtitle">{todayName}</p>
          {todayEvents.length === 0 ? (
            <div className="empty-state-mini">
              <p>No classes scheduled today. Enjoy the break! ☕</p>
            </div>
          ) : (
            <div className="event-list">
              {todayEvents.map(event => (
                <div key={event.id} className="event-card" style={{ borderLeftColor: event.color }}>
                  <div className="event-time">
                    <span className="event-hour">{event.startHour}:00</span>
                    <span className="event-duration">{event.duration}h</span>
                  </div>
                  <div className="event-details">
                    <h3>{event.title}</h3>
                    <p>{event.course}</p>
                    <span className="event-room">📍 {event.room}</span>
                  </div>
                  <span className={`event-type-badge ${event.type}`}>{event.type}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section recent-assignments">
          <h2>📝 Active Assignments</h2>
          <p className="section-subtitle">Track submission progress</p>
          {activeAssignments.length === 0 ? (
            <div className="empty-state-mini">
              <p>No active assignments. Add one to get started.</p>
            </div>
          ) : (
            <div className="assignment-list">
              {activeAssignments.map(a => {
                const progress = a.totalStudents > 0 ? Math.round((a.submissions / a.totalStudents) * 100) : 0;
                return (
                  <div key={a.id} className="assignment-card">
                    <div className="assignment-header">
                      <h3>{a.title}</h3>
                      <span className="assignment-course">{a.course}</span>
                    </div>
                    <div className="assignment-meta">
                      <span>📅 Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                      <span>{a.submissions}/{a.totalStudents} submitted</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="progress-text">{progress}% complete</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-section quick-actions">
          <h2>⚡ Quick Actions</h2>
          <div className="action-grid">
            <button id="qa-add-student" className="action-btn" onClick={() => onNavigate('students')}>
              <span>👤</span> Add Student
            </button>
            <button id="qa-new-assignment" className="action-btn" onClick={() => onNavigate('assignments')}>
              <span>📄</span> New Assignment
            </button>
            <button id="qa-schedule-class" className="action-btn" onClick={() => onNavigate('timetable')}>
              <span>🕐</span> Schedule Class
            </button>
            <button id="qa-write-notes" className="action-btn" onClick={() => onNavigate('lecturenotes')}>
              <span>📓</span> Write Notes
            </button>
            <button id="qa-log-journal" className="action-btn" onClick={() => onNavigate('journal')}>
              <span>📔</span> Daily Journal
            </button>
            <button id="qa-set-goal" className="action-btn" onClick={() => onNavigate('smartgoals')}>
              <span>🎯</span> Set SMART Goal
            </button>
          </div>
        </section>

        <section className="dashboard-section recent-resources">
          <h2>📁 Recent Resources</h2>
          <p className="section-subtitle">Latest uploads</p>
          <div className="resource-list-mini">
            {data.resources.slice(-5).reverse().map(r => (
              <div key={r.id} className="resource-item-mini">
                <span className="resource-type-icon">{getTypeIcon(r.type)}</span>
                <div className="resource-info-mini">
                  <h4>{r.title}</h4>
                  <p>{r.course}</p>
                </div>
                <span className="resource-date">{new Date(r.dateAdded).toLocaleDateString()}</span>
              </div>
            ))}
            {data.resources.length === 0 && (
              <div className="empty-state-mini"><p>No resources yet.</p></div>
            )}
          </div>
        </section>
      </div>

      {pendingSubmissions > 0 && (
        <div className="dashboard-alert" onClick={() => onNavigate('assignments')}>
          ⚠️ <strong>{pendingSubmissions}</strong> pending submissions across active assignments
          <span className="alert-cta">View →</span>
        </div>
      )}
    </div>
  );
}

function getTypeIcon(type: string) {
  const icons: Record<string, string> = { slide: '📊', code: '💻', link: '🔗', document: '📄', video: '🎥' };
  return icons[type] || '📄';
}
