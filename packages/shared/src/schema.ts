import { z } from 'zod';

export const BusinessSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string()
});
export type Business = z.infer<typeof BusinessSchema>;

export const InstrumentSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  serialNumber: z.string(),
  class: z.string()
});
export type Instrument = z.infer<typeof InstrumentSchema>;

export const ApplicationSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  instrumentId: z.string(),
  status: z.string()
});
export type Application = z.infer<typeof ApplicationSchema>;

export const PaymentSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  amount: z.number(),
  status: z.string()
});
export type Payment = z.infer<typeof PaymentSchema>;

export const ReceiptSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  signature: z.string()
});
export type Receipt = z.infer<typeof ReceiptSchema>;

export const InspectionSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  officerId: z.string(),
  pass: z.boolean(),
  inspectedAt: z.number()
});
export type Inspection = z.infer<typeof InspectionSchema>;

export const CertificateSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  receiptId: z.string(),
  issueDate: z.number(),
  validTo: z.number(),
  status: z.string(),
  sealHash: z.string(),
  sealSignature: z.string()
});
export type Certificate = z.infer<typeof CertificateSchema>;

export const ComplaintSchema = z.object({
  id: z.string(),
  certificateId: z.string(),
  category: z.string(),
  details: z.string()
});
export type Complaint = z.infer<typeof ComplaintSchema>;
