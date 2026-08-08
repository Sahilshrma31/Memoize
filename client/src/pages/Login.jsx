import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  const redirectTo = location.state?.from || '/app';

  // Google returns an opaque "invalid_client" page when the ID is absent or still
  // the placeholder, so catch that here and say what's actually wrong.
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientIdMissing = !clientId || clientId.startsWith('REPLACE_WITH_');

  const handleSuccess = async (credentialResponse) => {
    setError('');
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Sign-in failed. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto pt-16 text-center">
      <p className="eyebrow">Sign In</p>
      <h1 className="display-heading text-2xl sm:text-3xl mt-5">Welcome To Memoize</h1>
      <p className="mt-4 text-sm text-midnight-muted leading-relaxed">
        Sign in with Google to start tracking the problems you've solved. Your queue is private
        to your account.
      </p>

      {clientIdMissing ? (
        <div className="mt-8 border border-rating-hard/40 bg-midnight-surface px-5 py-4 text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-rating-hard">
            Google Sign-In Not Configured
          </p>
          <p className="mt-2 text-sm text-midnight-muted leading-relaxed">
            <code className="text-midnight-text">VITE_GOOGLE_CLIENT_ID</code> isn&apos;t set in{' '}
            <code className="text-midnight-text">client/.env</code>. Create an OAuth client ID
            in the Google Cloud Console, put it in both{' '}
            <code className="text-midnight-text">client/.env</code> and{' '}
            <code className="text-midnight-text">server/.env</code>, then restart both dev
            servers.
          </p>
          <p className="mt-2 text-sm text-midnight-muted">
            Full walkthrough: <span className="text-accent-orange">DEPLOYMENT.md</span> → step 1.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Sign-in was cancelled or failed.')}
            theme="filled_black"
            shape="square"
            text="continue_with"
          />
        </div>
      )}

      {error && (
        <p className="mt-5 border-l-2 border-rating-blackout bg-midnight-surface px-4 py-2.5 text-sm text-rating-blackout text-left">
          {error}
        </p>
      )}
    </div>
  );
}
