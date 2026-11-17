import React, { useState } from 'react';
import { MUTATION_INFO, RARITY_COLOR, RARITY_LABEL } from '../game/balance';
import { asset, frames, imgSrc, type AssetEntry, type AssetGroup } from '../game/assets';
import { FISH_BY_ID } from '../game/data/fish';
import { useGame } from '../game/state';
import type { MutationId, Rarity } from '../game/types';

/** Color-blind-safe geometric shape per rarity tier. */
export const RARITY_SHAPE: Record<Rarity, string> = {
  common: '●',
  uncommon: '◆',
  rare: '▲',
  epic: '⬢',
  legendary: '★',
  mythic: '✦',
};

export function RarityBadge({ rarity, compact = false }: { rarity: Rarity; compact?: boolean }) {
  const color = RARITY_COLOR[rarity];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider border border-[#1a1228]"
      style={{ backgroundColor: `${color}28`, color, borderColor: color }}
      title={`${RARITY_LABEL[rarity]} rarity`}
    >
      <span aria-hidden="true">{RARITY_SHAPE[rarity]}</span>
      {!compact && <span>{RARITY_LABEL[rarity]}</span>}
    </span>
  );
}

export function MutationBadges({ mutations, glitchMult }: { mutations: MutationId[]; glitchMult?: number }) {
  if (!mutations.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {mutations.map((m) => {
        const info = MUTATION_INFO[m];
        const label = m === 'glitched' && glitchMult ? `Glitched x${glitchMult.toFixed(1)}` : info.label;
        return (
          <span
            key={m}
            title={info.desc}
            className="inline-flex items-center px-1.5 py-0.5 text-xs font-bold uppercase border border-[#1a1228]"
            style={{ backgroundColor: '#1a1228', color: info.color, borderColor: info.color }}
          >
            ✦ {label}
          </span>
        );
      })}
    </span>
  );
}

/** Render a static or animated-strip sprite from the asset pack at an integer scale. */
export function Sprite({
  group,
  name,
  scale = 1,
  filter,
  className = '',
  title,
}: {
  group: AssetGroup;
  name: string;
  scale?: number;
  filter?: string;
  className?: string;
  title?: string;
}) {
  const entry: AssetEntry = asset(group, name);
  const f = frames(entry);
  const intScale = Math.max(1, Math.round(scale));
  const url = imgSrc(entry);

  if (f.count > 1) {
    const w = f.w * intScale;
    const h = f.h * intScale;
    const totalW = entry.w * intScale;
    const dur = f.count / Math.max(1, f.fps);
    return (
      <span
        title={title}
        className={`inline-block shrink-0 ${className}`}
        style={{
          width: w,
          height: h,
          backgroundImage: `url("${url}")`,
          backgroundSize: `${totalW}px ${h}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          filter,
          ['--strip-w' as string]: `-${totalW}px`,
          animation: `sprite-strip ${dur}s steps(${f.count}) infinite`,
        }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={entry.name ?? name}
      title={title}
      width={entry.w * intScale}
      height={entry.h * intScale}
      draggable={false}
      className={`inline-block shrink-0 select-none ${className}`}
      style={{
        width: entry.w * intScale,
        height: entry.h * intScale,
        imageRendering: 'pixelated',
        filter,
      }}
    />
  );
}

export function Icon({
  name,
  scale = 1,
  hue = 0,
  className = '',
  title,
}: {
  name: string;
  scale?: number;
  hue?: number;
  className?: string;
  title?: string;
}) {
  const filter = hue ? `hue-rotate(${hue}deg) saturate(1.3)` : undefined;
  return <Sprite group="icons" name={name} scale={scale} filter={filter} className={className} title={title} />;
}

/**
 * Renders a fish sprite with all code-side mutation and discovery visuals:
 * - Undiscovered = filter: brightness(0)
 * - Shiny = brightness + sparkle sprite overlay
 * - Giant / Tiny = bigger / smaller integer scale
 * - Golden = sepia + saturate + yellow drop-shadow
 * - Cursed = purple hue-rotate + desaturate + green wisps
 * - Glitched = RGB-offset jitter class
 * - Prismatic = animated hue-rotate class
 */
export function FishSprite({
  fishId,
  mutations = [],
  undiscovered = false,
  baseScale = 2,
  className = '',
}: {
  fishId: string;
  mutations?: MutationId[];
  undiscovered?: boolean;
  baseScale?: number;
  className?: string;
}) {
  const def = FISH_BY_ID[fishId];
  if (!def) return null;
  const entry = asset('fish', def.sprite);

  let scale = Math.max(1, Math.round(baseScale));
  if (!undiscovered) {
    if (mutations.includes('giant')) scale = Math.min(4, scale + 1);
    else if (mutations.includes('tiny')) scale = Math.max(1, scale - 1);
  }

  const filters: string[] = [];
  if (undiscovered) {
    filters.push('brightness(0)');
  } else {
    if (def.tint) filters.push(def.tint);
    if (mutations.includes('shiny')) filters.push('brightness(1.3) contrast(1.08)');
    if (mutations.includes('golden')) {
      filters.push('sepia(1) saturate(3.5) brightness(1.1) drop-shadow(0 0 2px #f2c02a)');
    }
    if (mutations.includes('cursed')) {
      filters.push('hue-rotate(250deg) saturate(0.65) brightness(0.85) drop-shadow(0 0 2px #58b84a)');
    }
  }

  const animClass = !undiscovered
    ? mutations.includes('prismatic')
      ? 'mut-prismatic'
      : mutations.includes('glitched')
        ? 'mut-glitched'
        : ''
    : '';

  const sparkleEntry = asset('effects', 'sparkle');
  const sparkleUrl = imgSrc(sparkleEntry);

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <img
        src={imgSrc(entry)}
        alt={undiscovered ? 'Undiscovered Fish' : def.name}
        width={entry.w * scale}
        height={entry.h * scale}
        draggable={false}
        className={`select-none ${animClass}`}
        style={{
          width: entry.w * scale,
          height: entry.h * scale,
          imageRendering: 'pixelated',
          filter: filters.join(' ') || undefined,
        }}
      />
      {!undiscovered && (mutations.includes('shiny') || mutations.includes('prismatic') || mutations.includes('golden')) && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -right-1"
          style={{
            width: 18,
            height: 18,
            backgroundImage: `url("${sparkleUrl}")`,
            backgroundSize: '72px 18px',
            imageRendering: 'pixelated',
            ['--strip-w' as string]: '-72px',
            animation: 'sprite-strip 0.4s steps(4) infinite',
          }}
        />
      )}
      {!undiscovered && mutations.includes('cursed') && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 left-1 w-2 h-2 bg-[#58b84a] border border-[#1a1228]"
          style={{ animation: 'wisp-float 1s steps(4) infinite' }}
        />
      )}
    </span>
  );
}

/** Lightweight pixel tooltip wrapper. */
export function Tip({
  label,
  children,
  className = '',
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const showTooltips = useGame((s) => s.settings.showTooltips);
  const [open, setOpen] = useState(false);
  if (!showTooltips || !label) return <span className={className}>{children}</span>;
  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-max max-w-60 px-2.5 py-1.5 text-sm bg-[#100b1a] text-[#eef4ff] border-2 border-[#f2c02a] shadow-none"
        >
          {label}
        </span>
      )}
    </span>
  );
}
