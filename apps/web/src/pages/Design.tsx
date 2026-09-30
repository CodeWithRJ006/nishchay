import React from 'react';
import { Button, Input, Select, Textarea, Field, StatusChip, Tick, DataTable, ErrorState, Skeleton } from '../components';

export function DesignPage() {
  return (
    <main className="p-8 space-y-12 max-w-4xl mx-auto pb-24">
      <header className="tick-mark-bottom pb-4">
        <h1 className="text-4xl text-primary">Design System</h1>
        <p className="font-body text-gray-500 mt-2">Nishchay Prototype UI Components</p>
      </header>

      <section>
        <h2 className="text-2xl mb-4">Typography</h2>
        <div className="space-y-4">
          <h1 className="text-4xl">Heading 1 (Bricolage Grotesque)</h1>
          <h2 className="text-2xl">Heading 2</h2>
          <p className="font-body">Body Text (Source Sans 3): A secure, legal metrology framework.</p>
          <p className="font-mono text-sm text-gray-600">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl mb-4">Buttons</h2>
        <div className="flex gap-4">
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="danger">Danger Action</Button>
          <Button disabled>Disabled Action</Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl mb-4">Inputs & Fields</h2>
          <Field label="Business Name" hint="As registered with MCA">
            <Input placeholder="Enter name" />
          </Field>
          <Field label="Instrument Type" error="Selection is required">
            <Select error>
              <option>Select type...</option>
              <option>Weighing Scale (Class II)</option>
            </Select>
          </Field>
          <Field label="Remarks">
            <Textarea placeholder="Any additional notes..." rows={3} />
          </Field>
        </div>
        <div>
          <h2 className="text-2xl mb-4">Chips & States</h2>
          <div className="flex flex-wrap gap-2 mb-8">
            <StatusChip status="DRAFT" />
            <StatusChip status="SUBMITTED" />
            <StatusChip status="PAID" />
            <StatusChip status="SCHEDULED" />
            <StatusChip status="ACCEPTED" />
            <StatusChip status="CERTIFIED" />
            <StatusChip status="FAILED" />
            <StatusChip status="SEAL BROKEN" />
          </div>
          <ErrorState message="Could not connect to verification server." />
        </div>
      </section>

      <section>
        <h2 className="text-2xl mb-4">Data Table</h2>
        <DataTable 
          columns={[{key: 'id', label: 'ID'}, {key: 'type', label: 'Type'}, {key: 'status', label: 'Status'}]}
          data={[
            { id: 'APP-1001', type: 'Class II Scale', status: 'Submitted' },
            { id: 'APP-1002', type: 'Fuel Dispenser', status: 'Draft' }
          ]}
        />
      </section>

      <section>
        <h2 className="text-2xl mb-4">Progress Motif</h2>
        <Tick progress={66} />
      </section>
      
      <section>
        <h2 className="text-2xl mb-4">Skeletons</h2>
        <div className="space-y-2">
           <Skeleton className="h-8 w-1/3" />
           <Skeleton className="h-4 w-full" />
           <Skeleton className="h-4 w-5/6" />
        </div>
      </section>

      {import.meta.env.VITE_DEMO_MODE === 'true' && (
        <section className="bg-red-50 border-red-200 border p-6 rounded-md">
          <h2 className="text-2xl mb-4 font-bold text-red-800">Judge's Lab (DEMO TOOLS)</h2>
          <p className="mb-4 text-red-700 text-sm">Use these tools to manually tamper with a certificate's payload and observe the seal failure on the verification page.</p>
          
          <div className="flex items-end gap-4 max-w-lg">
            <Field label="Public Certificate ID (e.g. pub-cert-1)">
              <Input id="tamper-input" placeholder="pub-cert-1" />
            </Field>
            <Button onClick={() => {
              const id = (document.getElementById('tamper-input') as HTMLInputElement).value;
              fetch('/api/admin/lab/tamper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-nishchay-csrf': '1' },
                body: JSON.stringify({ publicId: id })
              }).then(r => r.json()).then(data => alert(data.status || data.error));
            }} variant="danger">Tamper Certificate</Button>
            
            <Button onClick={() => {
              const id = (document.getElementById('tamper-input') as HTMLInputElement).value;
              fetch('/api/admin/lab/undo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-nishchay-csrf': '1' },
                body: JSON.stringify({ publicId: id })
              }).then(r => r.json()).then(data => alert(data.status || data.error));
            }}>Undo</Button>
          </div>
        </section>
      )}
    </main>
  );
}
