import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export async function generateCertificatePDF(cert: any, publicBaseUrl: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const payload = JSON.parse(cert.payload);
  const publicId = cert.publicId;
  const qrUrl = `${publicBaseUrl}/v/${publicId}`;
  
  // Generate QR
  const qrBuffer = await QRCode.toBuffer(qrUrl, { margin: 1, scale: 5 });
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  
  page.drawText('CERTIFICATE OF VERIFICATION', {
    x: 100, y: 750, size: 24, font: boldFont, color: rgb(0, 0, 0.5)
  });

  page.drawText(`Certificate ID: ${cert.id}`, { x: 50, y: 700, size: 12, font });
  page.drawText(`Business / Owner: ${payload.applicationId} / ${payload.instrumentId}`, { x: 50, y: 680, size: 12, font });
  
  page.drawText(`Status: ${cert.status}`, { x: 50, y: 640, size: 14, font: boldFont });
  page.drawText(`Valid Until: ${new Date(cert.validTo).toLocaleDateString()}`, { x: 50, y: 620, size: 12, font });
  page.drawText(`Receipt No: ${payload.receiptNo}`, { x: 50, y: 600, size: 12, font });
  
  page.drawText('Hash (Seal):', { x: 50, y: 560, size: 12, font });
  page.drawText(cert.sealHash, { x: 50, y: 540, size: 10, font: monoFont });

  page.drawImage(qrImage, {
    x: 400, y: 600, width: 100, height: 100
  });
  
  page.drawText('Scan to verify this certificate', { x: 380, y: 580, size: 10, font });

  const whatItProves = "What this seal proves:\nThis record is immutable and verified. Any tampering with the instrument\nwill invalidate this certification.";
  page.drawText(whatItProves, { x: 50, y: 480, size: 10, font, color: rgb(0.3, 0.3, 0.3) });

  return await pdfDoc.save();
}
