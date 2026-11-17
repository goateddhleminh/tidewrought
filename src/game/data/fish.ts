import { manifest } from '../assets';
import type { FishDef, Rarity, TimeOfDay, WeatherId } from '../types';

/**
 * FISH DATABASE.
 * The 30 base species come straight from public/assets/manifest.json (name,
 * zone, rarity, baseValue, flavor). Adding a fish to the manifest adds it here.
 * Weather / night variants re-use a base sprite with a code-side CSS tint.
 */
const base: FishDef[] = Object.entries(manifest.groups.fish).map(([key, e]) => ({
  id: key,
  name: e.name ?? key,
  zone: e.zone ?? 1,
  rarity: (e.rarity ?? 'common') as Rarity,
  baseValue: e.baseValue ?? 1,
  flavor: e.flavor ?? '',
  sprite: key,
  w: e.w,
  h: e.h,
}));

type V = [id: string, name: string, sprite: string, rarity: Rarity, value: number, flavor: string, tint: string, weather?: WeatherId[], time?: TimeOfDay[]];

const variants: Record<number, V[]> = {
  1: [
    ['drizzle_darter', 'Drizzle Darter', 'minnow', 'common', 5, 'Only shows up when it is wet. Hates sunscreen.', 'hue-rotate(170deg) saturate(1.4)', ['rain', 'storm']],
    ['moon_gill', 'Moonlit Bluegill', 'bluegill', 'uncommon', 16, 'Glows faintly. Refuses to explain why.', 'hue-rotate(220deg) brightness(0.85)', undefined, ['night']],
    ['thunder_perch', 'Thunder Perch', 'perch', 'rare', 60, 'Struck by lightning twice. Liked it.', 'hue-rotate(55deg) saturate(1.8)', ['storm']],
    ['duke_carpington', 'Duke Carpington', 'carp', 'epic', 140, 'Demands to be called "Your Grace".', 'hue-rotate(250deg) saturate(1.4)'],
    ['mistwhisker', 'Mistwhisker', 'catfish', 'epic', 190, 'Appears in fog. Disappears in arguments.', 'grayscale(0.7) brightness(1.25)', ['fog']],
    ['crimson_koi', 'Crimson Koi', 'koi', 'mythic', 3200, 'Bathed in moonlight the color of jam.', 'hue-rotate(-45deg) saturate(2)', ['bloodmoon']],
    ['minnow_who_knows', 'The Minnow Who Knows', 'minnow', 'mythic', 2500, 'It has read every book. Out loud.', 'hue-rotate(290deg) saturate(2.2)'],
  ],
  2: [
    ['root_skipper', 'Root Skipper', 'mudskipper', 'common', 8, 'Lives in the roots. Pays no rent.', 'hue-rotate(80deg)'],
    ['rainbow_archer', 'Rainbow Archer', 'archer', 'rare', 70, 'Aims for rainbows. Hits them.', 'hue-rotate(140deg) saturate(1.6)', ['rain']],
    ['night_snake', 'Midnight Snakehead', 'snakehead', 'rare', 75, 'Hunts at night. Naps by day. Judges always.', 'hue-rotate(200deg) brightness(0.75)', undefined, ['night', 'dusk']],
    ['fog_barra', 'Foggy Barramundi', 'barra', 'epic', 200, 'Mostly mist, with fins attached.', 'grayscale(0.65) brightness(1.15)', ['fog']],
    ['mangrove_monarch', 'Mangrove Monarch', 'tarpon', 'legendary', 900, 'Rules the creek. Nobody voted.', 'hue-rotate(35deg) saturate(1.9)'],
    ['thunder_eel', 'Thunder Eel', 'eel', 'legendary', 1300, 'Powers three villages. Unpaid.', 'hue-rotate(180deg) saturate(2)', ['storm']],
    ['sunken_crown', 'Sunken Crownfish', 'barra', 'mythic', 5000, 'Wears a tiny crown. It is real gold.', 'sepia(1) saturate(3)'],
  ],
  3: [
    ['sergeant_clown', 'Sergeant Clown', 'clown', 'common', 12, 'Salutes everything. Including rocks.', 'hue-rotate(200deg)'],
    ['aurora_tang', 'Aurora Tang', 'tang', 'uncommon', 34, 'Only blue when the sky is green.', 'hue-rotate(95deg) saturate(1.6)', ['aurora']],
    ['storm_puffer', 'Storm Puffer', 'puffer', 'epic', 220, 'Inflates with static. Zaps hugs.', 'hue-rotate(250deg) saturate(1.5)', ['storm', 'rain']],
    ['reef_regent', 'Reef Regent', 'angel', 'legendary', 950, 'The reef bows. The reef has no choice.', 'hue-rotate(60deg) saturate(1.7)'],
    ['bloodjelly', 'Blood Jelly', 'moonjelly', 'legendary', 1100, 'Glows red. Probably fine.', 'hue-rotate(-120deg) saturate(2.2)', ['bloodmoon']],
    ['starlit_lion', 'Starlit Lionfish', 'lion', 'legendary', 1300, 'Only fabulous after dark.', 'hue-rotate(180deg) brightness(1.1)', undefined, ['night']],
    ['coral_queen', 'Coral Queen', 'angel', 'mythic', 7000, 'Owns the reef. Rents it to fish.', 'hue-rotate(300deg) saturate(2.3)'],
  ],
  4: [
    ['dim_lantern', 'Dim Lanternfish', 'lantern', 'common', 18, 'Forgot to charge its light.', 'brightness(0.7)'],
    ['pressure_blob', 'Pressure Blob', 'blob', 'uncommon', 42, 'Under a lot of pressure. Emotionally too.', 'hue-rotate(160deg)'],
    ['fog_gulper', 'Fog Gulper', 'gulper', 'epic', 280, 'Swallowed a cloud once. Still burping.', 'grayscale(0.8) brightness(1.15)', ['fog']],
    ['meteor_viper', 'Meteor Viper', 'viper', 'epic', 300, 'Bites falling stars. Teeth are warm.', 'hue-rotate(30deg) saturate(2)', ['meteor']],
    ['sunless_angler', 'Sunless Angler', 'angler', 'legendary', 1200, 'Has never seen the sun. Does not miss it.', 'hue-rotate(200deg)'],
    ['the_deep_one', 'The Deep One', 'angler', 'mythic', 8000, 'Older than the trench. Ruder too.', 'brightness(0.6) contrast(1.4) hue-rotate(260deg)'],
    ['blood_ghost', 'Crimson Wraith', 'ghost', 'mythic', 9000, 'Haunts the trench on red nights.', 'hue-rotate(-60deg) saturate(2.5)', ['bloodmoon']],
  ],
  5: [
    ['dust_mote', 'Stardust Mote', 'starfin', 'common', 30, 'A fish-shaped speck of the cosmos.', 'grayscale(0.5) brightness(0.9)'],
    ['star_minnow', 'Star Minnow', 'starfin', 'common', 36, 'Twinkles when it swims.', 'hue-rotate(90deg)'],
    ['orbit_fin', 'Orbit Fin', 'starfin', 'uncommon', 58, 'Swims in perfect circles. Dizzy.', 'hue-rotate(200deg) saturate(1.5)', ['rain', 'storm']],
    ['aurora_koi', 'Aurora Koi', 'nebula', 'epic', 400, 'Paints the sky when it jumps.', 'hue-rotate(120deg)', ['aurora']],
    ['meteor_darter', 'Meteor Darter', 'comet', 'legendary', 1800, 'Arrives with the meteors. Leaves a crater.', 'hue-rotate(-30deg) saturate(2)', ['meteor']],
    ['eclipse_jelly', 'Eclipse Jelly', 'cosmojelly', 'legendary', 2000, 'Swallows moons. Spits out the craters.', 'hue-rotate(-90deg)', ['bloodmoon']],
    ['singularity', 'Singularity Fin', 'leviathan', 'mythic', 15000, 'Everything falls toward it. Including your rod.', 'invert(1) hue-rotate(180deg)'],
  ],
};

const variantDefs: FishDef[] = [];
for (const [zoneStr, list] of Object.entries(variants)) {
  for (const [id, name, sprite, rarity, value, flavor, tint, weather, time] of list) {
    const e = manifest.groups.fish[sprite];
    if (!e) continue;
    variantDefs.push({ id, name, zone: Number(zoneStr), rarity, baseValue: value, flavor, sprite, tint, weather, time, w: e.w, h: e.h });
  }
}

export const FISH: FishDef[] = [...base, ...variantDefs];
export const FISH_BY_ID: Record<string, FishDef> = Object.fromEntries(FISH.map((f) => [f.id, f]));
export const fishInZone = (zone: number) => FISH.filter((f) => f.zone === zone);

export function fishConditionLabel(f: FishDef): string | null {
  const parts: string[] = [];
  if (f.weather) parts.push(f.weather.map((w) => manifest.groups.weather[w]?.name ?? w).join(' / '));
  if (f.time) parts.push(f.time.map((t) => t[0].toUpperCase() + t.slice(1)).join(' / '));
  return parts.length ? parts.join(' + ') : null;
}
