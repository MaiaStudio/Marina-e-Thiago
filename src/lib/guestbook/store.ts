import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { RATE_LIMIT, RATE_WINDOW_MS, publicMessage, type GuestMessage, type MessageInput } from './validation';
export class RateLimitError extends Error {}
export class NotConfiguredError extends Error {}
const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const getSupabaseKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

const localPath = () => {
  if (process.env.GUESTBOOK_LOCAL_PATH) return path.resolve(process.env.GUESTBOOK_LOCAL_PATH);
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production') {
    return path.join('/tmp', 'guestbook.json');
  }
  return path.resolve('.data/guestbook.json');
};

export function storageMode(): 'supabase' | 'local' | 'unavailable' {
  if (getSupabaseUrl() && getSupabaseKey()) return 'supabase';
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
  try {
    return JSON.parse(await readFile(/* turbopackIgnore: true */ localPath(), 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      try {
        const fallback = path.resolve('.data/guestbook.json');
        return JSON.parse(await readFile(/* turbopackIgnore: true */ fallback, 'utf8'));
      } catch {
        return [];
      }
    }
    throw e;
  }
}

// Serialized writes are only for the single-process development preview. Production uses a Postgres transaction.
let writeQueue: Promise<unknown> = Promise.resolve();

export async function listMessages(weddingId: string, before?: string): Promise<GuestMessage[]> {
  if (!weddingId) throw new Error('wedding_id is required');
  if (storageMode() === 'supabase') {
    try {
      let query = db().from('guestbook_messages').select('id,wedding_id,guest_name,relationship,message,avatar_url,status,created_at').eq('wedding_id', weddingId).eq('status', 'approved').order('created_at', { ascending: false }).limit(12);
      if (before) query = query.lt('created_at', before);
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) return data as GuestMessage[];
    } catch (err) {
      console.warn('Supabase listMessages error, falling back to local:', err instanceof Error ? err.message : err);
    }
  }
  return (await readLocal()).filter(m => m.wedding_id === weddingId && m.status === 'approved' && (!before || m.created_at < before)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12).map(publicMessage);
}

export async function saveMessage(weddingId: string, input: MessageInput, ipHash: string): Promise<GuestMessage> {
  if (!weddingId) throw new Error('wedding_id is required');
  if (storageMode() === 'supabase') {
    try {
      const { data, error } = await db().rpc('submit_guestbook_message', {
        p_wedding_id: weddingId,
        p_guest_name: input.guest_name,
        p_relationship: input.relationship || '',
        p_message: input.message,
        p_ip_hash: ipHash,
      });
      if (error?.message?.includes('RATE_LIMITED')) throw new RateLimitError();
      if (!error && data) return publicMessage(data as GuestMessage);
      if (error) {
        console.warn('Supabase RPC error, trying direct insert:', error.message);
        const { data: directData, error: insertError } = await db()
          .from('guestbook_messages')
          .insert({
            wedding_id: weddingId,
            guest_name: input.guest_name.trim(),
            relationship: (input.relationship || '').trim(),
            message: input.message.trim(),
            avatar_url: input.avatar_url || null,
            status: 'approved',
          })
          .select()
          .single();
        if (insertError) throw insertError;
        return publicMessage(directData as GuestMessage);
      }
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      console.error('Supabase saveMessage failed, falling back to local:', err instanceof Error ? err.message : err);
    }
  }

  const pending = writeQueue.catch(() => undefined).then(async () => {
    const all = await readLocal();
    const recent = all.filter(m => m.wedding_id === weddingId && m.ip_hash === ipHash && Date.now() - Date.parse(m.created_at) < RATE_WINDOW_MS);
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

