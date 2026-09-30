import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function ReceiptView() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    // In a real app we would fetch the receipt details from /api/receipts/:id
    // But since it's just a view page and there is no GET /api/receipts/:id defined yet,
    // we'll just mock the view for the prototype.
    setReceipt({
      id,
      date: new Date().toLocaleDateString(),
      amount: '500.00',
      status: 'PAID'
    });
  }, [id]);

  if (!receipt) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-12 p-8 border rounded shadow print:shadow-none print:border-none">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <h1 className="text-3xl font-bold">Payment Receipt</h1>
        <button onClick={() => window.print()} className="print:hidden text-blue-600 underline">Print PDF</button>
      </div>
      
      <div className="space-y-4 text-lg">
        <div className="flex justify-between">
          <span className="text-gray-600">Receipt No:</span>
          <span className="font-mono">{receipt.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span>{receipt.date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Amount Paid:</span>
          <span>₹{receipt.amount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className="text-green-600 font-bold">{receipt.status}</span>
        </div>
      </div>
      
      <div className="mt-12 text-sm text-gray-500 text-center">
        This is a digitally generated receipt for the Smart India Hackathon 2026 Prototype.
      </div>
    </div>
  );
}
