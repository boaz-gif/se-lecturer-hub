import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  type?: 'cards' | 'list' | 'table';
}

export default function LoadingSkeleton({ rows = 3, type = 'cards' }: LoadingSkeletonProps) {
  if (type === 'table') {
    return (
      <div className="skeleton-table">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-table-row">
            <div className="skeleton skeleton-cell wide" />
            <div className="skeleton skeleton-cell" />
            <div className="skeleton skeleton-cell" />
            <div className="skeleton skeleton-cell narrow" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="skeleton-list">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-list-item">
            <div className="skeleton skeleton-avatar" />
            <div className="skeleton-text-group">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-subtitle" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // cards (default)
  return (
    <div className="skeleton-cards">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-subtitle" />
          <div className="skeleton skeleton-bar" />
        </div>
      ))}
    </div>
  );
}
