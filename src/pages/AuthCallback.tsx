import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useUIStore } from '../store/uiStore';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function AuthCallback() {
  const navigate = useNavigate();
  const setUser = useUIStore(s => s.setUser);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('tier')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUser(session.user.id, data?.tier ?? 'free');
            navigate('/', { replace: true });
          });
      } else {
        navigate('/', { replace: true });
      }
    });
  }, [navigate, setUser]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#080C18',
      color: '#475569',
      fontFamily: 'monospace',
      fontSize: '13px',
      letterSpacing: '0.06em',
    }}>
      SIGNING IN...
    </div>
  );
}
