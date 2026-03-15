export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto não enviado' });
    const result = parseNFCeText(text);
    if (!result.itens || result.itens.length === 0) {
      return res.status(422).json({ error: 'Nenhum item encontrado. Copie o texto completo da nota.' });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('[api/parse-nfce]', err);
    return res.status(500).json({ error: String(err.message) });
  }
}

function parseNFCeText(text) {
  const result = { fornecedor: '', cnpj: '', emissao: '', chave: '', itens: [], total: 0, desconto: 0, valor_pagar: 0 };
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('CNPJ:')) {
      const m = lines[i].match(/CNPJ:\s*([\d.\/-]+)/);
      if (m) result.cnpj = m[1];
      if (i > 0) result.fornecedor = lines[i - 1];
      break;
    }
  }

  const chaveM = text.match(/Chave de acesso:\s*([\d\s]{40,60})/);
  if (chaveM) result.chave = chaveM[1].replace(/\s/g, '').trim();
  const emissaoM = text.match(/miss[aã]o[:\s]+([\d\/]+)/i);
  if (emissaoM) result.emissao = emissaoM[1];

  // Funciona para texto inline (tudo numa linha) E multiline
  const itemRe = /(.+?)\(C[oó]digo:\s*\d+\s*\)\s*Qtde\.:(\d+)UN:\s*([A-Z]+)Vl\.\s*Unit\.:\s*([\d\s,]+?)Vl\.\s*Total\s*([\d,]+)/gi;
  let m;
  while ((m = itemRe.exec(text)) !== null) {
    let nome = m[1].trim().replace(/[\d,]+\S*\s*$/, '').trim();
    if (!nome) continue;
    result.itens.push({
      nome,
      quantidade: parseInt(m[2]),
      unidade: m[3].toUpperCase(),
      vl_unit: parseFloat(m[4].replace(/\s/g, '').replace(',', '.')) || 0,
      vl_total: parseFloat(m[5].replace(',', '.')) || 0,
    });
  }

  const totalM = text.match(/Valor total R\$[:\s]*([\d,]+)/);
  if (totalM) result.total = parseFloat(totalM[1].replace(',', '.'));
  const descM = text.match(/Descontos R\$[:\s]*([\d,]+)/);
  if (descM) result.desconto = parseFloat(descM[1].replace(',', '.'));
  const pagarM = text.match(/Valor a pagar R\$[:\s]*([\d,]+)/);
  if (pagarM) result.valor_pagar = parseFloat(pagarM[1].replace(',', '.'));

  return result;
}
