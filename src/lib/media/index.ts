export function mediaUrl(src: string) {
  const base = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/$/, '');
  return base && src.startsWith('/media/') ? `${base}/marina-thiago/${src.slice(7)}` : src;
}
