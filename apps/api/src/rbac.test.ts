import { expect, test } from 'vitest';
import { routes, checkPoliciesOnStartup } from './rbac';

test('checkPoliciesOnStartup validates all routes', () => {
  const registeredRoutes = [
    { method: 'GET', path: '/api/health' }
  ];
  expect(() => checkPoliciesOnStartup(registeredRoutes)).not.toThrow();

  const missingRoutes = [
    { method: 'GET', path: '/api/missing' }
  ];
  expect(() => checkPoliciesOnStartup(missingRoutes)).toThrow('Startup failed');
});

test('RBAC matrix test', () => {
  const logoutRoute = routes.find(r => r.path === '/api/auth/logout');
  expect(logoutRoute?.roles).toContain('BUSINESS');
  expect(logoutRoute?.roles).toContain('LMO');
  expect(logoutRoute?.roles).not.toContain('PUBLIC');
  
  const registerRoute = routes.find(r => r.path === '/api/auth/register');
  expect(registerRoute?.roles).toContain('PUBLIC');
});
