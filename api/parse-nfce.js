export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'PDF não enviado' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            },
            {
              type: 'text',
              text: `Extraia os dados desta NFC-e e retorne APENAS um JSON válido (sem markdown, sem texto extra) com este formato:
{
  "fornecedor": "nome da loja",
  "cnpj": "XX.XXX.XXX/XXXX-XX",
  "emissao": "DD/MM/AAAA",
  "chave": "44 dígitos sem espaço",
  "itens": [
    {
      "nome": "NOME DO PRODUTO",
      "quantidade": 9,
      "unidade": "PCE",
      "vl_unit": 1.99,
      "vl_total": 17.91
    }
  ],
  "total": 55.87,
  "desconto": 12.89,
  "valor_pagar": 42.98
}`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API erro ${response.status}: ${err}`);
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[api/parse-nfce]', err);
    return res.status(500).json({ error: String(err.message) });
  }
}
