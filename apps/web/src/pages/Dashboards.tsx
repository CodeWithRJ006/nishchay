import React, { useEffect, useState } from 'react';

export function BusinessDashboard() {
  const [data, setData] = useState<{ instruments: any[], applications: any[] } | null>(null);
  useEffect(() => {
    fetch('/api/dashboard/business').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-4">Loading Dashboard...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">Business Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">Your Instruments</h2>
          <ul className="space-y-4">
            {data.instruments.map(inst => (
              <li key={inst.id} className="border-b pb-2">
                <div className="font-medium">{inst.instrumentClass} ({inst.serialNumber})</div>
                <div className="text-sm text-gray-600">Status: {inst.status} {inst.validTo && `| Valid to: new Date(inst.validTo).toLocaleDateString()`}</div>
              </li>
            ))}
          </ul>
        </section>
        
        <section className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">Applications & Timelines</h2>
          <ul className="space-y-4">
            {data.applications.map(app => (
              <li key={app.id} className="border-b pb-2">
                <div className="font-medium">App: {app.id}</div>
                <div className="text-sm">Status: {app.status}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Timeline: [DRAFT] → [{app.payment ? 'PAID' : 'PENDING PAYMENT'}] → [{app.appointment ? 'SCHEDULED' : 'PENDING SCHEDULE'}] → [{app.certificate ? 'CERTIFIED' : '...'}]
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function LMODashboard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/dashboard/lmo').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-4">Loading Dashboard...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">LMO Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="bg-white p-4 rounded shadow border">
          <h2 className="text-lg font-semibold mb-2">Pending Jobs</h2>
          <div>{data.pendingApps.length} jobs require attention</div>
        </section>
        <section className="bg-white p-4 rounded shadow border">
          <h2 className="text-lg font-semibold mb-2">Today's Schedule</h2>
          <div>{data.todaysSchedule.length} appointments today</div>
        </section>
        <section className="bg-white p-4 rounded shadow border">
          <h2 className="text-lg font-semibold mb-2">History</h2>
          <div>{data.history.length} recent inspections</div>
        </section>
      </div>
    </div>
  );
}

export function GATCDashboard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/dashboard/gatc').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-4">Loading Dashboard...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">GATC Dashboard - {data.centreName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="bg-white p-4 rounded shadow border">
          <h2 className="text-lg font-semibold mb-2">Pending Jobs</h2>
          <div>{data.pendingApps.length} GATC jobs require attention</div>
        </section>
        <section className="bg-white p-4 rounded shadow border">
          <h2 className="text-lg font-semibold mb-2">Today's Schedule</h2>
          <div>{data.todaysSchedule.length} appointments today</div>
        </section>
        <section className="bg-white p-4 rounded shadow border">
          <h2 className="text-lg font-semibold mb-2">History</h2>
          <div>{data.history.length} recent inspections</div>
        </section>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/dashboard/admin').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-4">Loading Dashboard...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow border text-center">
          <div className="text-sm text-gray-600">Unassigned Queue</div>
          <div className="text-2xl font-bold">{data.unassigned}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border text-center">
          <div className="text-sm text-gray-600">Payments</div>
          <div className="text-2xl font-bold">{data.paymentsCount}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border text-center">
          <div className="text-sm text-gray-600">Fee-Gate Blocks</div>
          <div className="text-2xl font-bold text-red-600">{data.feeGateBlocks}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border text-center">
          <div className="text-sm text-gray-600">Complaints</div>
          <div className="text-2xl font-bold">{data.complaints.length}</div>
        </div>
      </div>

      <section className="bg-white p-6 rounded shadow border">
        <h2 className="text-xl font-semibold mb-4">Application States</h2>
        <div className="flex gap-4 flex-wrap">
          {data.states.map((s: any) => (
            <div key={s.status} className="px-4 py-2 bg-gray-100 rounded text-sm">
              <span className="font-medium">{s.status}:</span> {s._count}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded shadow border">
        <h2 className="text-xl font-semibold mb-4">Right-to-Check Complaints</h2>
        <ul className="space-y-2">
          {data.complaints.map((c: any) => (
            <li key={c.id} className="border-b pb-2 text-sm">
              <span className="font-bold">{c.category}</span> - {c.certificate.application.business.tradeName} (Cert: {c.certificateId})
              <p className="text-gray-600 mt-1">{c.details}</p>
            </li>
          ))}
          {data.complaints.length === 0 && <div className="text-gray-500">No complaints filed.</div>}
        </ul>
      </section>
    </div>
  );
}
