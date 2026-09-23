import { ImageResponse } from 'next/og';
export const runtime = 'nodejs';
export const alt = 'Marina & Thiago — 04 de abril de 2025, Praia do Cumbuco';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function OpenGraph() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', background: '#f3f0e8', color: '#2e3c33', display: 'flex', flexDirection: 'column', padding: '75px', justifyContent: 'space-between' }}><div style={{ fontSize: 20, letterSpacing: 5 }}>UM DIA PARA REVIVER</div><div style={{ fontSize: 104, fontFamily: 'serif' }}>Marina & Thiago</div><div style={{ height: 1, background: '#bab9a9', width: '100%' }} /><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 23 }}><span>04.04.2025</span><span>PRAIA DO CUMBUCO · CEARÁ</span></div></div>, size);
}
