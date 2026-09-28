import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { weddingId } from '@/lib/manifest';
import { messageSchema } from '@/lib/guestbook/validation';
import { listMessages, saveMessage, storageMode, NotConfiguredError, RateLimitError, getSupabaseUrl } from '@/lib/guestbook/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function attachDiagnosticHeaders(response: NextResponse) {
  const envKeys = Object.keys(process.env).filter(k => k.toLowerCase().includes('supabase') || k.toLowerCase().includes('guestbook') || k.toLowerCase().includes('rate'));
  response.headers.set('x-guestbook-matched-keys', envKeys.join(','));
  response.headers.set('x-guestbook-has-url', String(!!(process.env.SUPABASE_URL || process.env.marinathiago_SUPABASE_URL)));
  response.headers.set('x-guestbook-has-secret-key', String(!!(process.env.SUPABASE_SECRET_KEY || process.env.marinathiago_SUPABASE_SECRET_KEY)));
  response.headers.set('x-guestbook-has-service-role-key', String(!!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.marinathiago_SUPABASE_SERVICE_ROLE_KEY)));
  response.headers.set('x-guestbook-raw-url', String(!!process.env.SUPABASE_URL));
  response.headers.set('x-guestbook-pref-url', String(!!process.env.marinathiago_SUPABASE_URL));
  response.headers.set('x-guestbook-raw-role', String(!!process.env.SUPABASE_SERVICE_ROLE_KEY));
  response.headers.set('x-guestbook-pref-role', String(!!process.env.marinathiago_SUPABASE_SERVICE_ROLE_KEY));
  return response;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function failure(error: unknown) {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: 'Você já enviou algumas lembranças. Aguarde 15 minutos para escrever novamente.' },
      { status: 429, headers: { 'Retry-After': '900', 'Cache-Control': 'no-store' } }
    );
  }
  if (error instanceof NotConfiguredError) {
    console.warn('[GUESTBOOK] Supabase not configured');
    return attachDiagnosticHeaders(json({ error: 'O mural está sendo preparado. Volte em breve para deixar sua lembrança.' }, 503));
  }
  console.error('[GUESTBOOK] Operation failed:', error instanceof Error ? error.message : error);
  return json({ error: 'Não foi possível salvar agora. Sua mensagem continua no formulário. Tente novamente.' }, 503);
}

export async function GET(request: NextRequest) {
  const mode = storageMode();
  if (mode === 'unavailable') {
    return attachDiagnosticHeaders(json({ messages: [], mode: 'unavailable', hasMore: false }));
  }
  if (mode === 'supabase') {
    console.log('[GUESTBOOK] Storage mode: supabase');
  }
  const before = request.nextUrl.searchParams.get('before') || undefined;
  if (before && (!/^\d{4}-\d{2}-\d{2}T/.test(before) || !Number.isFinite(Date.parse(before)))) {
    return json({ error: 'Data inválida.' }, 400);
  }
  try {
    const messages = await listMessages(weddingId, before);
    return attachDiagnosticHeaders(json({ messages, mode, hasMore: messages.length === 12 }));
  } catch (error) {
    return failure(error);
  }
}

async function readBoundedJson(request: NextRequest) {
  if (Number(request.headers.get('content-length')) > 1048576) throw new Error('BODY_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1048576) {
      await reader.cancel();
      throw new Error('BODY_TOO_LARGE');
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function POST(request: NextRequest) {
  const production = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://marinathiago.vercel.app';
  const allowedOrigin = new URL(siteUrl).origin;
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const hostOrigin = host ? `${request.nextUrl.protocol}//${host}` : request.nextUrl.origin;
  const localOrigins = [
    'http://localhost:' + (request.nextUrl.port || '3000'),
    'http://127.0.0.1:' + (request.nextUrl.port || '3000'),
    'http://localhost:5000',
    'http://127.0.0.1:5000',
  ];

  const isAllowedOrigin =
    !origin ||
    origin === allowedOrigin ||
    origin === hostOrigin ||
    origin === request.nextUrl.origin ||
    localOrigins.includes(origin) ||
    (origin.startsWith('https://') && origin.endsWith('.vercel.app'));

  if (!isAllowedOrigin) {
    console.warn(`[GUESTBOOK] Origin rejected: ${origin}`);
    return json({ error: 'Origem inválida.' }, 403);
  }

  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return json({ error: 'Formato inválido.' }, 415);
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch {
    return json({ error: 'A mensagem excede o tamanho permitido ou está incompleta.' }, 400);
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Confira seu nome e escreva uma mensagem de 5 a 1.200 caracteres.' }, 400);
  }

  if (storageMode() === 'unavailable') {
    return failure(new NotConfiguredError());
  }

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

  if (turnstileSiteKey && turnstileSecret) {
    if (!parsed.data.turnstile_token) {
      console.warn('[GUESTBOOK] Turnstile validation failed: missing token');
      return json({ error: 'Confirme a verificação antes de enviar.' }, 400);
    }
    const ip = process.env.VERCEL
      ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
      : process.env.TRUST_CLOUDFLARE_PROXY === 'true'
      ? request.headers.get('cf-connecting-ip')
      : 'local-or-untrusted-proxy';

    try {
      const form = new URLSearchParams({
        secret: turnstileSecret,
        response: parsed.data.turnstile_token,
      });
      if (ip && ip !== 'local-or-untrusted-proxy') form.set('remoteip', ip);
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(8000),
      });
      const result = await response.json();
      const expectedHost = new URL(allowedOrigin).hostname;
      const hostWithoutPort = host ? host.split(':')[0] : null;

      const hostMatches =
        result.hostname === expectedHost ||
        result.hostname === hostWithoutPort ||
        (result.hostname && result.hostname.endsWith('.vercel.app')) ||
        result.hostname === 'localhost' ||
        result.hostname === '127.0.0.1';

      if (!response.ok || !result.success || (production && !hostMatches) || result.action !== 'guestbook' || result.cdata !== weddingId) {
        console.warn('[GUESTBOOK] Turnstile validation failed:', result['error-codes'] || result);
        return json({ error: 'A verificação expirou. Confirme novamente e tente enviar.' }, 400);
      }
    } catch (e) {
      console.error('[GUESTBOOK] Turnstile verification network error:', e instanceof Error ? e.message : e);
      return json({ error: 'A verificação não respondeu. Tente novamente em instantes.' }, 503);
    }
  } else if (turnstileSiteKey || turnstileSecret) {
    console.warn('[GUESTBOOK] Incomplete Turnstile configuration: both NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are required.');
  }

  const ip = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    : process.env.TRUST_CLOUDFLARE_PROXY === 'true'
    ? request.headers.get('cf-connecting-ip')
    : 'local-or-untrusted-proxy';

  const rateSecret = process.env.RATE_LIMIT_SECRET || (production ? weddingId : 'development-preview-only');
  const ipHash = createHmac('sha256', rateSecret).update(ip || 'unknown').digest('hex');

  try {
    const message = await saveMessage(weddingId, parsed.data, ipHash);
    return json({ message, mode: storageMode() }, 201);
  } catch (error) {
    return failure(error);
  }
}
