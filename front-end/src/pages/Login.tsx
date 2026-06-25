import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { GoogleLogo, EnvelopeSimple, Key, ArrowLeft } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { goeyToast as toast } from 'goey-toast';

const getFriendlyAuthErrorMessage = (err: any): string => {
  const code = err?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return 'The password is too weak. It must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'The email address format is invalid.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/popup-closed-by-user':
      return 'The sign-in popup was closed before completion. Please try again.';
    default:
      return err?.message || 'Authentication failed. Please try again.';
  }
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect user to where they tried to go, or fallback to catalog (/)
  const from = location.state?.from?.pathname || '/';

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && password !== confirmPassword) {
      toast.error('Password confirmation does not match.');
      return;
    }
    setIsLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Registration successful. Welcome.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back.');
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Welcome back.');
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center p-6 text-ink relative">
      {/* Back to Catalog shortcut */}
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-steel hover:text-ink transition-colors">
          <ArrowLeft size={14} weight="bold" /> BACK TO CATALOG
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="w-full max-w-md bg-white border border-whisper p-8"
      >
        <div className="mb-8 text-center sm:text-left">
          <span className="text-[9px] font-black tracking-widest text-steel uppercase border border-whisper px-3 py-1 bg-surface">
            {isSignUp ? 'REGISTRATION' : 'SECURE SESSION'}
          </span>
          <h1 className="text-2xl font-black tracking-tight uppercase mb-2 mt-4 text-ink">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-[10px] text-steel font-bold uppercase tracking-wider leading-relaxed">
            {isSignUp 
              ? 'Register to begin an exclusive shopping experience.' 
              : 'Sign in to your account to complete your transaction.'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 mb-6">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-steel">
              <EnvelopeSimple size={16} />
            </span>
            <input
              type="email"
              placeholder="EMAIL ADDRESS"
              className="w-full h-12 pl-11 pr-4 bg-surface border border-whisper outline-none focus:border-black transition-colors text-xs font-bold uppercase tracking-wider text-ink placeholder:text-steel"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-steel">
              <Key size={16} />
            </span>
            <input
              type="password"
              placeholder="PASSWORD"
              className="w-full h-12 pl-11 pr-4 bg-surface border border-whisper outline-none focus:border-black transition-colors text-xs font-bold uppercase tracking-wider text-ink placeholder:text-steel"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <AnimatePresence initial={false}>
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-steel">
                    <Key size={16} />
                  </span>
                  <input
                    type="password"
                    placeholder="CONFIRM PASSWORD"
                    className="w-full h-12 pl-11 pr-4 bg-surface border border-whisper outline-none focus:border-black transition-colors text-xs font-bold uppercase tracking-wider text-ink placeholder:text-steel"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={isSignUp}
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-neutral-900 transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <EnvelopeSimple weight="bold" size={14} /> {isSignUp ? 'Create Account' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-whisper flex-1"></div>
          <span className="text-[9px] font-black uppercase tracking-widest text-steel">OR</span>
          <div className="h-px bg-whisper flex-1"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-12 bg-white border border-whisper hover:border-black text-ink font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
          ) : (
            <>
              <GoogleLogo weight="bold" size={14} /> SIGN IN WITH GOOGLE
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-[10px] text-black hover:underline font-black uppercase tracking-widest focus:outline-none cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
