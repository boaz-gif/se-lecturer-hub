
import React from 'react';
import { ViewType } from '../App';
import { getInitials } from '../utils/store';
import './Sidebar.css';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  userName: string;
}

const navItems: { view: ViewType; icon: string; label: string }[] = [
  { view: 'dashboard',   icon: '📊', label: 'Dashboard' },
  { view: 'timetable',   icon: '📅', label: 'Timetable' },
  { view: 'students',    icon: '👥', label: 'Students' },
  { view: 'assignments', icon: '📝', label: 'Assignments' },
  { view: 'resources',   icon: '📁', label: 'Resources' },
  { view: 'analytics',   icon: '📈', label: 'Analytics' },
];

const productivityItems: { view: ViewType; icon: string; label: string }[] = [
  { view: 'smartgoals',     icon: '🎯', label: 'Smart Goals' },
  { view: 'lecturenotes',   icon: '📓', label: 'Lecture Notes' },
  { view: 'journal',        icon: '📔', label: 'Progress Journal' },
  { view: 'tasks',          icon: '✅', label: 'Task Manager' },
  { view: 'labtracker',     icon: '🧪', label: 'Lab Tracker' },
  { view: 'accountability', icon: '📋', label: 'Accountability' },
  { view: 'settings',       icon: '⚙️', label: 'Settings' },
];

export default function Sidebar({ currentView, onNavigate, userName }: SidebarProps) {
  const initials = getInitials(userName);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🎓</div>
        <div>
          <h2 className="sidebar-title">SE Lecturer</h2>
          <p className="sidebar-subtitle">Productivity Hub</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">TEACHING</span>
          {navItems.map(item => (
            <button
              key={item.view}
              className={`nav-item ${currentView === item.view ? 'active' : ''}`}
              onClick={() => onNavigate(item.view)}
              aria-current={currentView === item.view ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="nav-section">
          <span className="nav-section-title">PRODUCTIVITY</span>
          {productivityItems.map(item => (
            <button
              key={item.view}
              className={`nav-item ${currentView === item.view ? 'active' : ''}`}
              onClick={() => onNavigate(item.view)}
              aria-current={currentView === item.view ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar" title={userName}>{initials}</div>
          <div>
            <p className="user-name">{userName}</p>
            <p className="user-role">Lecturer</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
