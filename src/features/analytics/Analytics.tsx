
import React from 'react';
import { useStore } from '../../hooks/useStore';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import './Analytics.css';

export default function Analytics() {
  const { data, loading } = useStore();

  if (loading || !data) return <LoadingSkeleton rows={6} type="cards" />;

  const courseStats = data.courses.map(course => {
    const courseStudents = data.students.filter(s => s.enrolledCourse === course).length;
    const courseAssignments = data.assignments.filter(a => a.course === course);
    const activeCount = courseAssignments.filter(a => a.status === 'active').length;
    const totalSubmissions = courseAssignments.reduce((sum, a) => sum + a.submissions, 0);
    const totalExpected = courseAssignments.reduce((sum, a) => sum + a.totalStudents, 0);
    const avgProgress = totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;
    const courseResources = data.resources.filter(r => r.course === course).length;
    return { course, courseStudents, courseAssignments: courseAssignments.length, activeCount, avgProgress, courseResources };
  });

  const statusCounts = { draft: 0, active: 0, closed: 0 };
  data.assignments.forEach(a => statusCounts[a.status]++);

  const typeCounts: Record<string, number> = {};
  data.resources.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });

  const totalEvents = data.timetable.length;
  const hoursPerWeek = data.timetable.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>📈 Analytics</h1>
          <p className="page-subtitle">Overview of your teaching metrics</p>
        </div>
      </div>

      <div className="analytics-overview">
        <div className="analytics-stat-card">
          <span className="analytics-stat-value">{data.courses.length}</span>
          <span className="analytics-stat-label">Courses</span>
        </div>
        <div className="analytics-stat-card">
          <span className="analytics-stat-value">{data.students.length}</span>
          <span className="analytics-stat-label">Students</span>
        </div>
        <div className="analytics-stat-card">
          <span className="analytics-stat-value">{totalEvents}</span>
          <span className="analytics-stat-label">Weekly Sessions</span>
        </div>
        <div className="analytics-stat-card">
          <span className="analytics-stat-value">{hoursPerWeek}h</span>
          <span className="analytics-stat-label">Teaching Load</span>
        </div>
      </div>

      <div className="analytics-section">
        <h2>📊 Assignment Status Distribution</h2>
        <div className="chart-bar-container">
          {Object.entries(statusCounts).map(([status, count]) => {
            const maxCount = Math.max(...Object.values(statusCounts), 1);
            const width = (count / maxCount) * 100;
            const colors: Record<string, string> = { draft: 'var(--text-muted)', active: 'var(--success)', closed: 'var(--accent)' };
            return (
              <div key={status} className="chart-bar-row">
                <span className="chart-bar-label">{status}</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${width}%`, background: colors[status] }}></div>
                </div>
                <span className="chart-bar-value">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="analytics-section">
        <h2>📁 Resource Types</h2>
        <div className="chart-bar-container">
          {Object.entries(typeCounts).map(([type, count]) => {
            const maxCount = Math.max(...Object.values(typeCounts), 1);
            const width = (count / maxCount) * 100;
            return (
              <div key={type} className="chart-bar-row">
                <span className="chart-bar-label">{type}</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${width}%`, background: 'var(--accent-2)' }}></div>
                </div>
                <span className="chart-bar-value">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="analytics-section">
        <h2>📋 Course Breakdown</h2>
        <div className="course-breakdown">
          {courseStats.map(cs => (
            <div key={cs.course} className="course-stat-card">
              <h3>{cs.course}</h3>
              <div className="course-stat-grid">
                <div className="course-stat">
                  <span className="course-stat-value">{cs.courseStudents}</span>
                  <span className="course-stat-label">Students</span>
                </div>
                <div className="course-stat">
                  <span className="course-stat-value">{cs.courseAssignments}</span>
                  <span className="course-stat-label">Assignments</span>
                </div>
                <div className="course-stat">
                  <span className="course-stat-value">{cs.courseResources}</span>
                  <span className="course-stat-label">Resources</span>
                </div>
                <div className="course-stat">
                  <span className="course-stat-value">{cs.avgProgress}%</span>
                  <span className="course-stat-label">Avg Progress</span>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${cs.avgProgress}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
