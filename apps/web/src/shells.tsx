import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function DesktopShell({ children, role, user }: { children: ReactNode, role: string, user: string }) {
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
  const location = useLocation();
  
  const navItems = {
    BUSINESS: [{ path: '/dashboard', label: 'Instruments' }, { path: '/applications', label: 'Applications' }],
    LMO: [{ path: '/lmo', label: 'Inspections' }],
    GATC: [{ path: '/gatc', label: 'Verifications' }]
  }[role as string] || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isDemo && (
        <div className="bg-primary text-white text-xs font-mono py-1 px-4 text-center tick-mark-progress">
          DEMO MODE - Prototype built for SIH26036. Not an official government system.
        </div>
      )}
      <header className="border-b-4 border-border bg-surface px-6 py-4 flex justify-between items-center shadow-subtle z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tighter uppercase text-primary">Nishchay</h1>
          <span className="px-2 py-1 bg-gray-200 text-xs font-bold rounded-sm uppercase">{role}</span>
        </div>
        <div className="flex items-center gap-4 font-body text-sm">
          <span>{user}</span>
          <ButtonLink to="/logout" variant="secondary">Sign Out</ButtonLink>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r-2 border-border bg-surface p-4 flex flex-col gap-2">
          {navItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`p-3 font-heading font-bold border-2 transition-all ${location.pathname.startsWith(item.path) ? 'border-primary bg-blue-50 text-primary' : 'border-transparent hover:border-gray-200'}`}
            >
              {item.label}
            </Link>
          ))}
          {isDemo && (
             <Link to="/design" className="mt-auto p-3 font-mono text-sm border-2 border-dashed border-gray-300 hover:border-primary text-gray-500 hover:text-primary">
               Design System
             </Link>
          )}
        </aside>
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function MobileFieldShell({ children, title, primaryAction, secondaryAction }: { children: ReactNode, title: string, primaryAction?: ReactNode, secondaryAction?: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background max-w-md mx-auto border-x-2 border-border shadow-2xl relative">
      <header className="bg-surface border-b-2 border-border p-4 sticky top-0 z-10">
        <h2 className="text-xl font-black uppercase text-primary">{title}</h2>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {children}
      </main>
      {(primaryAction || secondaryAction) && (
        <footer className="bg-surface border-t-2 border-border p-4 sticky bottom-0 z-10 flex flex-col gap-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {primaryAction}
          {secondaryAction}
        </footer>
      )}
    </div>
  );
}

function ButtonLink({ to, children, variant = 'primary' }: { to: string, children: ReactNode, variant?: 'primary'|'secondary' }) {
  const base = "px-4 py-2 font-heading font-bold transition-all border-2 text-center inline-block cursor-pointer";
  const variants = {
    primary: "bg-primary text-white border-primary shadow-precise hover:translate-y-[2px] hover:shadow-subtle",
    secondary: "bg-surface text-text border-border shadow-precise hover:translate-y-[2px] hover:shadow-subtle"
  };
  return <Link to={to} className={`${base} ${variants[variant]}`}>{children}</Link>;
}
