/**
 * Prompts de referência para o gerador de imagens, um por figurinha (as gráficas ficam de fora: são feitas em código).
 * Comum e Incomum pedem a gravura de horizonte; Rara e Lendária pedem pintura. O assunto vai nos 60% de cima,
 * porque a placa com o nome cobre o terço de baixo.
 */
import { PAGES, STICKERS, GRAFICAS } from './catalogo.mjs';
export { GRAFICAS };

/** O assunto de cada figurinha, em inglês. */
export const EN = {
  1: 'A small stone cottage on top of a gentle hill at dusk, warm light in two windows and an arched open door, a thin curl of chimney smoke, pine trees beside it, a lit path running down the hill, first stars in the sky.',
  2: 'A traditional windmill with four lattice sails standing on a hill, seen in silhouette against a huge low setting sun, a field of golden wheat in the foreground, a few birds.',
  3: 'An old round stone well with a small wooden roof, rope and bucket, at night; warm golden light rises from inside the well and a few coins float upward with sparks, dark pine forest and a pale moon behind.',
  4: 'A single stone arch bridge spanning a calm river, seen straight on from water level; the sun sits low inside the arch and the arch with its reflection forms a perfect ring of light; morning mist, reeds in the corners.',
  5: 'A tall wooden signpost with three arrow boards pointing in different directions and a small lantern hanging from it, at a fork where a dirt road splits in two toward the horizon, big sunset clouds.',
  6: 'Top-down still life on a dark wooden table: an almost blank old parchment map with only a tiny village drawn in one corner and a dotted path leaving it, a brass compass, a lit candle and a quill.',
  7: 'An immense ancient tree seen from below, its canopy closing the sky like a cathedral ceiling, light breaking through the leaves.',
  8: 'A trail of moss-covered stepping stones leading into a dense forest, ferns on both sides, soft light ahead.',
  9: 'Glowing mushrooms of different sizes growing around a fallen log in a dark forest, their soft light on the moss.',
  10: 'Wooden houses and rope bridges built high around giant tree trunks, small lanterns lit along the walkways.',
  11: 'A small fox with a long tail that glows like a lantern, sitting calmly on a forest trail at twilight, the glow lighting the path around it.',
  12: 'An ancient moss-covered stone portal standing alone in a deep forest; inside the arch, warm golden light from another world pours through, lighting the ferns and the wet stones of a narrow path; giant trunks and mist around.',
  13: 'Ruined stone columns and broken arches overgrown with ivy under a clear pale sky.',
  14: 'A waterfall falling behind a ruined stone arch, spray and moss, sunlight through the mist.',
  15: 'A fallen stone column lying across a shallow clear stream, small fish shadows, ferns on the banks.',
  16: 'A tall guardian statue carved from white stone, holding a staff, partly covered by ivy, standing among ruins.',
  17: 'Wide temple stairs descending into a calm, crystal-clear lake, the submerged steps visible under the water.',
  18: 'A vast underground hall carved in rock; a single shaft of light falls from a crack in the ceiling onto a stone pedestal holding a mysterious glowing artifact; dust in the light, echoes of old carvings on the walls.',
  19: 'A valley covered in wild flowers, layers of violet mountains behind, warm sunset light.',
  20: 'A torn plain banner without any emblem, flapping on a spear planted on a hilltop, wind and evening sky.',
  21: 'A long ancient wall following the mountain ridges until it disappears into the horizon.',
  22: 'A jade-green river winding between tall cliffs, seen from above.',
  23: 'A golden crown resting on an empty stone throne, coloured light falling from a stained-glass window, dust in the air.',
  24: 'A city of slender towers in a deep valley at sunset, seen from the edge of a cliff; rivers of light between the buildings, birds, distant mountains fading into violet haze.',
  25: 'Mountain peaks piercing a sea of clouds, morning sun above.',
  26: 'A patched canvas hot-air balloon with a wicker basket rising between clouds.',
  27: 'A lighthouse on a floating rock among the clouds, its beam sweeping the sky.',
  28: 'A perfect rainbow arch over a bridge made of clouds.',
  29: 'A white castle with tall spires standing on a bank of clouds, waterfalls pouring from its edges into the open sky, sunlight on the stone.',
  30: 'An entire island floating in an endless sky, roots and waterfalls hanging from its underside, a small temple and trees on top, other tiny islands in the distance, epic scale, glorious light.',
  31: 'Desert dunes with clusters of glass crystals growing out of the sand, reflecting the sun.',
  32: 'An oasis: palm trees around a mirror-like pool in the middle of the dunes.',
  33: 'A caravan of travellers and pack animals walking on the crest of a dune, in silhouette against the sun.',
  34: 'Colossal rib bones of an ancient giant half-buried in the sand, a tiny traveller walking past for scale.',
  35: 'An ancient stone sundial in the desert casting a long shadow.',
  36: 'A huge wall of sand advancing over an old desert temple.',
  37: 'A coral reef with a school of small fish and light filtering down from the surface.',
  38: 'Glowing jellyfish drifting in deep dark-blue water.',
  39: 'The hull of a wooden shipwreck resting on the sea floor, covered in seaweed, fish around it.',
  40: 'The steps and columns of a sunken temple on the sea floor, light rays from above.',
  41: 'A deep-sea anglerfish with its glowing lure in the darkness.',
  42: 'A colossal sea creature sleeping on the ocean floor, its body like a mountain range covered in coral; a lone diver with a small lamp floats in front of its closed eye; shafts of light from far above.',
  43: 'A forest of pine trees heavy with snow, quiet blue light.',
  44: 'A frozen lake, smooth as glass, reflecting snowy mountains.',
  45: 'Green and violet aurora over a white plain at night.',
  46: 'A small wooden cabin with a lit window on a snowy mountainside at night.',
  47: 'A wolf with white-blue fur standing on a rock, breath visible in the cold air.',
  48: 'A citadel made of ice and crystal under a sky full of aurora, light refracting through its towers, a frozen bridge leading to its gate.',
  49: 'A river of lava cutting through black rocks, glowing cracks, smoke.',
  50: 'An anvil with sparks flying in the air and a hammer resting against it, in a dark forge.',
  51: 'Columns of black basalt releasing smoke under an orange sky.',
  52: 'A sword blade still glowing orange-hot being pulled from the fire with tongs.',
  53: 'A giant blacksmith made of stone and fire hammering on an enormous anvil inside a volcano, showers of sparks, molten metal glowing, heat haze.',
  54: 'A colossal serpent made of magma rising from a volcanic crater, embers swirling in the sky, rivers of lava below, epic scale.',
  55: 'Swamp trees with tall twisted roots rising out of still water, mist.',
  56: 'A cloud of fireflies floating over a dark swamp at night.',
  57: 'A wooden house on stilts over swamp water, faint light at the door.',
  58: 'A small boat with a lantern crossing the fog on dark water, a lone figure rowing.',
  59: 'Water lilies opening at night on a dark pond.',
  60: 'Two glowing eyes in the middle of thick fog in a swamp, nothing else visible.',
  61: 'A rain-soaked street at night reflecting neon signs with no readable words.',
  62: 'A narrow alley full of glowing signs without letters, tangled cables overhead.',
  63: 'An elevated train passing on its track between tall buildings at night.',
  64: 'A motorcycle speeding down a wet avenue at night, headlights streaking through the rain.',
  65: 'A person standing on the ledge of a rooftop looking out over a glowing city at night.',
  66: 'A skyscraper so tall it disappears into the clouds; the whole city far below, lights and rain, flying birds for scale.',
  67: 'A golden arcade token glowing on a patterned carpet, in pixel art.',
  68: 'Close-up of an arcade joystick and round buttons on a control panel, in pixel art.',
  70: 'A row of glowing arcade cabinets in a dark room, in pixel art.',
  72: 'A giant pixel-art boss creature bursting out of an arcade screen into the dark room, pixels scattering like sparks.',
  73: 'A stone spiral staircase going down into darkness.',
  74: 'A stone corridor lit by torches on both walls.',
  75: 'A heavy iron door with a seal and chains across it.',
  76: 'A crystal floating and slowly spinning above a stone pedestal, calm light in a dark chamber.',
  77: 'A three-metre empty suit of armour standing guard on a narrow stone bridge over an abyss, a faint light inside the helmet, torches on the far side.',
  78: 'A colossal silhouette with burning eyes at the bottom of an abyss, barely visible in the darkness; a tiny person with a torch stands before it on a ledge; deep crimson light, epic scale.',
  79: 'A small exploration spaceship passing in front of a huge planet.',
  80: 'A ringed planet seen from the surface of one of its moons.',
  81: 'A nebula shaped like a flower in deep space.',
  82: 'An abandoned space station slowly spinning, sunlight on its panels.',
  83: 'A comet crossing the sky of an unknown planet, alien landscape below, a long glowing tail.',
  84: 'A whale made of light and stars swimming between colourful nebulae, trails of stardust, epic and serene.',
  86: 'A studio microphone on an articulated arm, warm key light, dark background.',
  90: 'A streamer studio at night: monitors glowing, warm desk light, an empty chair, cables and small details, cosy and cinematic.',
  91: 'Two game controllers of no real brand resting on a sofa cushion, light from a TV.',
  92: 'An open pizza box next to a game console of no real brand, late at night.',
  93: 'A television showing a split-screen game (abstract shapes, no real game).',
  94: 'A worn sofa with cushions lit by the blue light of a TV in a dark room.',
  95: 'Hands gripping a game controller tightly, sparks reflected from the screen.',
  96: 'Friends seen from behind sitting on a sofa in front of a big TV, the whole room lit by the screen, snacks and cables around, late night.',
  97: 'An open diary with handwritten notes and a small game ticket glued on the page.',
  98: 'A golden ribbon bookmark coming out of a leather book on a desk.',
  99: 'A tall stack of game boxes of no real brand waiting their turn on a desk.',
  100: 'An hourglass with golden sand on a desk, warm lamp light.',
  101: 'A hand picking up a dusty game controller from a shelf.',
  103: 'A shelf full of game boxes with colourful spines (no readable titles or logos).',
  104: 'A generic game cartridge being blown into, close-up, no brand.',
  105: 'An open game manual with a map and handwritten notes (no readable text).',
  106: 'A game box still sealed in plastic, light reflecting on the wrap, no brand.',
  107: 'A game console of no real brand wrapped in a cloth with care.',
  108: 'An illuminated glass display case with a whole game collection, every piece in its place, spotlights and reflections, dark room.',
  109: 'Speech bubbles floating over a town square at dusk, string lights.',
  110: 'Two hands exchanging trading cards over a table.',
  112: 'A community board covered in notes, drawings and pinned cards (no readable text).',
  114: 'People sitting in a circle on a plaza at dusk, speech bubbles above them.',
  116: 'A dark carpet with a thin golden border running up a staircase.',
  117: 'An audience in the dark, silhouettes and small phone lights.',
  118: 'A golden envelope sealed with wax, under a spotlight.',
  119: 'An empty stage with crossed spotlights and a giant lit screen, black and gold.',
  120: 'A tall crystal trophy plate with a golden four-pointed compass inside, standing on a golden base, under a single spotlight on a black stage, champagne light.',
};

const STYLE_CI = 'Style: layered vector landscape with the look of a fine engraved print: flat shapes in receding layers that get lighter with distance, soft bands of fog between them, one strong light source with thin rim light on the edges, fine parallel engraving lines shading the shadows, subtle paper grain. Clean and calm, no clutter.';
const STYLE_PIXEL = 'Style: detailed pixel art, crisp square pixels, limited palette, soft glow from the screens.';
const STYLE_R = 'Style: painterly fantasy concept art, rich volumetric light, fine detail, cinematic depth, soft atmospheric perspective.';
const STYLE_L = 'Style: painterly fantasy concept art at its most epic: grand scale, dramatic volumetric light, fine detail, cinematic depth, a sense of wonder.';
const FRAME = 'Composition: the subject fills the upper 60% of the frame; the bottom third is darker and calm, with no important detail (a name plate covers it).';
const NO = 'No text, letters, logos, frames, borders or watermarks. No characters, creatures, places or products from existing games, films or brands.';

export function promptFor(s) {
  const p = PAGES[s.page - 1];
  const pixel = s.page === 12 && (s.tier === 'comum' || s.tier === 'incomum');
  const style = pixel ? STYLE_PIXEL : s.tier === 'lendaria' ? STYLE_L : s.tier === 'rara' ? STYLE_R : STYLE_CI;
  const kind = s.tier === 'comum' || s.tier === 'incomum' ? 'illustration' : 'painted illustration';
  return [`Vertical 5:7 ${kind}, 1000×1400 px.`, EN[s.number], `Palette: ${p.palette}.`, style, FRAME, NO].join('\n');
}

export const PROMPTS = STICKERS.filter((s) => !GRAFICAS.has(s.number)).map((s) => ({ ...s, prompt: promptFor(s) }));
