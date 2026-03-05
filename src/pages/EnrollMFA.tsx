import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Smartphone } from 'lucide-react';

interface EnrollMFAProps {
  onEnrolled: () => void;
  onSkipped?: () => void;
}

export default function EnrollMFA({ onEnrolled, onSkipped }: EnrollMFAProps) {
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);

  useEffect(() => {
    (async () => {
      // Check if a factor already exists first
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const existing = factors?.totp?.[0];
      if (existing) {
        // Factor already enrolled – skip to verified state
        onEnrolled();
        return;
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'MF AI Navigator' });
      if (error) {
        if (error.message?.includes('already exists')) {
          // Race condition – factor was created between check and enroll
          onEnrolled();
          return;
        }
        toast({ title: 'MFA Error', description: error.message, variant: 'destructive' });
        setEnrolling(false);
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrolling(false);
    })();
  }, []);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });
      if (verify.error) throw verify.error;

      toast({ title: 'MFA Enabled', description: 'Authenticator app linked successfully.' });
      onEnrolled();
    } catch (err: any) {
      toast({ title: 'Verification Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Set Up Authenticator</CardTitle>
          <CardDescription>
            Scan the QR code below with Microsoft Authenticator (or any TOTP app) to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {enrolling ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode} alt="MFA QR Code" className="rounded-lg border border-border shadow-sm" />
                </div>
              )}
              {secret && (
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Or enter manually</p>
                  <code className="text-xs bg-muted px-3 py-1.5 rounded-md font-mono select-all">{secret}</code>
                </div>
              )}
              <div className="space-y-2">
                <Input
                  placeholder="Enter 6-digit code from app"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg tracking-[0.5em] font-mono"
                />
                <Button onClick={handleVerify} className="w-full" disabled={loading || verifyCode.length !== 6}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ShieldCheck className="mr-2 h-4 w-4" /> Verify & Enable MFA
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
