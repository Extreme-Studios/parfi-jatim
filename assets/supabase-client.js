window.ParfiSupabase = (() => {
  let clientPromise;
  const getClient = () => {
    if (!clientPromise) clientPromise = fetch('/api/supabase-config', { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'Konfigurasi login belum tersedia.');
        if (!window.supabase?.createClient) throw new Error('Library login tidak dapat dimuat.');
        return window.supabase.createClient(payload.url, payload.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      });
    return clientPromise;
  };
  return { getClient };
})();
