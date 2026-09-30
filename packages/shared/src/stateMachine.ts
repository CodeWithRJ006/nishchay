import { z } from 'zod';

export const StatesSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'PAID',
  'CANCELLED',
  'SCHEDULED',
  'ACCEPTED',
  'INSPECTED_PASS',
  'FAILED',
  'CERTIFIED'
]);
export type State = z.infer<typeof StatesSchema>;

export type Event =
  | { type: 'submit' }
  | { type: 'payment_succeeded' }
  | { type: 'cancel' }
  | { type: 'schedule' }
  | { type: 'officer_accept' }
  | { type: 'officer_reject'; reason: string }
  | { type: 'inspection_pass' }
  | { type: 'inspection_fail'; reasons: string[] }
  | { type: 'issue_certificate' }
  | { type: 'admin_cancel' };

export function transition(state: State, event: Event): State | Error {
  if (event.type === 'admin_cancel' && ['DRAFT', 'SUBMITTED', 'PAID', 'SCHEDULED'].includes(state)) {
    return 'CANCELLED';
  }

  switch (state) {
    case 'DRAFT':
      if (event.type === 'submit') return 'SUBMITTED';
      break;
    case 'SUBMITTED':
      if (event.type === 'payment_succeeded') return 'PAID';
      if (event.type === 'cancel') return 'CANCELLED';
      break;
    case 'PAID':
      if (event.type === 'schedule') return 'SCHEDULED';
      break;
    case 'SCHEDULED':
      if (event.type === 'officer_accept') return 'ACCEPTED';
      if (event.type === 'officer_reject') return 'PAID';
      break;
    case 'ACCEPTED':
      if (event.type === 'inspection_pass') return 'INSPECTED_PASS';
      if (event.type === 'inspection_fail') return 'FAILED';
      break;
    case 'INSPECTED_PASS':
      if (event.type === 'issue_certificate') return 'CERTIFIED';
      break;
  }
  
  return new Error(`Invalid transition from ${state} with event ${event.type}`);
}
