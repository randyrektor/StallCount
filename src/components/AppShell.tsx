import React from 'react';

interface AppShellProps {
  title?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  width?: 'wide' | 'narrow';
  showHeader?: boolean;
  center?: boolean;
}

export function AppShell({
  title,
  left,
  right,
  children,
  width = 'wide',
  showHeader = true,
  center = false,
}: AppShellProps) {
  const bodyInner = `app-shell-inner app-shell-inner--${width}`;
  const headerInner = 'app-shell-inner app-shell-inner--wide';
  return (
    <div className={`app-shell${showHeader ? '' : ' app-shell--no-header'}`}>
      {showHeader && (
        <header className="app-shell-header">
          <div className={headerInner}>
            <div className="app-shell-side">{left}</div>
            <h1 className="app-shell-title">{title}</h1>
            <div className="app-shell-side app-shell-side--end">{right}</div>
          </div>
        </header>
      )}
      <main className={`${bodyInner} app-shell-body${center ? ' app-shell-body--center' : ''}`}>
        {children}
      </main>
    </div>
  );
}
