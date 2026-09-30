import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Field } from '../components';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function HomePage() {
  const [code, setCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (isScanning) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
      scanner.render((text) => {
        // Successful scan
        scanner?.clear();
        setIsScanning(false);
        // The QR code contains the public URL, e.g., http://localhost:5173/v/CERT-PUBLIC-ID
        // We extract the ID.
        try {
          const url = new URL(text);
          const parts = url.pathname.split('/');
          const id = parts[parts.length - 1];
          if (id) {
            navigate(`/v/${id}`);
          } else {
            setCode(text);
          }
        } catch {
          setCode(text); // fallback if it's just the ID
        }
      }, (err) => {
        // ignore errors (mostly not finding a QR code in frame)
      });
    }

    return () => {
      scanner?.clear().catch(console.error);
    };
  }, [isScanning, navigate]);
  
  const handleVerify = () => {
    if (code.trim()) {
      navigate(`/v/${code.trim()}`);
    }
  };
  
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="p-6 flex justify-between items-center border-b-4 border-border shadow-subtle bg-white">
        <h1 className="text-2xl font-black text-primary uppercase tracking-wider">Nishchay Gateway</h1>
        <div className="flex gap-4">
          <Link to="/login" className="font-heading font-bold text-primary hover:underline">Sign In</Link>
          <Link to="/register" className="font-heading font-bold text-primary hover:underline">Register Business</Link>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white border border-gray-200 shadow-sm p-8 text-center rounded-lg">
          <h2 className="text-3xl mb-2 font-black text-gray-900">Verify Certificate</h2>
          <p className="font-body text-gray-500 mb-8">Enter the certificate code or scan the QR on the instrument.</p>
          
          {!isScanning ? (
            <>
              <Field label="Verification Code">
                <Input 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. j5gu2gmxccjb6rq3qr2mhtdneq" 
                  className="text-center font-mono text-lg tracking-widest bg-gray-50 border-gray-300"
                />
              </Field>
              
              <Button className="w-full mt-6 py-3" onClick={handleVerify}>Verify Now</Button>
              
              <div className="mt-6 flex items-center justify-center">
                <span className="w-full border-t border-gray-300"></span>
                <span className="px-3 text-gray-500 font-medium">OR</span>
                <span className="w-full border-t border-gray-300"></span>
              </div>
              
              <button 
                onClick={() => setIsScanning(true)} 
                className="w-full mt-6 py-3 border-2 border-primary text-primary rounded-md font-bold hover:bg-primary/5 transition-colors"
              >
                Scan QR Code
              </button>
            </>
          ) : (
            <div className="w-full">
              <div id="reader" className="w-full mb-4"></div>
              <button 
                onClick={() => setIsScanning(false)}
                className="w-full py-2 border rounded-md font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel Scanning
              </button>
            </div>
          )}
        </div>
      </main>
      
      <footer className="p-6 bg-gray-900 text-white text-center font-body text-sm">
        Prototype built for SIH26036. Not an official government system.
      </footer>
    </div>
  );
}
