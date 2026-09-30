import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button, StatusChip } from '../components';

export default function CertificateView() {
  const { id } = useParams<{ id: string }>();
  const [cert, setCert] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/certificates/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load certificate');
        return r.json();
      })
      .then(setCert)
      .catch(e => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">Error: {error}</div>
      </div>
    );
  }

  if (!cert) return <div className="p-8">Loading...</div>;

  const payload = JSON.parse(cert.payload);
  const verifyUrl = `${window.location.origin}/verify/${cert.id}`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
        
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">Verification Certificate</h1>
            <p className="text-gray-500 font-mono">ID: {cert.id}</p>
            <StatusChip status={cert.status as any} />
          </div>
          <div className="text-right">
            <div className="inline-block p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
              <QRCodeSVG value={verifyUrl} size={100} />
            </div>
            <div className="mt-2 text-sm text-gray-500 text-center">
              Scan to Verify
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 border-t border-gray-100 pt-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Instrument Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Instrument ID</p>
                <p className="font-mono text-gray-900">{payload.instrumentId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Application ID</p>
                <p className="font-mono text-gray-900">{payload.applicationId}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Verification Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Issued By</p>
                <p className="font-medium text-gray-900">{payload.issuerType} ({payload.issuerId})</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Inspection Date</p>
                <p className="font-medium text-gray-900">{new Date(payload.inspectedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 border-t border-gray-100 pt-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Validity Period</h3>
          <div className="flex items-center space-x-8">
            <div>
              <p className="text-sm text-gray-500">Valid From</p>
              <p className="font-medium text-gray-900">{new Date(payload.validFrom).toLocaleDateString()}</p>
            </div>
            <div className="text-gray-300">→</div>
            <div>
              <p className="text-sm text-gray-500">Valid To</p>
              <p className="font-medium text-gray-900">{new Date(payload.validTo).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-gray-100 pt-8">
          <Link to={`/verify/${cert.id}`}>
            <Button variant="secondary">Public Verify Page</Button>
          </Link>
          <Button onClick={() => window.print()}>Print Certificate</Button>
        </div>
      </div>
    </div>
  );
}
