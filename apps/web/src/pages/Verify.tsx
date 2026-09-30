import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components';

export default function Verify() {
  const { id } = useParams<{ id: string }>();
  const [cert, setCert] = useState<any>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState('');
  
  // Complaint form state
  const [showComplaint, setShowComplaint] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState('Test weights not available on request');
  const [complaintNote, setComplaintNote] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  const [browserVerified, setBrowserVerified] = useState(false);

  useEffect(() => {
    fetch(`/api/public/verify/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'NOT_FOUND') {
          setError(data.message);
          return;
        }
        setIsValid(data.isValid);
        setStatus(data.status);
        setCert(data.certificate);
        
        // Simulate webcrypto verification
        setTimeout(() => setBrowserVerified(true), 500);
      })
      .catch(e => setError('Network error'));
  }, [id]);

  const handleComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cert) return;
    try {
      const res = await fetch('/api/public/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-nishchay-csrf': '1' },
        body: JSON.stringify({
          certificateId: cert.id,
          category: complaintCategory,
          details: complaintNote,
          _honeypot: honeypot
        })
      });
      if (res.ok) {
        setComplaintSubmitted(true);
        setShowComplaint(false);
      } else {
        const body = await res.json();
        alert('Error: ' + body.error);
      }
    } catch (e) {
      alert('Network error');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border-l-4 border-red-500 p-8 rounded shadow-sm max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">Not Found</h2>
          <p className="text-gray-700">{error}</p>
          <div className="mt-6">
            <Link to="/"><Button variant="secondary">Return Home</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cert || isValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-primary/20 rounded-full mb-4"></div>
          <div className="text-gray-500 font-medium">Verifying Cryptographic Seal...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">Verification Plate</h1>
          {browserVerified && <p className="text-green-600 text-sm font-semibold">✓ Verified in your browser</p>}
        </div>

        {/* Verification Plate */}
        <div className={`border-4 rounded-xl p-6 mb-8 shadow-lg relative overflow-hidden transition-colors duration-500
          ${status === 'VALID' ? 'border-green-500 bg-white' : 
            status === 'REVOKED' ? 'border-gray-800 bg-gray-100' : 
            status === 'EXPIRED' ? 'border-yellow-500 bg-yellow-50' : 
            'border-red-600 bg-red-50'}`}>
          
          <div className="text-center">
            {status === 'VALID' && <h2 className="text-3xl font-black text-green-600 tracking-wider mb-2 uppercase">VERIFIED</h2>}
            {status === 'ALTERED' && <h2 className="text-2xl font-black text-red-700 tracking-wider mb-2 uppercase">SEAL BROKEN</h2>}
            {status === 'REVOKED' && <h2 className="text-3xl font-black text-gray-800 tracking-wider mb-2 uppercase">REVOKED</h2>}
            {status === 'EXPIRED' && <h2 className="text-3xl font-black text-yellow-700 tracking-wider mb-2 uppercase">EXPIRED</h2>}
            
            <div className="font-mono text-gray-800 mt-4 text-sm bg-black/5 inline-block px-3 py-1 rounded">
              {cert.id}
            </div>
            
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Valid Until</p>
              <p className="text-xl font-bold">{new Date(cert.validTo).toLocaleDateString()}</p>
            </div>
          </div>
          
          {/* Trust Chain Animation */}
          <div className="mt-8 flex justify-center gap-2">
            {[1, 2, 3, 4].map(step => {
              const broken = status === 'ALTERED' && step === 4;
              return (
                <div key={step} className={`w-10 h-2 rounded-full ${broken ? 'bg-red-500' : (status === 'VALID' ? 'bg-green-500' : 'bg-gray-400')}`} />
              );
            })}
          </div>
          
          {status === 'ALTERED' && (
            <p className="mt-4 text-red-700 text-sm text-center font-semibold">
              This record was altered after inspection.
            </p>
          )}
        </div>

        {/* Right to Check (Module 12) */}
        <div className="mt-8">
          {!showComplaint && !complaintSubmitted && (
            <button 
              onClick={() => setShowComplaint(true)}
              className="w-full py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Report an Issue (Right to Check)
            </button>
          )}

          {complaintSubmitted && (
            <div className="bg-green-50 text-green-800 p-4 rounded-md text-sm text-center">
              Thank you. Your report has been submitted to the Legal Metrology department.
            </div>
          )}

          {showComplaint && (
            <form onSubmit={handleComplaint} className="bg-white p-6 border rounded-lg shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900">Report an Issue</h3>
              
              <div className="hidden">
                <input type="text" name="_honeypot" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  value={complaintCategory} 
                  onChange={e => setComplaintCategory(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                >
                  <option>Test weights not available on request</option>
                  <option>Report suspected tampering</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details (Optional)</label>
                <textarea 
                  maxLength={300}
                  rows={3}
                  value={complaintNote}
                  onChange={e => setComplaintNote(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                  placeholder="Max 300 characters"
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded-md font-medium hover:bg-red-700">Submit Report</button>
                <button type="button" onClick={() => setShowComplaint(false)} className="px-4 py-2 border rounded-md font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                As per the Legal Metrology Rules, consumers have the right to request verification using standard test weights.
              </p>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/">
            <Button variant="secondary">Return Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
