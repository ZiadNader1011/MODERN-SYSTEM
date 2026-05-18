import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/services/authService';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back! ✨');
      navigate('/dashboard'); // توجيه المستخدم للوحة التحكم بعد النجاح
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed ❌');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-accent/20">
      <form onSubmit={handleLogin} className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-center">Login to System</h1>
        <div className="space-y-2">
          <label>Username</label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label>Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2" /> : 'Sign In'}
        </Button>
      </form>
    </div>
  );
}