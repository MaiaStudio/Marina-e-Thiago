import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { messageSchema } from '../src/lib/guestbook/validation';
import { listMessages, saveMessage, storageMode, RateLimitError } from '../src/lib/guestbook/store';
import manifest from '../src/content/weddings/marina-thiago/manifest.json';
const directory = mkdtempSync(path.join(tmpdir(), 'wedding-tests-'));
process.env.GUESTBOOK_LOCAL_PATH = path.join(directory,'messages.json');
Object.assign(process.env,{NODE_ENV:'test',SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''});
const input = messageSchema.parse({ guest_name:'Convidado de teste', relationship:'Amizade', message:'Uma lembrança real para guardar.' });
after(async()=>{await unlink(path.join(directory,'messages.json')).catch(()=>{});await rmdir(directory);});
test('all 77 inspected photographs have unique IDs, valid focal points and optimized variants',()=>{
  assert.equal(manifest.assets.length,77);
  assert.equal(new Set(manifest.assets.map(p=>p.id)).size,77);
  assert.equal(manifest.assets.filter(p=>p.featured).length,36);
  const order=manifest.assets.filter(p=>p.featured).map(p=>p.narrativeOrder).sort((a,b)=>a!-b!);
  assert.deepEqual(order,Array.from({length:36},(_,i)=>i+1));
  for(const p of manifest.assets){assert.ok(p.alt.length>20);assert.ok(p.variants.length>=4);assert.ok(p.variants.every(v=>v.width<=1440&&/\.(avif|webp)$/.test(v.src)));assert.ok(p.focalPoint.x>=0&&p.focalPoint.x<=100);}
});
test('server input validation rejects empty, oversized and honeypot submissions',()=>{
  assert.equal(messageSchema.safeParse({...input,message:'    '}).success,false);
  assert.equal(messageSchema.safeParse({...input,message:'a'.repeat(1201)}).success,false);
  assert.equal(messageSchema.safeParse({...input,website:'spam.example'}).success,false);
  assert.equal(messageSchema.safeParse({...input,guest_name:'a'}).success,false);
  const safe=messageSchema.parse({...input,guest_name:' <b>Marina</b> ',message:'<img src=x onerror=alert(1)>Um carinho.'});
  assert.equal(safe.guest_name,'Marina');assert.equal(safe.message,'Um carinho.');
});
test('persistent storage filters every read by wedding_id and hides unapproved messages',async()=>{
  const a=await saveMessage('wedding-a',input,'ip-a');
  await saveMessage('wedding-b',{...input,message:'Esta mensagem pertence a outro casamento.'},'ip-a');
  const own=await listMessages('wedding-a');assert.equal(own.length,1);assert.equal(own[0].id,a.id);assert.equal('ip_hash' in own[0],false);
  await assert.rejects(()=>listMessages(''));
  const stored=JSON.parse(await readFile(path.join(directory,'messages.json'),'utf8'));
  stored.find((m:{id:string})=>m.id===a.id).status='pending';
  await writeFile(path.join(directory,'messages.json'),JSON.stringify(stored));
  assert.equal((await listMessages('wedding-a')).length,0);
});
test('concurrent submissions enforce the three-per-window limit independently per wedding',async()=>{
  const results=await Promise.allSettled(Array.from({length:9},()=>saveMessage('rate-wedding',input,'one-ip')));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,3);
  assert.ok(results.filter(r=>r.status==='rejected').every(r=>r.status==='rejected'&&r.reason instanceof RateLimitError));
  assert.equal((await listMessages('rate-wedding')).length,3);
  await saveMessage('different-wedding',input,'one-ip');
});
test('storageMode returns supabase when credentials exist, local otherwise', () => {
  assert.equal(storageMode(), 'local');
  Object.assign(process.env, { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key' });
  assert.equal(storageMode(), 'supabase');
  Object.assign(process.env, { SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' });
});
