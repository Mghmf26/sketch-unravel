import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Workflow, Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex items-center justify-center gap-2.5">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Workflow className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">MF AI Navigator</h1>
              <p className="text-[10px] text-muted-foreground tracking-wide">PROCESS MANAGEMENT</p>
            </div>
          </div>
          <div>
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription className="mt-1">
              Enter your credentials to access the platform
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot your password?
            </button>
          </div>
          <p className="mt-4 text-xs text-center text-muted-foreground">
            Access is by invitation only. Contact your administrator to request access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
