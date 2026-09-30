import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { instrumentRules, evaluateReadings, InstrumentClass } from '@nishchay/shared';

function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  return 12742000 * Math.asin(Math.sqrt(a)); // in meters
}

function FieldApp() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  
  // States for the active job flow
  const [step, setStep] = useState<'LIST' | 'DETAIL' | 'REJECT' | 'ARRIVE' | 'EVIDENCE' | 'CHECKLIST' | 'RESULT'>('LIST');
  const [rejectReason, setRejectReason] = useState('');
  
  // Arrive state
  const [locationResult, setLocationResult] = useState<{lat: number, lng: number, distance: number, source: string} | null>(null);
  const [locationError, setLocationError] = useState('');

  // Evidence state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photos, setPhotos] = useState<{fileUrl: string, sha256: string, capturedAt: string, source: string}[]>([]);

  // Checklist state
  const [readings, setReadings] = useState<{nominal: number, observed: number}[]>([{nominal: 0, observed: 0}]);
  const [reasons, setReasons] = useState<string>('');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    const res = await fetch('/api/applications');
    if (res.ok) {
      const data = await res.json();
      setJobs(data.filter((d: any) => d.status === 'SCHEDULED' || d.status === 'ACCEPTED'));
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    const res = await fetch(`/api/applications/${selectedJob.id}/accept`, { method: 'POST' });
    if (res.ok) {
      alert('Accepted job');
      fetchJobs();
      setStep('LIST');
    }
  };

  const handleReject = async () => {
    if (!rejectReason) return;
    const res = await fetch(`/api/applications/${selectedJob.id}/reject`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason })
    });
    if (res.ok) {
      alert('Rejected job');
      fetchJobs();
      setStep('LIST');
    }
  };

  const startArrive = () => {
    setStep('ARRIVE');
    setLocationError('');
    setLocationResult(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const dist = distance(lat, lng, selectedJob.business.premisesLat, selectedJob.business.premisesLng);
          setLocationResult({ lat, lng, distance: dist, source: 'gps' });
        },
        (err) => {
          setLocationError('Location unavailable or denied.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationError('Geolocation not supported.');
    }
  };

  const startEvidence = async () => {
    setStep('EVIDENCE');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      console.error(e);
      // Let it fail gracefully, user can click Demo button
    }
  };

  useEffect(() => {
    if (step === 'EVIDENCE' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [step, stream]);

  const capturePhoto = async (demo: boolean = false) => {
    let blob: Blob;
    let source = 'camera';
    
    if (demo || !stream) {
      // Create synthetic demo image
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#000000';
      ctx.font = '48px serif';
      ctx.fillText('DEMO EVIDENCE', 100, 240);
      blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg'));
      source = 'demo';
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current!.videoWidth;
      canvas.height = videoRef.current!.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(videoRef.current!, 0, 0);
      blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg'));
    }

    const formData = new FormData();
    formData.append('file', blob, 'evidence.jpg');
    formData.append('applicationId', selectedJob.id);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos([...photos, {
        fileUrl: data.fileUrl,
        sha256: data.sha256,
        capturedAt: new Date().toISOString(),
        source
      }]);
    } else {
      alert('Upload failed: ' + (await res.json()).message);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const submitInspection = async (pass: boolean) => {
    const res = await fetch(`/api/applications/${selectedJob.id}/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pass,
        checklist: {
          locationResult,
          ruleBase: instrumentRules[selectedJob.instrument.instrumentClass as InstrumentClass]
        },
        readings,
        reasons: pass ? [] : reasons.split(','),
        photos
      })
    });
    if (res.ok) {
      alert(`Inspection Submitted as ${pass ? 'PASS' : 'FAIL'}`);
      fetchJobs();
      setStep('LIST');
    } else {
      alert('Failed to submit: ' + (await res.json()).error);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen text-gray-900 font-sans">
      <header className="bg-blue-600 text-white p-4 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="font-bold text-lg font-bricolage">NISHCHAY Field</h1>
        <button onClick={() => { stopCamera(); setStep('LIST'); }} className="text-sm font-semibold">
          {step !== 'LIST' ? 'Back to List' : ''}
        </button>
      </header>

      <main className="p-4 pb-20">
        {step === 'LIST' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4 font-bricolage">My Jobs</h2>
            {jobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No assigned jobs.</p>
            ) : (
              jobs.map(j => (
                <div key={j.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow"
                     onClick={() => { setSelectedJob(j); setStep('DETAIL'); }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{j.id}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${j.status === 'SCHEDULED' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                      {j.status}
                    </span>
                  </div>
                  <h3 className="font-bold">{j.business.tradeName}</h3>
                  <p className="text-sm text-gray-600 truncate">{j.instrument.instrumentClass} ({j.instrument.make} {j.instrument.model})</p>
                  <p className="text-xs text-gray-400 mt-2">Slot: {new Date(j.appointment.scheduledDate).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        )}

        {step === 'DETAIL' && selectedJob && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <h2 className="text-xl font-bold font-bricolage mb-2">{selectedJob.business.tradeName}</h2>
              <p className="text-sm text-gray-700">{selectedJob.business.address}</p>
              <div className="mt-4 text-sm">
                <p><strong>Instrument:</strong> {selectedJob.instrument.instrumentClass}</p>
                <p><strong>S/N:</strong> {selectedJob.instrument.serialNumber}</p>
                <p><strong>Capacity:</strong> {selectedJob.instrument.capacity}</p>
              </div>
            </div>

            {selectedJob.status === 'SCHEDULED' && (
              <div className="flex gap-2">
                <button onClick={handleAccept} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-center min-h-[44px]">
                  Accept Job
                </button>
                <button onClick={() => setStep('REJECT')} className="flex-1 bg-red-100 text-red-700 py-3 rounded-xl font-semibold text-center min-h-[44px]">
                  Reject
                </button>
              </div>
            )}

            {selectedJob.status === 'ACCEPTED' && (
              <button onClick={startArrive} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-center text-lg min-h-[44px] shadow-sm">
                I have arrived
              </button>
            )}
          </div>
        )}

        {step === 'REJECT' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-bricolage">Reject Job</h2>
            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 min-h-[100px]"
              placeholder="Reason for rejection (required)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <button onClick={handleReject} disabled={!rejectReason} className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold min-h-[44px] disabled:opacity-50">
              Confirm Reject
            </button>
          </div>
        )}

        {step === 'ARRIVE' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold font-bricolage">Location Verification</h2>
            
            {locationResult ? (
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                {locationResult.source === 'demo' && <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded inline-block mb-2">DEMO MODE</div>}
                <p className="text-sm text-gray-700 mb-2">GPS Acquired.</p>
                <p className="font-mono text-xs mb-2">{locationResult.lat.toFixed(6)}, {locationResult.lng.toFixed(6)}</p>
                <p className={`font-bold ${locationResult.distance > 300 ? 'text-red-600' : 'text-green-600'}`}>
                  Distance: {Math.round(locationResult.distance)}m
                </p>
                {locationResult.distance > 300 && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2 border border-red-100">
                    Location differs from registered premises!
                  </p>
                )}
                <button onClick={startEvidence} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mt-4 min-h-[44px]">
                  Continue to Evidence
                </button>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                {locationError ? (
                  <p className="text-red-600 text-sm mb-4">{locationError}</p>
                ) : (
                  <p className="text-gray-600 mb-4 animate-pulse">Acquiring GPS signal...</p>
                )}
                <button onClick={() => setLocationResult({ lat: 0, lng: 0, distance: 0, source: 'demo' })} className="w-full bg-gray-100 text-gray-800 border border-gray-300 py-3 rounded-xl font-semibold text-sm min-h-[44px]">
                  Use demo site location
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'EVIDENCE' && (
          <div className="space-y-4 flex flex-col items-center">
            <h2 className="text-xl font-bold font-bricolage w-full text-left">Capture Evidence</h2>
            
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>

            <div className="flex gap-2 w-full">
              <button onClick={() => capturePhoto(false)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold min-h-[44px]">
                Take Photo
              </button>
              <button onClick={() => capturePhoto(true)} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold min-h-[44px]">
                Use demo capture
              </button>
            </div>

            {photos.length > 0 && (
              <div className="w-full">
                <p className="text-sm font-bold mb-2">Captured ({photos.length})</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((p, i) => (
                    <img key={i} src={p.fileUrl} alt="evidence" className="w-16 h-16 rounded object-cover border border-gray-300" />
                  ))}
                </div>
                <button onClick={() => { stopCamera(); setStep('CHECKLIST'); }} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mt-4 min-h-[44px]">
                  Continue to Checklist
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'CHECKLIST' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold font-bricolage">Load Test Checklist</h2>
            
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4">
              <p className="text-sm text-gray-600">Enter Nominal vs Observed readings. Allowed tolerance: {instrumentRules[selectedJob.instrument.instrumentClass as InstrumentClass]?.tolerancesDemo} units (Demo)</p>
              
              {readings.map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="number" placeholder="Nominal" value={r.nominal || ''} onChange={e => {
                    const newR = [...readings]; newR[i].nominal = parseFloat(e.target.value) || 0; setReadings(newR);
                  }} className="flex-1 border p-2 rounded min-h-[44px]" />
                  <input type="number" placeholder="Observed" value={r.observed || ''} onChange={e => {
                    const newR = [...readings]; newR[i].observed = parseFloat(e.target.value) || 0; setReadings(newR);
                  }} className="flex-1 border p-2 rounded min-h-[44px]" />
                </div>
              ))}
              
              <button onClick={() => setReadings([...readings, {nominal: 0, observed: 0}])} className="text-blue-600 text-sm font-bold">
                + Add Reading
              </button>
            </div>

            <button onClick={() => setStep('RESULT')} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold min-h-[44px]">
              Evaluate Readings
            </button>
          </div>
        )}

        {step === 'RESULT' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold font-bricolage">Final Verdict</h2>
            
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
              {(() => {
                const evalResult = evaluateReadings(selectedJob.instrument.instrumentClass, readings);
                return (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold">System Recommendation:</span>
                      <span className={`px-3 py-1 rounded text-white font-bold ${evalResult.pass ? 'bg-green-600' : 'bg-red-600'}`}>
                        {evalResult.pass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    {evalResult.details.map((d: any, i: number) => (
                      <div key={i} className="text-sm flex justify-between">
                        <span>{d.nominal} → {d.observed} (err: {d.error.toFixed(2)})</span>
                        <span className={d.pass ? 'text-green-600' : 'text-red-600'}>{d.pass ? '✔' : '✘'}</span>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-200">
              <textarea
                className="w-full border border-gray-300 rounded-xl p-3 min-h-[100px]"
                placeholder="Reasons for failure (Required if failing)"
                value={reasons}
                onChange={e => setReasons(e.target.value)}
              />
              
              <div className="flex gap-2">
                <button onClick={() => submitInspection(true)} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold min-h-[44px]">
                  Confirm PASS
                </button>
                <button onClick={() => submitInspection(false)} disabled={!reasons} className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold min-h-[44px] disabled:opacity-50">
                  Confirm FAIL
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default FieldApp;
