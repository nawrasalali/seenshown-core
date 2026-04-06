import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
  console.error('[SeenShown] Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Auth state listener — keeps UIStore in sync with Supabase session
import { useUIStore } from '../store/uiStore';

supabase.auth.onAuthStateChange(async (event, session) => {
  const setUser = useUIStore.getState().setUser;

  if (event === 'SIGNED_IN' && session?.user) {
    const { data } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', session.user.id)
      .single();
    setUser(session.user.id, data?.tier ?? 'free');
  }

  if (event === 'SIGNED_OUT') {
    setUser(null, 'free');
  }
});
