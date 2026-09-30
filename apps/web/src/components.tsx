import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

// --- ATOMS ---

const precisionBorder = "border-2 border-border shadow-subtle";
const focusRing = "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export const Button = React.forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }>(
  ({ className = '', variant = 'primary', ...props }, ref) => {
    const base = "px-4 py-2 font-heading font-bold transition-all disabled:opacity-50 border-2";
    const variants = {
      primary: "bg-primary text-white border-primary shadow-precise hover:translate-y-[2px] hover:shadow-subtle",
      secondary: "bg-surface text-text border-border shadow-precise hover:translate-y-[2px] hover:shadow-subtle",
      danger: "bg-error text-white border-error shadow-precise hover:translate-y-[2px] hover:shadow-subtle",
    };
    return <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />;
  }
);
Button.displayName = 'Button';

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ className = '', error, ...props }, ref) => {
    return <input ref={ref} className={`w-full bg-surface p-2 font-body text-text ${precisionBorder} ${focusRing} ${error ? 'border-error' : ''} ${className}`} {...props} />;
  }
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  ({ className = '', error, ...props }, ref) => {
    return <select ref={ref} className={`w-full bg-surface p-2 font-body text-text ${precisionBorder} ${focusRing} ${error ? 'border-error' : ''} ${className}`} {...props} />;
  }
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(
  ({ className = '', error, ...props }, ref) => {
    return <textarea ref={ref} className={`w-full bg-surface p-2 font-body text-text ${precisionBorder} ${focusRing} ${error ? 'border-error' : ''} ${className}`} {...props} />;
  }
);
Textarea.displayName = 'Textarea';

// --- MOLECULES ---

export function Field({ label, hint, error, children, htmlFor }: { label: string, hint?: string, error?: string, children: ReactNode, htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1 mb-4">
      <label htmlFor={htmlFor} className="flex flex-col gap-1">
        <span className="font-heading font-bold text-sm text-text">{label}</span>
        {hint && <span className="text-xs text-gray-500 font-body">{hint}</span>}
        {children}
      </label>
      {error && <span className="text-xs text-error font-bold font-body">{error}</span>}
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'DRAFT': 'bg-gray-200 text-gray-800',
    'SUBMITTED': 'bg-blue-100 text-blue-800',
    'PAID': 'bg-purple-100 text-purple-800',
    'SCHEDULED': 'bg-yellow-100 text-yellow-800',
    'ACCEPTED': 'bg-green-100 text-green-800',
    'CERTIFIED': 'bg-primary text-white',
    'FAILED': 'bg-error text-white',
    'VALID': 'bg-success text-white',
    'EXPIRED': 'bg-gray-800 text-white',
    'REVOKED': 'bg-error text-white',
    'SEAL BROKEN': 'bg-error text-white font-mono',
  };
  const color = colors[status.toUpperCase()] || colors['DRAFT'];
  return <span className={`px-2 py-1 text-xs font-bold rounded-sm border-2 border-transparent uppercase ${color}`}>{status}</span>;
}

export function Tick({ progress }: { progress: number }) {
  return (
    <div className="w-full h-4 bg-gray-200 relative tick-mark-bottom">
      <div className="h-full bg-primary transition-all tick-mark-progress" style={{ width: `${progress}%` }} />
    </div>
  );
}

// --- ORGANISMS ---

export function DataTable({ columns, data }: { columns: { key: string, label: string }[], data: any[] }) {
  return (
    <div className="overflow-x-auto border-2 border-border shadow-subtle bg-surface">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-border">
            {columns.map(col => <th key={col.key} className="p-3 font-heading font-bold text-sm">{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
              {columns.map(col => <td key={col.key} className="p-3 font-body text-sm">{row[col.key]}</td>)}
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={columns.length} className="p-4 text-center text-gray-500 font-body">No records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface border-4 border-primary shadow-precise w-full max-w-md p-6">
        <h2 className="text-xl mb-4">{title}</h2>
        {children}
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 ${className}`} />;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-6 border-2 border-error bg-error text-white flex flex-col items-center justify-center">
      <h3 className="text-lg font-heading font-bold">Error</h3>
      <p className="font-body text-sm mt-2">{message}</p>
    </div>
  );
}
