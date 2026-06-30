
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Timetable from './features/timetable/Timetable';
import Students from './features/students/Students';
import Assignments from './features/assignments/Assignments';
import Resources from './features/resources/Resources';
import Analytics from './features/analytics/Analytics';
import Settings from './features/settings/Settings';
import SmartGoals from './features/smartgoals/SmartGoals';
import LectureNotes from './features/lecturenotes/LectureNotes';
import Journal from './features/journal/Journal';
import Tasks from './features/tasks/Tasks';
import LabTracker from './features/labtracker/LabTracker';
import Accountability from './features/accountability/Accountability';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeStore, getStore } from './utils/store';
import './App.css';

export type ViewType =
  | 'dashboard' | 'timetable' | 'students' | 'assignments'
  | 'resources' | 'analytics' | 'settings' | 'smartgoals'
  | 'lecturenotes' | 'journal' | 'tasks' | 'labtracker' | 'accountability';

function App() {
  const [view, setView] = useState<ViewType>('dashboard');
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('Dr. Smith');

  useEffect(() => {
    initializeStore().then(data => {
      setUserName(data.userName);
      setReady(true);
    });
  }, []);

  // Refresh userName when settings are saved
  const handleNavigate = (nextView: ViewType) => {
    if (view === 'settings' && nextView !== 'settings') {
      getStore().then(d => setUserName(d.userName));
    }
    setView(nextView);
  };

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="loader-ring" />
        <p>Loading your workspace…</p>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard':      return <Dashboard onNavigate={handleNavigate} />;
      case 'timetable':      return <Timetable />;
      case 'students':       return <Students />;
      case 'assignments':    return <Assignments />;
      case 'resources':      return <Resources />;
      // Pass a key so Analytics re-mounts (re-reads store) each time it's shown
      case 'analytics':      return <Analytics key={Date.now()} />;
      case 'settings':       return <Settings />;
      case 'smartgoals':     return <SmartGoals />;
      case 'lecturenotes':   return <LectureNotes />;
      case 'journal':        return <Journal />;
      case 'tasks':          return <Tasks />;
      case 'labtracker':     return <LabTracker />;
      case 'accountability': return <Accountability />;
      default:               return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar currentView={view} onNavigate={handleNavigate} userName={userName} />
      <main className="main-content">
        <ErrorBoundary>
          {renderView()}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
