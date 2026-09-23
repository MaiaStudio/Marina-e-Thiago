import { z } from 'zod';
const clean = (value: string) => value.normalize('NFC').replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
export const messageSchema = z.object({
  guest_name: z.string().max(80).transform(clean).pipe(z.string().min(2, 'Escreva seu nome.').max(80)),
  relationship: z.string().max(80).default('').transform(clean),
  message: z.string().max(1200, 'A mensagem pode ter até 1.200 caracteres.').transform(clean).pipe(z.string().min(5, 'Escreva uma lembrança com pelo menos 5 caracteres.').max(1200)),
  avatar_url: z.string().max(500000).optional(),
  turnstile_token: z.string().max(2048).default(''),
  website: z.string().max(0).optional(),
});
export type MessageInput = z.infer<typeof messageSchema>;
export type GuestMessage = { id: string; wedding_id: string; guest_name: string; relationship: string; message: string; avatar_url?: string; status: 'approved' | 'pending' | 'rejected'; created_at: string };
export const RATE_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT = 3;
export function publicMessage(message: GuestMessage): GuestMessage {
  return { id: message.id, wedding_id: message.wedding_id, guest_name: message.guest_name, relationship: message.relationship, message: message.message, avatar_url: message.avatar_url, status: message.status, created_at: message.created_at };
}
