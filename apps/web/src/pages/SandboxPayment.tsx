import React, { useState } from 'react';

export default function SandboxPayment() {
  const params = new URLSearchParams(window.location.search);
  const payload = params.get('payload');
  const signature = params.get('signature');
  const [status, setStatus] = useState('pending');

  if (!payload || !signature) {
    return <div className="p-8 text-red-500">Missing payment parameters</div>;
  }

  const handleCallback = async (outcome: string) => {
    setStatus('processing');
    try {
      const res = await fetch('/api/payments/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nishchay-csrf': '1'
        },
        body: JSON.stringify({ payload, signature, status: outcome })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        if (data.success) {
          window.location.href = `/receipts/${data.receiptId}`;
        } else {
          alert(data.message || 'Payment handled');
        }
      } else {
        setStatus('error');
        alert(data.error);
      }
    } catch (e) {
      setStatus('error');
      alert('Network error');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Sandbox Checkout</h1>
      <div className="mb-4 text-sm text-gray-600 bg-gray-100 p-2 rounded">
        This is a simulated payment gateway. No real money is moved.
      </div>
      
      <div className="flex gap-4 border-b mb-4">
        <button className="py-2 border-b-2 border-blue-600 text-blue-600">UPI</button>
        <button className="py-2 text-gray-500">Cards</button>
        <button className="py-2 text-gray-500">Net Banking</button>
      </div>

      <div className="space-y-4">
        <button 
          onClick={() => handleCallback('SUCCESS')}
          className="w-full bg-green-600 text-white p-3 rounded"
          disabled={status === 'processing'}
        >
          Simulate SUCCESS
        </button>
        <button 
          onClick={() => handleCallback('FAILURE')}
          className="w-full bg-red-600 text-white p-3 rounded"
          disabled={status === 'processing'}
        >
          Simulate FAILURE
        </button>
        <button 
          onClick={() => handleCallback('PENDING')}
          className="w-full bg-yellow-600 text-white p-3 rounded"
          disabled={status === 'processing'}
        >
          Simulate PENDING
        </button>
      </div>
    </div>
  );
}
