import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { RATE_LIMIT, RATE_WINDOW_MS, publicMessage, type GuestMessage, type MessageInput } from './validation';

export class RateLimitError extends Error {}
export class NotConfiguredError extends Error {}

export const getSupabaseUrl = () =>
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

export const getSupabaseKey = () =>
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

const localPath = () => path.resolve(/* turbopackIgnore: true */ process.env.GUESTBOOK_LOCAL_PATH || '.data/guestbook.json');

export function storageMode(): 'supabase' | 'local' | 'unavailable' {
  if (getSupabaseUrl() && getSupabaseKey()) return 'supabase';
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) return 'unavailable';
  return 'local';
}

function db() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!url || !key) throw new NotConfiguredError();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Stored = GuestMessage & { ip_hash: string };

async function readLocal(): Promise<Stored[]> {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new NotConfiguredError();
  }
  try {
    return JSON.parse(await readFile(/* turbopackIgnore: true */ localPath(), 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

// Serialized writes are only for the single-process development preview. Production uses a Postgres transaction.
let writeQueue: Promise<unknown> = Promise.resolve();

export async function listMessages(weddingId: string, before?: string): Promise<GuestMessage[]> {
  if (!weddingId) throw new Error('wedding_id is required');
  const mode = storageMode();
  if (mode === 'unavailable') {
    throw new NotConfiguredError();
  }
  if (mode === 'supabase') {
    let query = db()
      .from('guestbook_messages')
      .select('id,wedding_id,guest_name,relationship,message,avatar_url,status,created_at')
      .eq('wedding_id', weddingId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12);

    if (before) query = query.lt('created_at', before);
    const { data, error } = await query;
    if (error) {
      console.error(`[GUESTBOOK] Supabase read failed: ${error.message}`);
      throw error;
    }
    return (data || []) as GuestMessage[];
  }

  // Local development mode
  return (await readLocal())
    .filter(m => m.wedding_id === weddingId && m.status === 'approved' && (!before || m.created_at < before))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12)
    .map(publicMessage);
}

export async function saveMessage(weddingId: string, input: MessageInput, ipHash: string): Promise<GuestMessage> {
  if (!weddingId) throw new Error('wedding_id is required');
  const mode = storageMode();
  if (mode === 'unavailable') {
    throw new NotConfiguredError();
  }

  if (mode === 'supabase') {
    const { data, error } = await db().rpc('submit_guestbook_message', {
      p_wedding_id: weddingId,
      p_guest_name: input.guest_name,
      p_relationship: input.relationship || '',
      p_message: input.message,
      p_ip_hash: ipHash,
      p_avatar_url: input.avatar_url || null,
    });

    if (error?.message?.includes('RATE_LIMITED')) {
      throw new RateLimitError();
    }
    if (error) {
      console.error(`[GUESTBOOK] Supabase RPC failed: ${error.message}`);
      throw error;
    }
    return publicMessage(data as GuestMessage);
  }

  // Local development mode only
  const pending = writeQueue.catch(() => undefined).then(async () => {
    const all = await readLocal();
    const recent = all.filter(
      m => m.wedding_id === weddingId && m.ip_hash === ipHash && Date.now() - Date.parse(m.created_at) < RATE_WINDOW_MS
    );
    if (recent.length >= RATE_LIMIT) throw new RateLimitError();
    const saved: Stored = {
      id: randomUUID(),
      wedding_id: weddingId,
      guest_name: input.guest_name,
      relationship: input.relationship || '',
      message: input.message,
      avatar_url: input.avatar_url,
      status: 'approved',
      created_at: new Date().toISOString(),
      ip_hash: ipHash,
    };
    all.push(saved);
    await mkdir(path.dirname(localPath()), { recursive: true });
    const temp = `${localPath()}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(all, null, 2), { mode: 0o600 });
    await rename(temp, localPath());
    return publicMessage(saved);
  });
  writeQueue = pending;
  return pending;
}
