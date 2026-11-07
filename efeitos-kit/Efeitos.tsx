import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// Efeitos do kit aplicados aos reels a partir de 06/11/2026 (pedido do Vitor).
// Cada efeito é um "elemento" do plan.json, com tempos em frames:
//   {tipo:'comentario', texto, autor?, f0, f1}             -> bolha de comentário do Instagram (pergunta de seguidor)
//   {tipo:'sticky', itens:[{texto,f}], f0, f1}               -> palavras-chave coladas como adesivo, uma por vez, empilhadas
//   {tipo:'doodle', forma:'circulo'|'seta'|'sublinhado', x, y, w, h, f0, f1} -> rabisco à mão que "treme" (boil); x,y,w,h em px de 1080x1920
//   {tipo:'lista', estilo:'checklist', itens:[{texto,f}], f0, f1} -> caixa com todos os itens; cada um é marcado quando ele fala
// Todos ficam fora da faixa da legenda (y 1310) e longe do rosto.

export type ItemFx = {texto: string; f: number};
export type ElementoFx = {
  tipo: string;
  estilo?: string;
  texto?: string;
  autor?: string;
  itens?: ItemFx[];
  forma?: 'circulo' | 'seta' | 'sublinhado';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  f0: number;
  f1: number;
};

const TITULO_FONT = 'Anton, Impact, "Arial Narrow", sans-serif';
const TEXTO_FONT = 'Sora, Inter, "DejaVu Sans", Arial, sans-serif';
const AMARELO = '#FFD23F';
const LEGENDA_Y = 1310;

const useEntrada = (f0: number, f1: number, saida = 8) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - f0, fps, config: {damping: 13, stiffness: 210}});
  const out = interpolate(frame, [f1 - saida, f1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {s, out, frame, fps};
};

export const Comentario: React.FC<{el: ElementoFx}> = ({el}) => {
  const {s, out, frame} = useEntrada(el.f0, el.f1);
  if (frame < el.f0 || frame >= el.f1) return null;
  const flutua = Math.sin((frame - el.f0) / 18) * 4;
  return (
    <AbsoluteFill style={{top: 330, left: 70, right: 70, height: 'auto', bottom: 'auto'}}>
      <div
        style={{
          transform: `translateY(${(1 - s) * 40 + flutua}px) scale(${0.7 + 0.3 * s})`,
          transformOrigin: '10% 50%',
          opacity: Math.min(1, s * 1.6) * out,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          background: 'white',
          borderRadius: 44,
          padding: '26px 34px',
          boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
          fontFamily: TEXTO_FONT,
          color: '#111',
          maxWidth: 940,
        }}
      >
        <div style={{flex: '0 0 92px', height: 92, borderRadius: 46, background: 'linear-gradient(135deg,#F58529,#DD2A7B 55%,#8134AF)'}} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
          <div style={{fontSize: 30, fontWeight: 700, color: '#555'}}>{el.autor ?? 'Pergunta de seguidor'}</div>
          <div style={{fontSize: 46, fontWeight: 700, lineHeight: 1.15}}>{el.texto}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const GIROS = [-5, 4, -3, 5, -4];
export const Sticky: React.FC<{el: ElementoFx}> = ({el}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < el.f0 || frame >= el.f1) return null;
  const out = interpolate(frame, [el.f1 - 6, el.f1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const itens = (el.itens ?? []).filter((it) => frame >= it.f);
  return (
    <AbsoluteFill style={{top: 900, alignItems: 'center', opacity: out}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
        {itens.map((it, k) => {
          const s = spring({frame: frame - it.f, fps, config: {damping: 11, stiffness: 260}});
          const amarelo = k % 2 === 0;
          return (
            <div
              key={k}
              style={{
                transform: `rotate(${GIROS[k % GIROS.length]}deg) scale(${1.6 - 0.6 * s})`,
                opacity: Math.min(1, s * 2),
                background: amarelo ? AMARELO : 'white',
                color: '#111',
                fontFamily: TITULO_FONT,
                fontSize: it.texto.length > 14 ? 70 : 96,
                lineHeight: 1,
                textTransform: 'uppercase',
                padding: '14px 30px 10px',
                boxShadow: '8px 8px 0 #111',
                whiteSpace: 'nowrap',
              }}
            >
              {it.texto}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Rabisco: desenha em ~12 frames e depois "treme" trocando entre 3 versões a cada 4 frames.
const caminho = (forma: ElementoFx['forma'], w: number, h: number, v: number) => {
  const j = (n: number) => n + [0, 3, -3][v] * (n % 2 === 0 ? 1 : -1);
  if (forma === 'sublinhado') return `M0 ${j(h / 2)} C ${w * 0.3} ${j(h / 2 - 12)}, ${w * 0.6} ${j(h / 2 + 10)}, ${w} ${j(h / 2 - 4)}`;
  if (forma === 'seta') return `M0 0 C ${w * 0.2} ${j(h * 0.6)}, ${w * 0.6} ${j(h * 0.9)}, ${w} ${h} M${w} ${h} L ${w - 46} ${j(h - 10)} M${w} ${h} L ${j(w - 14)} ${h - 48}`;
  // círculo aberto, como feito à mão
  return `M ${w * 0.55} ${j(4)} C ${w * 0.95} ${j(0)}, ${w + 6} ${h * 0.75}, ${w * 0.5} ${j(h - 2)} C ${j(10)} ${h}, ${-6} ${h * 0.35}, ${w * 0.4} ${j(8)} L ${w * 0.62} ${j(18)}`;
};
export const Doodle: React.FC<{el: ElementoFx}> = ({el}) => {
  const frame = useCurrentFrame();
  if (frame < el.f0 || frame >= el.f1) return null;
  const w = el.w ?? 400;
  const h = el.h ?? 300;
  const desenho = interpolate(frame, [el.f0, el.f0 + 12], [1, 0], {extrapolateRight: 'clamp'});
  const v = Math.floor((frame - el.f0) / 4) % 3;
  const out = interpolate(frame, [el.f1 - 6, el.f1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <svg style={{position: 'absolute', left: el.x ?? 340, top: el.y ?? 400, overflow: 'visible', opacity: out}} width={w} height={h}>
      <path d={caminho(el.forma, w, h, v)} fill="none" stroke={AMARELO} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={desenho} style={{filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.45))'}} />
    </svg>
  );
};

export const Checklist: React.FC<{el: ElementoFx}> = ({el}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const itens = el.itens ?? [];
  if (!itens.length || frame < itens[0].f - 4 || frame >= el.f1) return null;
  const s0 = spring({frame: frame - (itens[0].f - 4), fps, config: {damping: 14, stiffness: 220}});
  const out = interpolate(frame, [el.f1 - 8, el.f1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 1920 - LEGENDA_Y + 40}}>
      <div style={{transform: `scale(${0.8 + 0.2 * s0})`, opacity: Math.min(1, s0 * 1.5) * out, background: 'white', borderRadius: 30, padding: '26px 38px', minWidth: 600, maxWidth: 940, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: TEXTO_FONT, color: '#111'}}>
        {itens.map((it, k) => {
          const marcado = frame >= it.f;
          const t = spring({frame: frame - it.f, fps, config: {damping: 12, stiffness: 300}});
          return (
            <div key={k} style={{display: 'flex', alignItems: 'center', gap: 22, fontSize: 44, fontWeight: 800, opacity: marcado ? 1 : 0.4}}>
              <div style={{flex: '0 0 54px', height: 54, borderRadius: 12, border: '5px solid #111', background: marcado ? AMARELO : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {marcado ? (
                  <svg width="36" height="36" viewBox="0 0 10 10" style={{transform: `scale(${t})`}}>
                    <path d="M1.5 5.2 L4 7.6 L8.6 2.4" fill="none" stroke="#111" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </div>
              <span>{it.texto}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Ponto único de entrada para o Reel.tsx: desenha todos os efeitos ativos neste frame.
export const EfeitosKit: React.FC<{elementos: ElementoFx[]}> = ({elementos}) => (
  <>
    {elementos.map((el, k) => {
      if (el.tipo === 'comentario') return <Comentario key={k} el={el} />;
      if (el.tipo === 'sticky') return <Sticky key={k} el={el} />;
      if (el.tipo === 'doodle') return <Doodle key={k} el={el} />;
      if (el.tipo === 'lista' && el.estilo === 'checklist') return <Checklist key={k} el={el} />;
      return null;
    })}
  </>
);
