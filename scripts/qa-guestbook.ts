import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
async function main(){
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();const created:string[]=[];
try {
 await page.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});
 await page.locator('#lembrancas').scrollIntoViewIfNeeded();await page.waitForTimeout(400);
 await page.getByRole('button',{name:'Escrever para o casal'}).tap();await page.waitForTimeout(400);
 await page.getByLabel('Seu nome').fill('QA — teste automatizado');
 await page.getByLabel('Relação com o casal').fill('Verificação local');
 await page.getByLabel('Sua lembrança').fill('Uma lembrança de teste para conferir a persistência do mural.');
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/guestbook')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Enviar lembrança'}).tap();
 const response=await responsePromise;assert.equal(response.status(),201);const result=await response.json();created.push(result.message.id);
 await page.getByText('Carinho registrado.').waitFor();await page.getByRole('button',{name:'Voltar às lembranças'}).tap();
 await page.reload({waitUntil:'networkidle'});await page.locator('#lembrancas').scrollIntoViewIfNeeded();await page.waitForTimeout(400);
 await page.locator('.message-fragment footer').filter({hasText:'QA — teste automatizado'}).waitFor();
 assert.equal(await page.locator('.message-fragment footer').filter({hasText:'QA — teste automatizado'}).count(),1);
 const post=async(body:unknown)=>{const r=await context.request.post('http://127.0.0.1:3000/api/guestbook',{headers:{Origin:'http://127.0.0.1:3000'},data:body});return {status:r.status(),data:await r.json()};};
 const invalid=await post({guest_name:'QA',message:'a'.repeat(1201)});
 const honeypot=await post({guest_name:'QA',message:'Uma mensagem válida',website:'spam'});
 const second=await post({guest_name:'QA — limite 2',message:'Teste local do limite de mensagens.'});
 const third=await post({guest_name:'QA — limite 3',message:'Teste local do limite de mensagens.'});
 const limited=await post({guest_name:'QA — limite 4',message:'Teste local do limite de mensagens.'});
 const checks={invalid,honeypot,second,third,limited};
 for(const response of [checks.second,checks.third])if(response.data.message)created.push(response.data.message.id);
 assert.equal(checks.invalid.status,400);assert.equal(checks.honeypot.status,400);assert.equal(checks.limited.status,429);
 const origin=await context.request.post('http://127.0.0.1:3000/api/guestbook',{headers:{Origin:'https://untrusted.example'},data:{guest_name:'QA',message:'Uma mensagem'}});assert.equal(origin.status(),403);
 await writeFile('reports/qa/guestbook-results.json',JSON.stringify({formSubmission:response.status(),persistedAfterReload:true,oversized:checks.invalid.status,honeypot:checks.honeypot.status,rateLimit:checks.limited.status,foreignOrigin:origin.status()},null,2));
 console.log('Guestbook: form, persistence, validation, honeypot, rate limiting and origin protection passed.');
} finally {
 // Remove only the exact test message IDs created by this run; preserve any real messages.
 if(created.length){const file='.data/guestbook.json';const rows=JSON.parse(await readFile(file,'utf8'));await writeFile(file,JSON.stringify(rows.filter((r:{id:string})=>!created.includes(r.id)),null,2));}
 await browser.close();
}}
main().catch(e=>{console.error(e);process.exitCode=1;});



