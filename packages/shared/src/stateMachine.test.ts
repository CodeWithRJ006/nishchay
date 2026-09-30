import { expect, test } from 'vitest';
import { transition, State, Event, StatesSchema } from './stateMachine';

test('state machine exhaustiveness', () => {
  const validTransitions = [
    { from: 'DRAFT', event: { type: 'submit' }, to: 'SUBMITTED' },
    { from: 'SUBMITTED', event: { type: 'payment_succeeded' }, to: 'PAID' },
    { from: 'SUBMITTED', event: { type: 'cancel' }, to: 'CANCELLED' },
    { from: 'PAID', event: { type: 'schedule' }, to: 'SCHEDULED' },
    { from: 'SCHEDULED', event: { type: 'officer_accept' }, to: 'ACCEPTED' },
    { from: 'SCHEDULED', event: { type: 'officer_reject', reason: 'busy' }, to: 'PAID' },
    { from: 'ACCEPTED', event: { type: 'inspection_pass' }, to: 'INSPECTED_PASS' },
    { from: 'ACCEPTED', event: { type: 'inspection_fail', reasons: [] }, to: 'FAILED' },
    { from: 'INSPECTED_PASS', event: { type: 'issue_certificate' }, to: 'CERTIFIED' },
  ] as const;

  for (const t of validTransitions) {
    const next = transition(t.from, t.event as Event);
    expect(next).toBe(t.to);
  }

  expect(transition('DRAFT', { type: 'admin_cancel' })).toBe('CANCELLED');
  expect(transition('SCHEDULED', { type: 'admin_cancel' })).toBe('CANCELLED');
  
  expect(transition('CERTIFIED', { type: 'submit' })).toBeInstanceOf(Error);
  expect(transition('DRAFT', { type: 'issue_certificate' })).toBeInstanceOf(Error);
  
  // Cover invalid transition branches
  expect(transition('DRAFT', { type: 'payment_succeeded' })).toBeInstanceOf(Error);
  expect(transition('SUBMITTED', { type: 'submit' })).toBeInstanceOf(Error);
  expect(transition('PAID', { type: 'submit' })).toBeInstanceOf(Error);
  expect(transition('SCHEDULED', { type: 'submit' })).toBeInstanceOf(Error);
  expect(transition('ACCEPTED', { type: 'submit' })).toBeInstanceOf(Error);
  expect(transition('INSPECTED_PASS', { type: 'submit' })).toBeInstanceOf(Error);
});
