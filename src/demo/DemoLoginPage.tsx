import { LogIn } from 'lucide-react';
import { useState } from 'react';
import Button from '../components/Button';
import { Input } from '../components/Input';

type DemoLoginPageProps = {
  onSignIn: (username: string) => void;
  onCancel: () => void;
};

/** Stands in for the Keycloak sign-in page. Any non-blank username and password are accepted. */
export default function DemoLoginPage({ onSignIn, onCancel }: DemoLoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const canSubmit = username.trim().length > 0 && password.length > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (canSubmit) onSignIn(username.trim());
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4 py-8 text-ink">
      <form
        onSubmit={submit}
        aria-label="Sign in"
        className="w-full space-y-4 rounded-3xl border border-white bg-white/85 px-6 py-10 shadow-card sm:px-10"
      >
        <img src="/brand/glorfex-horizontal.png" alt="Glorfex Training Tracker" className="mx-auto h-auto w-full max-w-[16rem] object-contain" />
        <h1 className="pt-2 text-center text-xl font-black">Sign in to your account</h1>
        <Input label="Username or email" name="username" autoComplete="username" autoFocus required value={username} onChange={(event) => setUsername(event.target.value)} />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <Button type="submit" className="w-full" disabled={!canSubmit} icon={<LogIn size={17} aria-hidden="true" />}>
          Sign In
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
          Back
        </Button>
      </form>
    </main>
  );
}
