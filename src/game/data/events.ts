import type { EventId, MutationId, WeatherId } from '../types';

export interface WeatherDef {
  id: WeatherId;
  name: string;
  desc: string;
  bite: number; // bite speed multiplier (>1 = faster)
  luck: number; // flat luck
  value: number; // value multiplier
  mutation: number; // global mutation multiplier
  mut?: Partial<Record<MutationId, number>>;
  chest: number;
  tint: string | null; // overlay color for the scene
}

export const WEATHER: Record<WeatherId, WeatherDef> = {
  clear: { id: 'clear', name: 'Clear', desc: 'Calm skies. No modifiers.', bite: 1, luck: 0, value: 1, mutation: 1, chest: 1, tint: null },
  rain: { id: 'rain', name: 'Rain', desc: 'Bite speed x1.25, Shiny x1.5.', bite: 1.25, luck: 0, value: 1, mutation: 1, mut: { shiny: 1.5 }, chest: 1, tint: 'rgba(40,60,110,0.22)' },
  storm: { id: 'storm', name: 'Storm', desc: 'Bite x1.5, value x1.2, Giant x2, Glitched x1.5.', bite: 1.5, luck: 0, value: 1.2, mutation: 1, mut: { giant: 2, glitched: 1.5 }, chest: 1, tint: 'rgba(20,24,60,0.38)' },
  fog: { id: 'fog', name: 'Fog', desc: 'Luck +30, Cursed x2, bites x0.85.', bite: 0.85, luck: 30, value: 1, mutation: 1, mut: { cursed: 2 }, chest: 1, tint: 'rgba(200,210,220,0.28)' },
  aurora: { id: 'aurora', name: 'Aurora', desc: 'Luck +20, all mutations x2, Prismatic x3.', bite: 1, luck: 20, value: 1, mutation: 2, mut: { prismatic: 1.5 }, chest: 1, tint: 'rgba(60,240,180,0.14)' },
  bloodmoon: { id: 'bloodmoon', name: 'Blood Moon', desc: 'Luck +60, value x1.5, Cursed x4, Golden x2, bites x0.9.', bite: 0.9, luck: 60, value: 1.5, mutation: 1, mut: { cursed: 4, golden: 2 }, chest: 1, tint: 'rgba(170,20,40,0.3)' },
  meteor: { id: 'meteor', name: 'Meteor Shower', desc: 'Chests x3, Glitched x3, Prismatic x2.', bite: 1, luck: 10, value: 1, mutation: 1, mut: { glitched: 3, prismatic: 2 }, chest: 3, tint: 'rgba(30,20,70,0.3)' },
};
export const WEATHER_IDS = Object.keys(WEATHER) as WeatherId[];

export interface EventDef {
  id: EventId;
  name: string;
  desc: string;
  duration: [number, number];
  weight: number;
  good: boolean;
  minZone: number;
}

export const EVENTS: Record<EventId, EventDef> = {
  frenzy: { id: 'frenzy', name: 'Fish Frenzy', desc: 'Bite speed x3!', duration: [30, 40], weight: 22, good: true, minZone: 1 },
  school: { id: 'school', name: 'School of Rares', desc: 'Rare+ weights x3!', duration: [25, 35], weight: 16, good: true, minZone: 1 },
  treasure: { id: 'treasure', name: 'Treasure Current', desc: 'Every catch is a chest!', duration: [18, 24], weight: 10, good: true, minZone: 1 },
  kraken: { id: 'kraken', name: 'Kraken Shadow', desc: 'Click the Kraken to damage it before it escapes!', duration: [30, 30], weight: 8, good: true, minZone: 2 },
  merchant: { id: 'merchant', name: 'Merchant Boat', desc: 'A traveling merchant with 3 random deals.', duration: [60, 60], weight: 14, good: true, minZone: 1 },
  seagull: { id: 'seagull', name: 'Lucky Seagull', desc: 'Click the seagull for a reward!', duration: [12, 12], weight: 16, good: true, minZone: 1 },
  rust: { id: 'rust', name: 'Rust Tide', desc: 'Value x0.5, but catches drop Scrap.', duration: [35, 45], weight: 12, good: false, minZone: 1 },
};
export const EVENT_IDS = Object.keys(EVENTS) as EventId[];
