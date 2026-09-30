import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Field, ErrorState } from '../components';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-nishchay-csrf': '1' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      
      const meRes = await fetch('/api/auth/me');
      const me = await meRes.json();
      
      if (me.role === 'BUSINESS') navigate('/dashboard');
      else if (me.role === 'LMO') navigate('/lmo');
      else if (me.role === 'GATC') navigate('/gatc');
      else navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border-2 border-border shadow-precise p-8">
        <h2 className="text-3xl font-black text-primary mb-6 text-center">SIGN IN</h2>
        {error && <div className="mb-4"><ErrorState message={error} /></div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Email Address">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>
        <div className="mt-6 text-center font-body text-sm">
          Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Register Business</Link>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [formData, setFormData] = useState({ email: '', password: '', name: '', businessName: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-nishchay-csrf': '1' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      
      // Auto login or redirect to login
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-surface border-2 border-border shadow-precise p-8">
        <h2 className="text-3xl font-black text-primary mb-6 text-center">REGISTER BUSINESS</h2>
        {error && <div className="mb-4"><ErrorState message={error} /></div>}
        <form onSubmit={handleRegister} className="space-y-4">
          <Field label="Owner Name">
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </Field>
          <Field label="Business Name">
            <Input required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} />
          </Field>
          <Field label="Business Address">
            <Input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </Field>
          <Field label="Email Address">
            <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </Field>
          <Field label="Password" hint="Minimum 8 characters">
            <Input type="password" required minLength={8} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </Button>
        </form>
      </div>
    </div>
  );
}
