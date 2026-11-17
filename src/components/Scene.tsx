import React, { useEffect, useRef, useState } from 'react';
import { actions } from '../game/actions';
import {
  INK, ROD_KEYS, ZONE_BG_KEYS, asset, frameAt, frames, getImage,
} from '../game/assets';
import { BALANCE, RARITY_COLOR, RARITY_LABEL } from '../game/balance';
import { cosmeticDef } from '../game/data/cosmetics';
import { EVENTS, WEATHER } from '../game/data/events';
import { fishInZone } from '../game/data/fish';
import { ZONES, zoneDef } from '../game/data/zones';
import { computeStats, nightLevel, timeOfDay } from '../game/engine';
import { fmt, fmtTime } from '../game/format';
import { fx, getState, useTick } from '../game/state';
import { RARITIES, type CatchResult, type Pose } from '../game/types';
import { FishSprite, Icon, MutationBadges, RARITY_SHAPE, RarityBadge, Sprite, Tip } from './PixelUI';

const SCENE_W = 192;
const SCENE_H = 108;
const DOCK_Y = 72;
const CHAR_X = 52;
const CHAR_Y = DOCK_Y - 25; // 47

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface SpriteAnim {
  key: 'splash' | 'sparkle' | 'ripple';
  x: number;
  y: number;
  t: number;
  dur: number;
}

interface FloatText {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  big?: boolean;
}

/** Draw a 1px stepped sagging pixel curve between (x0,y0) and (x1,y1). */
function drawPixelSagLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sag: number,
  color: string,
  clock: number,
) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 16);
  const mx = (x0 + x1) * 0.5;
  const my = (y0 + y1) * 0.5 + sag;
  let prevX = -999;
  let prevY = -999;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const px = Math.round(u * u * x0 + 2 * u * t * mx + t * t * x1);
    const py = Math.round(u * u * y0 + 2 * u * t * my + t * t * y1);
    if (px === prevX && py === prevY) continue;
    prevX = px;
    prevY = py;
    if (color === 'rainbow') {
      const hue = Math.floor((t * 360 + clock * 180) % 360);
      ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
    } else {
      ctx.fillStyle = color;
    }
    ctx.fillRect(px, py, 1, 1);
  }
}

export function Scene() {
  useTick();
  const s = getState();
  const st = computeStats(s);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(4);
  const [lastCatch, setLastCatch] = useState<CatchResult | null>(null);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [jackpotBanner, setJackpotBanner] = useState(false);
  const [shake, setShake] = useState(false);
  const [gradeBanner, setGradeBanner] = useState<{ text: string; color: string } | null>(null);
  const [choosingStartMode, setChoosingStartMode] = useState(false);
  const [autoSellFilterOpen, setAutoSellFilterOpen] = useState(false);

  const particlesRef = useRef<Particle[]>([]);
  const animsRef = useRef<SpriteAnim[]>([]);
  const raindropsRef = useRef<{ x: number; y: number; speed: number }[]>(
    Array.from({ length: 28 }, (_, i) => ({
      x: (i * 37) % SCENE_W,
      y: (i * 23) % SCENE_H,
      speed: 85 + (i % 4) * 18,
    })),
  );
  const meteorsRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const jumpFishRef = useRef<{ sprite: string; x: number; y: number; vx: number; vy: number; t: number } | null>(null);

  // Compute integer scale (x2, x3, x4, x5) to fit container with letterboxing
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const sx = Math.floor(rect.width / SCENE_W);
      const sy = Math.floor(rect.height / SCENE_H);
      const next = Math.max(2, Math.min(5, Math.min(sx, sy) || 3));
      setScale(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Listen to transient FX events
  useEffect(() => {
    const pushParticles = (x: number, y: number, color: string, count: number) => {
      const list = particlesRef.current;
      for (let i = 0; i < count && list.length < BALANCE.maxParticles; i++) {
        const angle = (Math.PI * 2 * i) / count + (i % 3) * 0.2;
        const spd = 16 + (i % 5) * 9;
        list.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 18,
          color,
          life: 0,
          maxLife: 0.55 + (i % 3) * 0.15,
          size: i % 2 === 0 ? 2 : 1,
        });
      }
    };

    return fx.on((e) => {
      if (e.type === 'cast') {
        animsRef.current.push({ key: 'splash', x: 118, y: 68, t: 0, dur: 0.4 });
        animsRef.current.push({ key: 'ripple', x: 108, y: 78, t: 0, dur: 0.5 });
      } else if (e.type === 'bite') {
        animsRef.current.push({ key: 'splash', x: 118, y: 69, t: 0, dur: 0.4 });
        pushParticles(128, 76, '#bfe8ff', 8);
      } else if (e.type === 'catch') {
        setLastCatch(e.result);
        const col = RARITY_COLOR[e.result.rarity];
        animsRef.current.push({ key: 'splash', x: 118, y: 68, t: 0, dur: 0.4 });
        animsRef.current.push({ key: 'sparkle', x: 64, y: 40, t: 0, dur: 0.7 });
        pushParticles(126, 74, col, 16);
        if (e.result.fish) {
          jumpFishRef.current = {
            sprite: e.result.fish.sprite,
            x: 126,
            y: 74,
            vx: -58,
            vy: -72,
            t: 0,
          };
        }
      } else if (e.type === 'perfect') {
        setGradeBanner(
          e.quality === 'perfect'
            ? { text: 'PERFECT! x1.25', color: '#f2c02a' }
            : { text: 'GOOD!', color: '#58b84a' },
        );
        setTimeout(() => setGradeBanner(null), 850);
      } else if (e.type === 'miss') {
        setGradeBanner({ text: 'TOO EARLY!', color: '#e85a5a' });
        setTimeout(() => setGradeBanner(null), 750);
      } else if (e.type === 'float') {
        const id = Date.now() + Math.floor(performance.now() * 100);
        setFloats((prev) => [...prev.slice(-8), { id, text: e.text, color: e.color, x: 52, y: 30, big: e.big }]);
        setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 1100);
      } else if (e.type === 'jackpot') {
        setJackpotBanner(true);
        pushParticles(96, 54, '#ff5ac8', 28);
        setTimeout(() => setJackpotBanner(false), 2200);
      } else if (e.type === 'shake') {
        if (!getState().settings.reducedMotion) {
          setShake(true);
          setTimeout(() => setShake(false), 380);
        }
      } else if (e.type === 'bossHit') {
        pushParticles(e.x, e.y, '#ff5ac8', 10);
      }
    });
  }, []);

  // Main 192x108 pixel canvas render loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          drawScene(ctx, now / 1000, dt);
        }
      }
      raf = requestAnimationFrame(render);
    };

    const drawSpriteFrame = (
      ctx: CanvasRenderingContext2D,
      group: Parameters<typeof asset>[0],
      key: string,
      dx: number,
      dy: number,
      frameIdx = 0,
    ) => {
      const entry = asset(group, key);
      const img = getImage(entry);
      const f = frames(entry);
      const sx = Math.min(frameIdx, f.count - 1) * f.w;
      ctx.drawImage(img, sx, 0, f.w, f.h, Math.round(dx), Math.round(dy), f.w, f.h);
    };

    const drawScene = (ctx: CanvasRenderingContext2D, tSec: number, dt: number) => {
      const state = getState();
      const reduced = state.settings.reducedMotion;
      const animT = reduced ? 0 : tSec;

      ctx.clearRect(0, 0, SCENE_W, SCENE_H);

      // 1. Zone background (192x108, horizon at y=62)
      const bgKey = ZONE_BG_KEYS[Math.max(0, Math.min(ZONE_BG_KEYS.length - 1, state.zone - 1))];
      drawSpriteFrame(ctx, 'backgrounds', bgKey, 0, 0, 0);

      // Drifting pixel clouds (zones 1..3)
      if (state.zone <= 3) {
        const c1x = Math.floor(((animT * 3.5) % (SCENE_W + 64)) - 56);
        const c2x = Math.floor((((animT * 2.2) + 95) % (SCENE_W + 52)) - 44);
        drawSpriteFrame(ctx, 'effects', 'cloud_1', c1x, 8, 0);
        drawSpriteFrame(ctx, 'effects', 'cloud_2', c2x, 18, 0);
      }

      // Parallax water shimmer lines below horizon (y=62..108)
      const zd = zoneDef(state.zone);
      ctx.fillStyle = zd.water;
      for (let row = 0; row < 6; row++) {
        const wy = 66 + row * 7;
        const wx = Math.floor(((animT * (4 + row * 1.5) + row * 29) % 180) - 10);
        ctx.fillRect(wx, wy, 10 - (row % 3) * 2, 1);
      }

      // 2. Day/Night & Weather overlay (back of dock)
      const nLvl = nightLevel(state);
      if (nLvl > 0) {
        ctx.fillStyle = `rgba(12, 16, 42, ${(nLvl * 0.36).toFixed(2)})`;
        ctx.fillRect(0, 0, SCENE_W, SCENE_H);
      }

      const wId = state.weather.current;
      const wDef = WEATHER[wId];
      if (wDef.tint) {
        ctx.fillStyle = wDef.tint;
        ctx.fillRect(0, 0, SCENE_W, SCENE_H);
      }

      // Aurora ribbons
      if (wId === 'aurora') {
        for (let x = 0; x < SCENE_W; x += 4) {
          const ay = 12 + Math.round(Math.sin(x * 0.08 + animT * 2) * 5);
          ctx.fillStyle = x % 8 === 0 ? 'rgba(88, 248, 184, 0.35)' : 'rgba(164, 90, 240, 0.3)';
          ctx.fillRect(x, ay, 3, 14);
        }
      }

      // Blood Moon orb tint in sky
      if (wId === 'bloodmoon') {
        ctx.fillStyle = 'rgba(232, 45, 68, 0.55)';
        ctx.fillRect(142, 12, 14, 14);
        ctx.fillStyle = 'rgba(255, 120, 120, 0.35)';
        ctx.fillRect(140, 10, 18, 18);
      }

      // Meteor shower streaks
      if (wId === 'meteor' && !reduced) {
        if (meteorsRef.current.length < 4 && Math.floor(tSec * 10) % 7 === 0) {
          meteorsRef.current.push({
            x: 30 + ((Math.floor(tSec * 53) * 29) % 140),
            y: 4,
            vx: -65,
            vy: 42,
            life: 0.7,
          });
        }
        meteorsRef.current = meteorsRef.current.filter((m) => {
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.life -= dt;
          ctx.fillStyle = '#fff6a8';
          ctx.fillRect(Math.round(m.x), Math.round(m.y), 2, 2);
          ctx.fillStyle = '#ff5ac8';
          ctx.fillRect(Math.round(m.x + 2), Math.round(m.y - 1), 3, 1);
          return m.life > 0 && m.y < 60;
        });
      }

      // 3. Dock at y=72
      drawSpriteFrame(ctx, 'scene', 'dock', 0, DOCK_Y, 0);

      // Helpers sitting along the dock
      if (state.helpers.cat > 0) drawSpriteFrame(ctx, 'helpers', 'cat', 30, DOCK_Y - 21, 0);
      if (state.helpers.pelican > 0) drawSpriteFrame(ctx, 'helpers', 'pelican', 6, DOCK_Y - 22, 0);
      if (state.helpers.sailor > 0) drawSpriteFrame(ctx, 'helpers', 'sailor', 72, DOCK_Y - 22, 0);
      if (state.helpers.mermaid > 0) {
        const my = 76 + Math.round(Math.sin(animT * 2.5) * 1);
        drawSpriteFrame(ctx, 'helpers', 'mermaid', 162, my, 0);
      }

      // 4. Rod (drawn BEHIND the character so hand overlaps grip)
      const pose: Pose = state.fishing.pose;
      const charEntry = asset('character', pose);
      const charFrame = frameAt(charEntry, animT);
      const hand = charEntry.hands?.[charFrame] ?? { x: 23, y: 18 };

      const rodKey = ROD_KEYS[Math.max(0, Math.min(ROD_KEYS.length - 1, state.rodTier - 1))];
      const rodEntry = asset('rods', rodKey);
      const rodAnchor = rodEntry.anchor ?? { x: 6, y: 25 };
      const rodTip = rodEntry.tip ?? { x: 29, y: 3 };
      const rodX = CHAR_X + hand.x - rodAnchor.x;
      const rodY = CHAR_Y + hand.y - rodAnchor.y;
      drawSpriteFrame(ctx, 'rods', rodKey, rodX, rodY, 0);

      // 5. Character at x=52, y=47 (y=25 of sprite is dock surface line y=72)
      const dye = cosmeticDef(state.cosmetics.dye);
      if (dye && dye.value !== 'none') ctx.filter = dye.value;
      drawSpriteFrame(ctx, 'character', pose, CHAR_X, CHAR_Y, charFrame);
      ctx.filter = 'none';

      // 6. Bobber, Ripple & Fishing Line
      const phase = state.fishing.phase;
      const tipX = rodX + rodTip.x;
      const tipY = rodY + rodTip.y;

      let bobX = 128;
      let bobY = 70;
      if (phase === 'cast') {
        const p = Math.min(1, state.fishing.t / Math.max(0.1, state.fishing.dur));
        bobX = Math.round(tipX + (128 - tipX) * p);
        bobY = Math.round(tipY + (70 - tipY) * p - Math.sin(p * Math.PI) * 18);
      } else if (phase === 'reel') {
        const p = Math.min(1, state.fishing.t / Math.max(0.1, state.fishing.dur));
        bobX = Math.round(128 + (tipX - 128) * p);
        bobY = Math.round(70 + (tipY - 70) * p);
      } else if (phase === 'wait') {
        bobY = 70 + Math.round(Math.sin(animT * 3) * 1);
      } else if (phase === 'bite') {
        bobY = 72;
      }

      if (state.fishing.started && phase !== 'catch') {
        const lineCos = cosmeticDef(state.cosmetics.line);
        const lineColor = lineCos?.value ?? '#e8eef8';
        const sag = phase === 'bite' || phase === 'reel' ? 2 : 7;
        drawPixelSagLine(ctx, tipX, tipY, bobX + 5, bobY + 3, sag, lineColor, animT);

        // Ripple under bobber when on water
        if (phase === 'wait' || phase === 'bite') {
          const ripEntry = asset('effects', 'ripple');
          const ripFrame = Math.floor(animT * 5) % (ripEntry.frames ?? 3);
          drawSpriteFrame(ctx, 'effects', 'ripple', bobX - 15, bobY + 6, ripFrame);
        }

        // Bobber frame 0 = floating, frame 1 = bite (dipped)
        const bobFrame = phase === 'bite' || phase === 'reel' ? 1 : 0;
        drawSpriteFrame(ctx, 'effects', 'bobber', bobX, bobY, bobFrame);

        // Exclaim icon above bobber during bite window
        if (phase === 'bite') {
          const bounce = Math.round(Math.sin(animT * 18));
          drawSpriteFrame(ctx, 'effects', 'exclaim', bobX + 1, bobY - 16 + bounce, 0);
        }
      }

      // Jumping fish arc on catch
      if (jumpFishRef.current) {
        const jf = jumpFishRef.current;
        jf.t += dt;
        jf.x += jf.vx * dt;
        jf.y += jf.vy * dt;
        jf.vy += 155 * dt;
        const fEntry = asset('fish', jf.sprite);
        ctx.drawImage(getImage(fEntry), Math.round(jf.x), Math.round(jf.y));
        if (jf.t > 0.75) jumpFishRef.current = null;
      }

      // Boss in the water (Kraken or Zone Boss)
      if (state.boss) {
        const bob = Math.round(Math.sin(animT * 4) * 2);
        if (state.boss.kind === 'kraken') {
          drawSpriteFrame(ctx, 'bosses', 'kraken', 114, 34 + bob, 0);
        } else {
          const bDef = zoneDef(state.boss.zone).boss;
          const fEntry = asset('fish', bDef.sprite);
          const img = getImage(fEntry);
          ctx.drawImage(img, 0, 0, fEntry.w, fEntry.h, 122, 48 + bob, fEntry.w * 2, fEntry.h * 2);
        }
      }

      // Lucky Seagull flying across the sky
      if (state.seagull && !state.seagull.caught) {
        const gEntry = asset('effects', 'gull');
        const gFrame = frameAt(gEntry, animT);
        drawSpriteFrame(ctx, 'effects', 'gull', state.seagull.x, state.seagull.y, gFrame);
      }

      // Rain / Storm raindrops (effects/raindrop.png)
      if (wId === 'rain' || wId === 'storm') {
        const count = wId === 'storm' ? raindropsRef.current.length : 16;
        for (let i = 0; i < count; i++) {
          const r = raindropsRef.current[i];
          if (!reduced) {
            r.y += r.speed * dt;
            r.x -= (wId === 'storm' ? 28 : 12) * dt;
            if (r.y > SCENE_H) {
              r.y = -6;
              r.x = (r.x + SCENE_W) % SCENE_W;
            }
          }
          drawSpriteFrame(ctx, 'effects', 'raindrop', r.x, r.y, 0);
        }
      }

      // Fog bands
      if (wId === 'fog') {
        ctx.fillStyle = 'rgba(218, 228, 240, 0.25)';
        const off = Math.round(Math.sin(animT * 0.9) * 6);
        ctx.fillRect(0, 48 + off, SCENE_W, 8);
        ctx.fillRect(0, 66 - off, SCENE_W, 10);
      }

      // One-shot sprite animations (splash, sparkle, ripple)
      animsRef.current = animsRef.current.filter((a) => {
        a.t += dt;
        const entry = asset('effects', a.key);
        const f = frames(entry);
        const idx = Math.min(f.count - 1, Math.floor((a.t / a.dur) * f.count));
        drawSpriteFrame(ctx, 'effects', a.key, a.x, a.y, idx);
        return a.t < a.dur;
      });

      // Pixel particles (capped at 60, with 1px ink outline look)
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 65 * dt;
        const px = Math.round(p.x);
        const py = Math.round(p.y);
        ctx.fillStyle = INK;
        ctx.fillRect(px - 1, py - 1, p.size + 2, p.size + 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(px, py, p.size, p.size);
        return p.life < p.maxLife;
      });
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const lx = ((e.clientX - rect.left) / rect.width) * SCENE_W;
    const ly = ((e.clientY - rect.top) / rect.height) * SCENE_H;

    if (s.seagull && !s.seagull.caught) {
      if (Math.abs(lx - (s.seagull.x + 8)) <= 18 && Math.abs(ly - (s.seagull.y + 4)) <= 16) {
        actions.clickSeagull();
        return;
      }
    }
    if (s.boss && lx >= 105 && ly >= 28) {
      actions.hitBoss(lx, ly);
      return;
    }
    actions.reelClick();
  };

  const f = s.fishing;
  const isBite = f.phase === 'bite';
  const [pa, pb] = st.perfectWindow;
  const biteProgress = isBite ? Math.min(1, f.t / Math.max(0.1, f.dur)) : 0;
  const tod = timeOfDay(s);
  const currentZd = zoneDef(s.zone);

  return (
    <div className={`flex flex-col gap-2 ${shake ? 'shake-active' : ''}`}>
      {/* Zone selector strip */}
      <div className="panel-navy p-2 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {ZONES.map((z) => {
            const unlocked = z.id <= s.unlockedZone;
            const active = z.id === s.zone;
            const isNext = z.id === s.unlockedZone + 1;
            const prevCaught = z.id > 1 ? fishInZone(z.id - 1).filter((sp) => !!s.codex[sp.id]).length : 0;
            const canUnlock = isNext && s.coins >= z.cost && prevCaught >= z.codexReq;

            return (
              <Tip
                key={z.id}
                label={
                  <div>
                    <div className="font-heading text-xs text-[#f2c02a]">{z.name}</div>
                    <div className="text-xs text-[#b8c7e0] mt-0.5">
                      {z.mechanic.name}: {z.mechanic.desc}
                    </div>
                    {!unlocked && (
                      <div className="text-xs text-[#ff8a8a] mt-1">
                        Requires: {fmt(z.cost)} Coins & {prevCaught}/{z.codexReq} species in Zone {z.id - 1}
                      </div>
                    )}
                  </div>
                }
              >
                <button
                  type="button"
                  onClick={() => actions.selectZone(z.id)}
                  disabled={!unlocked && !canUnlock}
                  className={`btn-pixel px-2 py-1 text-sm flex items-center gap-1 ${
                    active ? 'is-pressed ring-2 ring-[#f2c02a]' : ''
                  }`}
                >
                  <span>{unlocked ? `${z.id}. ${z.name}` : canUnlock ? `Unlock ${z.name} (${fmt(z.cost)})` : `🔒 Z${z.id}`}</span>
                </button>
              </Tip>
            );
          })}
        </div>

        {/* Weather + Forecast + Time */}
        <div className="flex items-center gap-2 text-sm">
          <Tip
            label={
              <div>
                <div className="font-bold text-[#f2c02a]">
                  {WEATHER[s.weather.current].name} ({fmtTime(s.weather.timeLeft)})
                </div>
                <div className="text-xs">{WEATHER[s.weather.current].desc}</div>
                <div className="text-xs text-[#9aa8b8] mt-1">
                  Forecast accuracy: {Math.round(st.forecastAcc * 100)}% (upgrade Weather Vane in Shop)
                </div>
              </div>
            }
          >
            <div className="pixel-box px-2 py-0.5 flex items-center gap-1.5">
              <Sprite group="weather" name={s.weather.current} scale={1} />
              <span className="font-bold">{WEATHER[s.weather.current].name}</span>
              <span className="text-xs text-[#9aa8b8]">{fmtTime(s.weather.timeLeft)}</span>
              {s.weather.queue.length >= 2 && (
                <span className="flex items-center gap-1 ml-1 pl-1.5 border-l border-[#26395c]" title="Next 2 weather slots">
                  <span className="text-xs text-[#9aa8b8]">Next:</span>
                  <Sprite group="weather" name={s.weather.queue[0].forecast} scale={1} />
                  <Sprite group="weather" name={s.weather.queue[1].forecast} scale={1} />
                </span>
              )}
            </div>
          </Tip>
          <div className="pixel-box px-2 py-0.5 uppercase text-xs font-bold text-[#bfe8ff]">
            {tod}
          </div>
        </div>
      </div>

      {/* Main integer-scaled 192x108 viewport container */}
      <div
        ref={wrapRef}
        className="panel-wood relative flex items-center justify-center bg-[#0d0818] overflow-hidden"
        style={{ minHeight: SCENE_H * 3 + 16 }}
      >
        <div
          className="relative"
          style={{
            width: SCENE_W * scale,
            height: SCENE_H * scale,
          }}
        >
          <canvas
            ref={canvasRef}
            width={SCENE_W}
            height={SCENE_H}
            onClick={handleCanvasClick}
            className="block cursor-pointer border-2 border-[#1a1228]"
            style={{
              width: SCENE_W * scale,
              height: SCENE_H * scale,
              imageRendering: 'pixelated',
            }}
          />

          {/* Top-left HUD inside viewport: Zone mechanic + Boss challenge */}
          <div className="pointer-events-none absolute top-2 left-2 flex flex-col gap-1">
            <div className="bg-[#100b1a]/85 border-2 border-[#1a1228] px-2 py-0.5 text-xs">
              <span className="text-[#f2c02a] font-bold">{currentZd.mechanic.name}:</span>{' '}
              <span className="text-[#d6e4ff]">{currentZd.mechanic.desc}</span>
            </div>
          </div>

          {/* Lucky Seagull click prompt */}
          {s.seagull && !s.seagull.caught && (
            <button
              type="button"
              onClick={actions.clickSeagull}
              className="btn-pixel absolute top-2 right-2 px-2 py-0.5 text-xs bg-[#f2a02a] text-[#1a1228] font-bold animate-bounce"
            >
              🐦 Click the Lucky Seagull!
            </button>
          )}

          {/* Active Boss HP overlay bar */}
          {s.boss && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-11/12 max-w-md bg-[#100b1a]/95 border-2 border-[#ff5ac8] p-2">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="font-heading text-[#ff5ac8]">{s.boss.name}</span>
                <span className="font-num text-base text-[#fff6a8]">
                  HP {fmt(s.boss.hp)} / {fmt(s.boss.maxHp)} • {fmtTime(s.boss.timeLeft)}
                </span>
              </div>
              <div className="w-full h-3 bg-[#1a1228] border border-[#ff5ac8]">
                <div
                  className="h-full bg-[#e84a5f]"
                  style={{ width: `${Math.max(0, (s.boss.hp / s.boss.maxHp) * 100)}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-[#b8c7e0]">Click the boss or mash Strike!</span>
                <button
                  type="button"
                  onClick={() => actions.hitBoss()}
                  className="btn-pixel px-3 py-0.5 text-sm font-bold text-[#fff6a8]"
                >
                  ⚔ STRIKE! (-{fmt(st.clickDamage * 3.2)})
                </button>
              </div>
            </div>
          )}

          {/* Floating +coins numbers */}
          {floats.map((fl) => (
            <div
              key={fl.id}
              className={`pointer-events-none absolute font-heading pixel-text-outline ${
                fl.big ? 'text-base' : 'text-xs'
              }`}
              style={{
                left: `${(fl.x / SCENE_W) * 100}%`,
                top: `${(fl.y / SCENE_H) * 100}%`,
                color: fl.color,
                animation: 'wisp-float 1s steps(6) forwards',
              }}
            >
              {fl.text}
            </div>
          ))}

          {/* Timing grade popup */}
          {gradeBanner && (
            <div
              className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 font-heading text-sm px-2.5 py-1 bg-[#100b1a] border-2 border-[#1a1228] pixel-text-outline"
              style={{ color: gradeBanner.color }}
            >
              {gradeBanner.text}
            </div>
          )}

          {/* Start Fishing Overlay when not yet started */}
          {!f.started && !s.boss && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#080510]/65 p-3">
              {!choosingStartMode ? (
                <div className="panel-navy p-4 text-center flex flex-col items-center gap-2.5 max-w-xs">
                  <div className="font-heading text-xs text-[#f2c02a]">READY ON THE DOCK</div>
                  <div className="text-xs text-[#b8c7e0]">
                    Click below to cast your line and choose how you want to fish.
                  </div>
                  <button
                    type="button"
                    onClick={() => setChoosingStartMode(true)}
                    className="btn-pixel px-5 py-2 font-heading text-xs text-[#58b84a] ring-2 ring-[#f2c02a]"
                  >
                    ▶ START FISHING
                  </button>
                </div>
              ) : (
                <div className="panel-navy p-3.5 text-center flex flex-col gap-2.5 max-w-md w-11/12">
                  <div className="font-heading text-xs text-[#f2c02a]">CHOOSE FISHING MODE</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        setChoosingStartMode(false);
                        actions.startFishing('manual');
                      }}
                      className="btn-pixel p-2.5 flex flex-col gap-1"
                    >
                      <span className="font-heading text-xs text-[#f2c02a]">🎯 MANUAL FISHING</span>
                      <span className="text-xs text-[#d6e4ff]">
                        You must click <strong>REEL NOW!</strong> during the bite window to catch the fish (no auto-catch).
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChoosingStartMode(false);
                        actions.startFishing('auto');
                      }}
                      className="btn-pixel p-2.5 flex flex-col gap-1"
                    >
                      <span className="font-heading text-xs text-[#58b84a]">⚙ AUTO FISHING</span>
                      <span className="text-xs text-[#d6e4ff]">
                        Reels automatically! Randomized{' '}
                        <strong className="text-[#fff6a8]">{Math.round(st.autoPerfectChance * 100)}% Perfect Reel</strong>{' '}
                        chance (upgradeable with Coins in Shop).
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChoosingStartMode(false)}
                    className="btn-pixel py-1 text-xs text-[#9aa8b8]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Triple-mutation JACKPOT screen flash banner */}
          {jackpotBanner && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#ff5ac8]/25 border-4 border-[#fff6a8]">
              <div className="panel-navy px-6 py-3 text-center">
                <div className="font-heading text-lg text-[#fff6a8] pixel-text-outline">
                  ★ TRIPLE MUTATION JACKPOT! ★
                </div>
                <div className="text-sm text-[#ff5ac8] font-bold mt-1">
                  The tides bend to your fortune!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Event Timer Bar + Merchant Deals */}
      {s.event && (
        <div className="panel-green p-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xs text-[#fff6a8]">
                ⚡ {EVENTS[s.event.id].name}
              </span>
              <span className="text-xs text-[#d8f8e8]">{EVENTS[s.event.id].desc}</span>
            </div>
            <span className="font-num font-bold text-[#fff6a8]">{fmtTime(s.event.timeLeft)}</span>
          </div>
          <div className="w-full h-2 bg-[#1a1228]">
            <div
              className="h-full bg-[#58b84a]"
              style={{ width: `${(s.event.timeLeft / s.event.duration) * 100}%` }}
            />
          </div>
          {s.event.id === 'merchant' && s.merchant.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
              {s.merchant.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  disabled={deal.bought || s.coins < deal.price}
                  onClick={() => actions.buyMerchantDeal(deal.id)}
                  className="btn-pixel px-2 py-1 text-left flex items-center justify-between text-xs"
                >
                  <span>
                    <span className="font-bold">{deal.label}</span>{' '}
                    <span className="text-[#58b84a]">(-{deal.discount}%)</span>
                  </span>
                  <span className="font-num font-bold text-[#f2c02a]">
                    {deal.bought ? 'SOLD' : `${fmt(deal.price)}c`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reel! Control Bar + Mode Switcher + Bite Timing Gauge + Auto-Sell Filter + Last Catch Card */}
      <div className="panel-navy p-2.5 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {!f.started ? (
            <button
              type="button"
              onClick={() => setChoosingStartMode(true)}
              className="btn-pixel px-5 py-2 font-heading text-sm flex items-center gap-2 text-[#58b84a] ring-2 ring-[#f2c02a]"
            >
              <Icon name="reel" scale={1} />
              <span>▶ START FISHING</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={actions.reelClick}
                className={`btn-pixel px-4 py-2 font-heading text-sm flex items-center gap-2 ${
                  isBite ? 'ring-2 ring-[#fff6a8] brightness-125' : ''
                }`}
              >
                <Icon name="reel" scale={1} />
                <span>{isBite ? 'REEL NOW!' : f.phase === 'wait' ? 'WAITING...' : f.phase.toUpperCase()}</span>
              </button>
              <Tip label="Stop fishing and rest on the dock">
                <button
                  type="button"
                  onClick={actions.stopFishing}
                  className="btn-pixel px-2.5 py-2 text-xs font-bold text-[#ff8a8a]"
                >
                  ⏹ Stop
                </button>
              </Tip>
            </div>
          )}

          {/* Live Manual / Auto Fishing Mode Switcher */}
          <div className="pixel-box p-1 flex items-center gap-1">
            <Tip label="Manual Mode: You must click REEL NOW! when a fish bites or it gets away.">
              <button
                type="button"
                onClick={() => (f.started ? actions.setFishingMode('manual') : actions.startFishing('manual'))}
                className={`btn-pixel px-2.5 py-1 text-xs font-bold ${
                  f.started && f.mode === 'manual' ? 'is-pressed text-[#f2c02a] ring-1 ring-[#f2c02a]' : ''
                }`}
              >
                🎯 Manual
              </button>
            </Tip>
            <Tip
              label={`Automatic Mode: Auto-reels catches with a ${Math.round(
                st.autoPerfectChance * 100,
              )}% chance of a Perfect Reel. Upgrade "Clockwork Auto-Reeler" in the Shop to raise Perfect chance!`}
            >
              <button
                type="button"
                onClick={() => (f.started ? actions.setFishingMode('auto') : actions.startFishing('auto'))}
                className={`btn-pixel px-2.5 py-1 text-xs font-bold ${
                  f.started && f.mode === 'auto' ? 'is-pressed text-[#58b84a] ring-1 ring-[#58b84a]' : ''
                }`}
              >
                ⚙ Auto ({Math.round(st.autoPerfectChance * 100)}% Perf)
              </button>
            </Tip>
          </div>

          {/* Timing Bar */}
          <div className="flex-1 min-w-44">
            <div className="flex justify-between text-xs text-[#b8c7e0] mb-0.5">
              <span>
                {!f.started ? (
                  <strong className="text-[#9aa8b8]">IDLE ON DOCK</strong>
                ) : (
                  <>
                    Phase: <strong className="uppercase text-[#fff6a8]">{f.phase}</strong> (
                    {f.mode === 'manual' ? 'Manual' : 'Auto'})
                  </>
                )}
                {s.perfectCombo > 0 && (
                  <span className="ml-2 text-[#58b84a]">Perfect Combo x{s.perfectCombo}</span>
                )}
              </span>
              <span>
                Auto Perf: {Math.round(st.autoPerfectChance * 100)}% • Perfect: x{st.perfectBonus.toFixed(2)}
              </span>
            </div>
            <div className="relative w-full h-5 bg-[#100b1a] border-2 border-[#1a1228] overflow-hidden">
              {/* Perfect sweet-spot window */}
              <div
                className="absolute top-0 bottom-0 bg-[#f2c02a]/45 border-x border-[#f2c02a]"
                style={{
                  left: `${(pa / st.biteWindow) * 100}%`,
                  width: `${((pb - pa) / st.biteWindow) * 100}%`,
                }}
                title="Perfect Reel Window"
              />
              {/* Bite cursor */}
              {f.started && isBite && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-[#fff6a8]"
                  style={{ left: `${biteProgress * 100}%` }}
                />
              )}
              {f.started && !isBite && (
                <div
                  className="h-full bg-[#3b66b0]"
                  style={{ width: `${Math.min(100, (f.t / Math.max(0.1, f.dur)) * 100)}%` }}
                />
              )}
            </div>
          </div>

          {/* Zone Boss Challenge & Auto-Sell Toggle + Filter Button */}
          <div className="flex items-center gap-1.5">
            <Tip
              label={
                <div>
                  <div className="font-bold text-[#f2c02a]">Boss: {currentZd.boss.name}</div>
                  <div className="text-xs">
                    Defeat within 30s for a Gold Chest and +25% permanent value in {currentZd.name}.
                  </div>
                </div>
              }
            >
              <button
                type="button"
                disabled={!!s.boss || s.bossCooldown > 0}
                onClick={actions.challengeZoneBoss}
                className="btn-pixel px-2.5 py-1.5 text-xs font-bold"
              >
                {s.bossCooldown > 0
                  ? `Boss (${fmtTime(s.bossCooldown)})`
                  : s.bossDefeated[s.zone]
                    ? `⚔ Rematch Boss`
                    : `⚔ Fight Boss`}
              </button>
            </Tip>

            <Tip label="Toggle Auto-Sell ON/OFF. Fish matching your Auto-Sell Filter are sold automatically; all other fish are stored in your Inventory.">
              <button
                type="button"
                onClick={actions.toggleAutoSell}
                className={`btn-pixel px-2.5 py-1.5 text-xs font-bold ${
                  s.autoSell ? 'text-[#58b84a]' : 'text-[#f2a02a]'
                }`}
              >
                Auto-Sell: {s.autoSell ? `ON (${Math.round(st.autoSellRate * 100)}%)` : 'OFF'}
              </button>
            </Tip>

            <Tip label="Customize which fish Rarities, Mutations, and Sizes (cm) get auto-sold vs. kept in Inventory">
              <button
                type="button"
                onClick={() => setAutoSellFilterOpen((v) => !v)}
                className={`btn-pixel px-2.5 py-1.5 text-xs font-bold ${
                  autoSellFilterOpen ? 'is-pressed text-[#f2c02a]' : 'text-[#9ad8ff]'
                }`}
              >
                ⚙ Auto-Sell Filter
              </button>
            </Tip>
          </div>
        </div>

        {/* Customizable Auto-Sell Filter Panel */}
        {autoSellFilterOpen && (
          <div className="pixel-box p-2.5 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-heading text-[11px] text-[#f2c02a]">
                CUSTOM AUTO-SELL FILTER (UNCHECKED FISH ARE KEPT IN INVENTORY)
              </span>
              <span className="text-[#9aa8b8]">
                Inventory: {s.inventory.length}/{BALANCE.inventoryCap}
              </span>
            </div>

            {/* Rarity toggles */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#b8c7e0] mr-1">Sell Rarities:</span>
              {RARITIES.map((r) => {
                const checked = s.autoSellConfig.rarities[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => actions.toggleAutoSellRarity(r)}
                    className={`btn-pixel px-2 py-0.5 text-xs font-bold flex items-center gap-1 ${
                      checked ? 'is-pressed' : 'opacity-60'
                    }`}
                    style={{ color: RARITY_COLOR[r] }}
                  >
                    <span>{checked ? '☑' : '☐'}</span>
                    <span>
                      {RARITY_SHAPE[r]} {RARITY_LABEL[r]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Size & Mutation filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#26395c]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#b8c7e0]">Keep Mutated Fish:</span>
                {(
                  [
                    [0, 'Sell Mutated Too'],
                    [1, 'Keep Any Mutated (1+)'],
                    [2, 'Keep 2+ Mutations'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => actions.updateAutoSellConfig({ keepMutationsAtLeast: val })}
                    className={`btn-pixel px-2 py-0.5 text-xs ${
                      s.autoSellConfig.keepMutationsAtLeast === val
                        ? 'is-pressed text-[#f2c02a] font-bold'
                        : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-[#b8c7e0]">
                  <span>Min Size (cm):</span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={s.autoSellConfig.minSizeCm}
                    onChange={(e) =>
                      actions.updateAutoSellConfig({
                        minSizeCm: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-14 px-1 py-0.5 bg-[#0b1020] border border-[#26395c] text-[#eef4ff] font-num text-center"
                  />
                </label>
                <label className="flex items-center gap-1 text-[#b8c7e0]">
                  <span>Max Size (cm, 0=any):</span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={s.autoSellConfig.maxSizeCm}
                    onChange={(e) =>
                      actions.updateAutoSellConfig({
                        maxSizeCm: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-14 px-1 py-0.5 bg-[#0b1020] border border-[#26395c] text-[#eef4ff] font-num text-center"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Last Catch Popup Card */}
        {lastCatch && lastCatch.fish && (
          <div
            className={`slot-${lastCatch.rarity} px-3 py-1.5 flex flex-wrap items-center justify-between gap-2`}
          >
            <div className="flex items-center gap-2.5">
              <FishSprite fishId={lastCatch.fish.id} mutations={lastCatch.mutations} baseScale={1} />
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="font-heading text-xs"
                    style={{ color: RARITY_COLOR[lastCatch.rarity] }}
                  >
                    {lastCatch.fish.name}
                  </span>
                  <RarityBadge rarity={lastCatch.rarity} />
                  <MutationBadges mutations={lastCatch.mutations} glitchMult={lastCatch.glitchMult} />
                  {lastCatch.isDouble && (
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-[#3cf0d0]/20 text-[#3cf0d0] border border-[#3cf0d0]">
                      2x DOUBLE!
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#b8c7e0] italic">
                  "{lastCatch.fish.flavor}" • {lastCatch.size}cm
                  {lastCatch.forcedBy && <span className="text-[#f2c02a] not-italic ml-1">({lastCatch.forcedBy})</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-num text-lg font-bold text-[#f2c02a]">
              <Sprite group="items" name="coin" scale={1} />
              <span>+{fmt(lastCatch.value)}</span>
              <span className="text-xs text-[#9ad8ff]">+{lastCatch.xp} XP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
