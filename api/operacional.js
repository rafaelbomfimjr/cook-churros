import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('dados')
        .select('valor')
        .eq('chave', 'operacional')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return res.status(200).json(data ? data.valor : null);
    }

    if (req.method === 'POST') {
      const { error } = await supabase
        .from('dados')
        .upsert({ chave: 'operacional', valor: req.body }, { onConflict: 'chave' });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    console.error('[api/operacional]', err);
    return res.status(500).json({ error: String(err.message) });
  }
}
