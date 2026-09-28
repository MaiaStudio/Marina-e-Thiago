'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Camera, X } from 'lucide-react';
import { useScrollLock } from '@/components/narrative/SmoothScroll';
import { weddingId } from '@/lib/manifest';
import type { GuestMessage } from '@/lib/guestbook/validation';
import { TestimonialsColumn, type TestimonialItem } from '@/components/ui/testimonials-columns-1';

type TurnstileAPI = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

function Turnstile({ onToken, reset }: { onToken: (token: string) => void; reset: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey) return;
    let disposed = false;
    const render = () => {
      if (!disposed && ref.current && window.turnstile && widget.current === null) {
        widget.current = window.turnstile.render(ref.current, {
          sitekey,
          action: 'guestbook',
          cData: weddingId,
          theme: 'light',
          size: 'flexible',
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => {
            onToken('');
            setError(true);
          },
        });
      }
    };
    const existing = document.querySelector<HTMLScriptElement>('#turnstile-script');
    const script = existing || document.createElement('script');
    script.addEventListener('load', render);
    const fail = () => setError(true);
    script.addEventListener('error', fail);
    if (!existing) {
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      document.head.append(script);
    }
    render();
    return () => {
      disposed = true;
      script.removeEventListener('load', render);
      script.removeEventListener('error', fail);
      if (widget.current !== null) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [onToken]);

  useEffect(() => {
    if (widget.current !== null) window.turnstile?.reset(widget.current);
  }, [reset]);

  return (
    <div>
      <div ref={ref} />
      {error && (
        <p className="form-status error">
          Não foi possível abrir a verificação. Confira sua conexão e reabra o formulário.
        </p>
      )}
    </div>
  );
}


export default function GuestbookWall() {
  const section = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [open, setOpen] = useState(false);
  useScrollLock(open);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [message, setMessage] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [resetToken, setResetToken] = useState(0);
  const [mode, setMode] = useState('loading');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState<'approved' | 'pending' | null>(null);

  const receiveToken = useCallback((value: string) => setToken(value), []);

  const load = useCallback(async (before?: string) => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/guestbook${before ? `?before=${encodeURIComponent(before)}` : ''}`);
      const data = await response.json();
      if (!response.ok) throw new Error('Não foi possível ler as lembranças agora.');
      setMode(data.mode);
      setMessages(previous =>
        before
          ? [...previous, ...data.messages.filter((m: GuestMessage) => !previous.some(p => p.id === m.id))]
          : data.messages
      );
      setHasMore(data.hasMore);
    } catch {
      setLoadError('Não foi possível ler as lembranças agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          void load();
          observer.disconnect();
        }
      },
      { rootMargin: '500px' }
    );
    if (section.current) observer.observe(section.current);
    return () => observer.disconnect();
  }, [load]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('A foto selecionada é muito grande. Escolha uma foto de até 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetSize = 120;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Crop square center
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        setAvatarUrl(compressed);
        setError('');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const website = new FormData(event.currentTarget).get('website') || '';
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: name,
          relationship,
          message,
          avatar_url: avatarUrl || undefined,
          turnstile_token: token,
          website,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar. Tente novamente.');
      setSuccess(data.message.status);
      setMode(data.mode);
      if (data.message.status === 'approved') {
        setMessages(previous => [data.message, ...previous]);
      }
      setName('');
      setRelationship('');
      setMessage('');
      setAvatarUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confira sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
      setToken('');
      setResetToken(n => n + 1);
    }
  };

  // Prepare testimonials exclusively from real messages fetched from API / Supabase
  const { firstColumn, secondColumn } = useMemo(() => {
    const userTestimonials: TestimonialItem[] = messages.map(m => ({
      id: m.id,
      text: m.message,
      image: m.avatar_url,
      name: m.guest_name,
      role: m.relationship || 'Convidado',
    }));

    const col1 = userTestimonials.filter((_, i) => i % 2 === 0);
    const col2 = userTestimonials.filter((_, i) => i % 2 === 1);

    return {
      firstColumn: col1,
      secondColumn: col2,
    };
  }, [messages]);

  return (
    <section id="lembrancas" ref={section} className="guestbook" aria-labelledby="guestbook-title">
      <div className="guestbook-container">
        {/* Left Column: Heading, text and prominently highlighted CTA button */}
        <div className="guestbook-info">
          <div className="guestbook-heading">
            <h2 id="guestbook-title">
              Deixe uma
              <br />
              <em>lembrança.</em>
            </h2>
            <p className="guestbook-intro">
              Para Marina & Thiago.
              <br />
              Um carinho, uma história, um pedacinho desse dia contado por você.
            </p>
          </div>

          <Dialog.Root
            open={open}
            onOpenChange={value => {
              setOpen(value);
              if (value) {
                setSuccess(null);
                setError('');
              }
            }}
          >
            {/* Destaque maior para o botão "Escrever para o casal" */}
            <Dialog.Trigger className="guestbook-open-highlighted" data-magnetic>
              <span className="guestbook-btn-text">Escrever para o casal</span>
              <span className="guestbook-btn-arrow" aria-hidden="true">
                ↗
              </span>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" data-lenis-prevent />
              <Dialog.Content
                className="guestbook-sheet"
                data-lenis-prevent
                onEscapeKeyDown={e => {
                  if (submitting) e.preventDefault();
                }}
                onPointerDownOutside={e => {
                  if (submitting) e.preventDefault();
                }}
              >
                <div className="sheet-header">
                  <Dialog.Title>
                    Uma lembrança
                    <br />
                    <em>para os dois.</em>
                  </Dialog.Title>
                  <Dialog.Close className="icon-button" aria-label="Fechar formulário" disabled={submitting}>
                    ×
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sheet-description">
                  Suas palavras passam a fazer parte desta história. A mensagem será pública, com o seu nome.
                </Dialog.Description>

                {success ? (
                  <div className="form-success" role="status">
                    <span aria-hidden="true">↗</span>
                    <h3>Carinho registrado.</h3>
                    <p>
                      {success === 'pending'
                        ? 'Sua mensagem foi recebida e aparecerá no mural depois de aprovada.'
                        : 'Sua mensagem foi guardada com carinho e já faz parte desta história.'}
                    </p>
                    <Dialog.Close className="text-link" style={{ marginTop: 25 }}>
                      Voltar às lembranças <span aria-hidden="true">→</span>
                    </Dialog.Close>
                  </div>
                ) : (
                  <form onSubmit={submit} className="guestbook-form">
                    {/* Foto / Miniatura de perfil com upload instantâneo e preview */}
                    <div className="field avatar-field">
                      <label htmlFor="guest-avatar-input">
                        Foto de perfil / miniatura <span>· opcional</span>
                      </label>
                      <div className="avatar-control">
                        {avatarUrl ? (
                          <div className="avatar-preview-box">
                            <img src={avatarUrl} alt="Miniatura de perfil" className="avatar-preview-image" />
                            <button
                              type="button"
                              className="avatar-remove-button"
                              onClick={removeAvatar}
                              aria-label="Remover foto"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <label htmlFor="guest-avatar-input" className="avatar-placeholder-button" title="Escolher foto">
                            <Camera size={20} className="text-[#697057]" />
                          </label>
                        )}
                        <div className="avatar-info-text">
                          <label htmlFor="guest-avatar-input" className="avatar-trigger-label">
                            {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
                          </label>
                          <span className="avatar-hint">JPG, PNG ou WebP</span>
                        </div>
                        <input
                          ref={fileInputRef}
                          id="guest-avatar-input"
                          name="avatar_file"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="guest-name">Seu nome</label>
                      <input
                        id="guest-name"
                        name="guest_name"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={80}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Como o casal conhece você"
                        disabled={submitting}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="guest-relationship">
                        Relação com o casal <span>· opcional</span>
                      </label>
                      <input
                        id="guest-relationship"
                        name="relationship"
                        maxLength={80}
                        value={relationship}
                        onChange={e => setRelationship(e.target.value)}
                        placeholder="Amizade, família, uma história em comum…"
                        disabled={submitting}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="guest-message">Sua lembrança</label>
                      <textarea
                        id="guest-message"
                        name="message"
                        required
                        minLength={5}
                        maxLength={1200}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="O que você gostaria de guardar desse dia?"
                        disabled={submitting}
                        aria-describedby="message-count"
                      />
                      <span id="message-count" className="field-count">
                        {message.length} / 1.200
                      </span>
                    </div>

                    <div className="honeypot" aria-hidden="true">
                      <label htmlFor="guest-website">Website</label>
                      <input id="guest-website" name="website" tabIndex={-1} autoComplete="off" />
                    </div>

                    <Turnstile onToken={receiveToken} reset={resetToken} />

                    {error && (
                      <p role="alert" className="form-status error">
                        {error}
                      </p>
                    )}
                    {mode === 'unavailable' && (
                      <p className="form-status">
                        O mural está sendo preparado. Volte em breve para deixar sua lembrança.
                      </p>
                    )}

                    <button
                      className="form-submit"
                      type="submit"
                      disabled={
                        submitting ||
                        mode === 'unavailable' ||
                        (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !token)
                      }
                    >
                      <span>{submitting ? 'Guardando sua lembrança…' : 'Enviar lembrança'}</span>
                      <span aria-hidden="true">↗</span>
                    </button>

                    <p className="form-note">
                      Sem cadastro. Apenas você e suas palavras.
                      {mode === 'local' && process.env.NODE_ENV !== 'production' && (
                        <>
                          <br />
                          Prévia local: as mensagens ficam salvas neste computador.
                        </>
                      )}
                    </p>
                  </form>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          {messages.length > 0 && (
            <p className="guestbook-count-note">
              {messages.length} {messages.length === 1 ? 'mensagem compartilhada' : 'mensagens compartilhadas'}
            </p>
          )}
        </div>

        {/* Right Column: Bookmarked Testimonials Column Component filling the right space */}
        <div className="guestbook-showcase">
          {messages.length === 0 && !loading ? (
            <div className="guestbook-empty-state">
              <p className="empty-title">Ainda não há lembranças por aqui.</p>
              <p className="empty-subtitle">Seja o primeiro a deixar uma mensagem para Marina & Thiago.</p>
            </div>
          ) : messages.length > 0 ? (
            <div
              className={`guestbook-columns-wrapper ${
                messages.length > 2
                  ? "[mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]"
                  : ""
              }`}
            >
              <TestimonialsColumn
                testimonials={firstColumn}
                speed={26}
                initialDirection={1}
                className="w-full sm:w-[280px]"
              />
              {secondColumn.length > 0 && (
                <TestimonialsColumn
                  testimonials={secondColumn}
                  speed={20}
                  initialDirection={1}
                  className="hidden sm:block w-full sm:w-[280px]"
                />
              )}
            </div>
          ) : null}
        </div>
      </div>

      {loadError && (
        <p className="wall-status" role="status">
          {loadError}{' '}
          <button className="text-link" onClick={() => void load()}>
            Tentar novamente
          </button>
        </p>
      )}
      {loading && <p className="wall-status" role="status">Lendo as lembranças…</p>}
      {hasMore && (
        <button className="text-link" disabled={loading} onClick={() => void load(messages.at(-1)?.created_at)}>
          Ler mais lembranças <span aria-hidden="true">↓</span>
        </button>
      )}
    </section>
  );
}
