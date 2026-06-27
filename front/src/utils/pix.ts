/**
 * Gerador de QR Code PIX (BR Code EMV QRCPS-MPM) no frontend.
 *
 * Usa pix-utils para montar o payload EMV e gerar a imagem PNG (dataURL).
 *
 * O beneficio:
 *   - Sem requisição ao backend para gerar QR (gera no client, offline-capable).
 *   - Opcionalmente, com a string BR Code, podemos usar `qrcode.toDataURL()`
 *     para gerar a imagem em qualquer tamanho.
 *   - Para copiar imagem + texto para o WhatsApp Web, usamos ClipboardItem.
 *
 * Limites BACEN:
 *   - merchantName ≤ 25 chars, ASCII/upper.
 *   - merchantCity  ≤ 15 chars, ASCII/upper.
 *   - txid          ≤ 25 chars, alfanum.
 */
import { createStaticPix } from 'pix-utils';
import QRCode from 'qrcode';

/** Remove acentos (NFKD) + colapsa espaços + UPPER. */
function normalize(value: string): string {
  if (!value) return '';
  // NFKD nativo do JS já separa a base dos combining marks (U+0300..U+036F),
  // idêntico ao unicodedata.normalize('NFKD', s) do Python.
  const nfkd = value.normalize('NFKD');
  let cleaned = '';
  for (const ch of nfkd) {
    const c = ch.codePointAt(0)!;
    if (c < 0x300 || c > 0x36f) cleaned += ch;
  }
  return cleaned.replace(/\s+/g, ' ').trim().toUpperCase();
}

export interface BuildPixArgs {
  chave: string;          // Ex: '+5585999999999'
  valor: number;          // Valor em reais (ex: 120.50)
  txid: string;           // Identificador (ex: 'DTF1')
  beneficiario: string;   // Nome do favorecido (≤25)
  cidade: string;         // Cidade do favorecido (≤15)
}

/**
 * Normaliza chave PIX para o formato que o BR Code exige.
 * - Telefone: prefixa +55 se vier só DDD+numero
 * - CPF/CNPJ/e-mail/EVP: mantém como está
 * - Remove tudo que não é dígito de chaves numéricas
 */
function normalizarChavePix(chave: string): string {
  const raw = (chave || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!raw) return '';
  // se já tem + no início, assume E.164 e retorna como está
  if (raw.startsWith('+')) return raw;
  // Telefone BR: 10 ou 11 dígitos só → vira +55 + DDD + número
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  // CPF (11) ou CNPJ (14) → mantém só dígitos (formato BACEM)
  if (digits.length === 11 || digits.length === 14) {
    return digits;
  }
  // e-mail ou EVP/UUID → mantem como digitado
  return raw;
}

/** Retorna o payload BR Code (string EMV) pronto para QR. */
export function buildPixBRCode({ chave, valor, txid, beneficiario, cidade }: BuildPixArgs): string {
  const pixKey = normalizarChavePix(chave);
  if (!pixKey) {
    throw new Error('Chave PIX vazia. Configure em Configurações da Loja.');
  }
  const pix = createStaticPix({
    merchantName: normalize(beneficiario).slice(0, 25) || 'LOJA',
    merchantCity: normalize(cidade).slice(0, 15) || 'SAO PAULO',
    pixKey,
    transactionAmount: Number(valor) || 0,
    txid: normalize(txid).slice(0, 25) || '***',
  });

  if ('hasError' in pix && pix.hasError) {
    throw new Error(pix.error?.message || 'Falha ao gerar payload PIX.');
  }

  return pix.toBRCode();
}

/** Gera o QR como data URL (PNG base64-inline). */
export async function buildPixQRDataURL(payload: string): Promise<string> {
  return await QRCode.toDataURL(payload, {
    width: 512,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

/** Faz dataURL → Blob (PNG) para colar no clipboard. */
export function dataURLtoBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',');
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mime = mimeMatch?.[1] || 'image/png';
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
