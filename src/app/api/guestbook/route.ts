import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { weddingId } from '@/lib/manifest';
import { messageSchema } from '@/lib/guestbook/validation';
import { listMessages, saveMessage, storageMode, NotConfiguredError, RateLimitError } from '@/lib/guestbook/store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } }); }
function failure(error: unknown) {
  if (error instanceof RateLimitError) return NextResponse.json({ error: 'Você já enviou algumas lembranças. Aguarde 15 minutos para escrever novamente.' }, { status: 429, headers: { 'Retry-After': '900', 'Cache-Control': 'no-store' } });
  if (error instanceof NotConfiguredError) return json({ error: 'O mural está sendo preparado. Volte em breve para deixar sua lembrança.' }, 503);
  console.error('Guestbook operation failed:', error instanceof Error ? error.name : 'StorageError');
  return json({ error: 'Não foi possível salvar agora. Sua mensagem continua no formulário. Tente novamente.' }, 503);
}
export async function GET(request: NextRequest) {
  if (storageMode() === 'unavailable') return json({ messages: [], mode: 'unavailable', hasMore: false });
  const before = request.nextUrl.searchParams.get('before') || undefined;
  if (before && (!/^\d{4}-\d{2}-\d{2}T/.test(before) || !Number.isFinite(Date.parse(before)))) return json({ error: 'Data inválida.' }, 400);
  try { const messages = await listMessages(weddingId, before); return json({ messages, mode: storageMode(), hasMore: messages.length === 12 }); } catch (error) { return failure(error); }
}
async function readBoundedJson(request: NextRequest) {
  if (Number(request.headers.get('content-length')) > 1048576) throw new Error('BODY_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 1048576) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); } chunks.push(value); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function POST(request: NextRequest) {
  const production = process.env.NODE_ENV === 'production';
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : request.nextUrl.origin;
  const origin = request.headers.get('origin');
  const localOrigins = ["http://localhost:" + (request.nextUrl.port || '3000'), "http://127.0.0.1:" + (request.nextUrl.port || '3000')];
  if (origin !== allowedOrigin && (production || !origin || !localOrigins.includes(origin))) return json({ error: 'Origem inválida.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Formato inválido.' }, 415);
  let body: unknown;
  try { body = await readBoundedJson(request); } catch { return json({ error: 'A mensagem excede o tamanho permitido ou está incompleta.' }, 400); }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'Confira seu nome e escreva uma mensagem de 5 a 1.200 caracteres.' }, 400);
  if (storageMode() === 'unavailable') return failure(new NotConfiguredError());
  if (production && (!process.env.TURNSTILE_SECRET_KEY || !process.env.RATE_LIMIT_SECRET || !process.env.NEXT_PUBLIC_SITE_URL)) return failure(new NotConfiguredError());
  const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : process.env.TRUST_CLOUDFLARE_PROXY === 'true' ? request.headers.get('cf-connecting-ip') : 'local-or-untrusted-proxy';
  if (process.env.TURNSTILE_SECRET_KEY) {
    if (!parsed.data.turnstile_token) return json({ error: 'Confirme a verificação antes de enviar.' }, 400);
    try {
      const form = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: parsed.data.turnstile_token });
      if (ip && ip !== 'local-or-untrusted-proxy') form.set('remoteip', ip);
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, signal: AbortSignal.timeout(8000) });
      const result = await response.json();
      const expectedHost = new URL(allowedOrigin).hostname;
      if (!response.ok || !result.success || (production && result.hostname !== expectedHost) || result.action !== 'guestbook' || result.cdata !== weddingId) return json({ error: 'A verificação expirou. Confirme novamente e tente enviar.' }, 400);
    } catch { return json({ error: 'A verificação não respondeu. Tente novamente em instantes.' }, 503); }
  }
  const ipHash = createHmac('sha256', process.env.RATE_LIMIT_SECRET || 'development-preview-only').update(ip || 'unknown').digest('hex');
  try { const message = await saveMessage(weddingId, parsed.data, ipHash); return json({ message, mode: storageMode() }, 201); } catch (error) { return failure(error); }
}

