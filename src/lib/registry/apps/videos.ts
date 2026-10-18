import type { AppDef } from "./factory";

/** [id, name, one line, the instruction]. The picture in the slot is the first frame. */
type Row = [string, string, string, string];

const make = (group: string, rows: Row[], slot: string): AppDef[] =>
  rows.map(([id, name, tagline, prompt]) => ({ id, name, group, tagline, slots: [slot], prompt }));

const PRODUCT = "Keep the product's shape, colours, label and logo exactly as in the picture.";

/** Product ads: one product picture, one ready-made scene. */
const ADS: Row[] = [
  ["asmr-classic", "ASMR Classic", "A slow, satisfying close-up ASMR clip.", `Slow, satisfying ASMR close-up of this product: soft fingertip taps, gentle handling, crisp detail, quiet room tone with delicate sounds. ${PRODUCT}`],
  ["asmr-host", "ASMR Host", "An ASMR host presents the product in a cosy studio.", `An ASMR host in a softly lit studio picks up this product and presents it to the camera, whispering and tapping it gently. ${PRODUCT}`],
  ["poster", "Poster", "A bold poster-style product video.", `A graphic poster-style motion ad: the product centred on a bold colour background, large type elements sliding in, a slow push-in. ${PRODUCT}`],
  ["bullet-time-scene", "Bullet Time Scene", "A 360° frozen-moment orbit in a matching scene.", `The camera orbits 360 degrees around the product frozen in mid-air in a scene that suits it, with floating particles and slow motion. ${PRODUCT}`],
  ["bullet-time-white", "Bullet Time White", "A 360° orbit on a pure white background.", `The camera orbits 360 degrees around the product, which hovers on a seamless pure white studio background with a soft shadow. ${PRODUCT}`],
  ["bullet-time-splash", "Bullet Time Splash", "The product bursts apart in slow motion.", `In extreme slow motion the product bursts into a splash of its own ingredients, colours and droplets, frozen in the air while the camera sweeps around, then reassembles. ${PRODUCT}`],
  ["chameleon", "Chameleon", "A chameleon takes on the product's colour.", `A chameleon climbs next to the product and its skin gradually changes to exactly match the product's colours and pattern. ${PRODUCT}`],
  ["packshot", "Packshot", "A closing packshot frame, polished and still.", `A polished closing packshot: the product centred on a clean surface, subtle light sweeps across it, tiny sparkles, very slow push-in. ${PRODUCT}`],
  ["macro-scene", "Macro Scene", "A macro close-up in a fitting environment.", `Extreme macro close-up gliding across the product's surface, in an environment that suits it, with shallow depth of field and tiny drifting details. ${PRODUCT}`],
  ["macroshot-product", "Macroshot", "A macro shot of the product's details.", `A smooth macro shot sliding along the product's most interesting details and textures with soft studio lighting and shallow focus. ${PRODUCT}`],
  ["magic-button", "Magic Button", "A button press makes the product world come alive.", `A finger presses a glowing magic button and the product's world comes alive: sparkles, motion, objects rising and reorganising around the product in a magical setting. ${PRODUCT}`],
  ["truck-ad", "Truck Ad", "The product on the side of a passing truck.", `A big delivery truck drives past with this product printed huge on its side, filmed from the roadside, city street, daylight. ${PRODUCT}`],
  ["giant-product", "Giant Product", "A giant version of the product in a city skyline.", `A gigantic version of the product stands among skyscrapers like a monument, people look up in awe, the camera tilts up to reveal its size. ${PRODUCT}`],
  ["kick-ad", "Kick Ad", "The product kicks a rival product away.", `A foot in a sneaker kicks a plain generic competitor product out of the frame, and this product slides in and stops in the centre. ${PRODUCT}`],
  ["billboard-ad", "Billboard Ad", "A giant billboard timelapse for the product.", `A timelapse of a huge city billboard showing this product, clouds racing over it and the day turning to night, the billboard lighting up. ${PRODUCT}`],
  ["graffiti-ad", "Graffiti Ad", "The product sprayed as street graffiti.", `A street artist sprays this product as a huge colourful graffiti piece on a brick wall, time-lapse style, ending on the finished mural. ${PRODUCT}`],
  ["fridge-ad", "Fridge Ad", "The product shining inside an open fridge.", `A fridge door opens to reveal the product glowing on the middle shelf, cold mist spilling out, camera pushes in. ${PRODUCT}`],
  ["volcano-ad", "Volcano Ad", "The product in front of an erupting volcano.", `The product stands unharmed in front of an erupting volcano with glowing lava and ash in the sky, dramatic cinematic light. ${PRODUCT}`],
  ["behind-the-scenes", "Behind the Scenes", "A vertical behind-the-camera shoot of the picture.", "A vertical behind-the-scenes video of the shoot that made this picture: the crew, lights and camera around the set, then the camera turns to the scene exactly as in the picture."],
];

/** Trending one-click templates: one portrait or picture, one ready-made scene. */
const TEMPLATES: Row[] = [
  ["yes-kiss", "Yes Kiss", "A sweet cheek-kiss moment from nowhere.", "Someone leans in from the side and gives the person a quick kiss on the cheek; the person smiles and laughs, handheld, warm light."],
  ["latex", "Latex", "A glossy latex fashion look.", "The person is wearing a glossy black latex fashion outfit, posing under hard studio light with shiny reflections, slow camera drift."],
  ["j-magazine", "J-Magazine", "A Japanese fashion magazine cover coming alive.", "The picture becomes a Japanese fashion magazine cover with stylish typography, pages turning, the person moving subtly inside the cover."],
  ["roller-coaster", "Roller Coaster", "A screaming ride on a roller coaster.", "The person rides the front of a roller coaster at speed, hair flying, laughing and screaming, the track dropping away ahead."],
  ["60s-cafe", "60s Cafe", "A sixties café, retro film look.", "The person sits in a 1960s café, retro film grain and warm colours, stirring a cup of coffee, jukebox glow in the background."],
  ["victory-card", "Victory Card", "A winner's trading card that comes alive.", "The picture becomes a shiny collectible victory trading card with a holographic border; the person punches the air in triumph as confetti falls."],
  ["sand-worm", "Sand Worm", "A giant sand worm erupts behind you.", "A colossal sand worm bursts out of a desert dune behind the person, who stays calm and looks at the camera, sand pouring everywhere."],
  ["skibidi", "Skibidi", "A meme-style head-bobbing toilet-song edit.", "A goofy meme edit: the person bobs their head to a catchy beat in a bathroom, camera zooming in and out fast, absurd comedy."],
  ["j-poster", "J-Poster", "A Japanese movie poster in motion.", "The picture becomes a Japanese movie poster with bold vertical typography; the person's eyes open and the poster elements drift gently."],
  ["mascot", "Mascot", "You as a sports-team mascot.", "The person transforms into a cartoon sports-team mascot costume that matches their features, dancing on the sideline of a stadium."],
  ["storm-creature", "Storm Creature", "A creature made of storm clouds looms over you.", "A giant creature made of dark storm clouds and lightning forms in the sky behind the person and roars as the wind whips their hair."],
  ["burning-sunset", "Burning Sunset", "A glowing sunset that turns the sky to fire.", "The person walks toward the camera as the sunset ignites the whole sky in fiery orange, wind in their hair, cinematic backlight."],
  ["on-fire", "On Fire", "Calm in a burning room.", "The person sits calmly drinking coffee while the room around them burns, flames licking the walls, a joke of total calm."],
  ["comic-book", "Comic Book", "The picture jumps into a comic book page.", "The picture turns into a bold comic book page with halftone dots and speech bubbles, panels shifting as the person strikes a hero pose."],
  ["cloud-surf", "Cloud Surf", "Surfing on a cloud above the world.", "The person surfs on a fluffy cloud high above a sunset landscape, arms balancing, scarves and hair streaming."],
  ["mukbang", "Mukbang", "A big, cheerful eating show.", "The person sits at a table piled with food and happily eats to the camera, ring-light reflections, close and cheerful, mukbang style."],
  ["melting-doodle", "Melting Doodle", "The picture melts into a colourful doodle.", "The person slowly melts and swirls into a bright hand-drawn doodle, which reforms into a cartoon version of them."],
  ["giallo-horror", "Giallo Horror", "A stylish Italian horror thriller moment.", "A 1970s Italian giallo horror scene: moody red and blue lighting, a gloved hand reaching in the shadows, the person turns slowly."],
  ["renaissance", "Renaissance", "An oil-painting portrait that blinks and smiles.", "The picture becomes a Renaissance oil painting in a gilded frame in a museum hall; the painted person blinks, smiles and turns their head."],
  ["rap-god", "Rap God", "Rapping at lightning speed on stage.", "The person raps at lightning speed on a smoky stage with strobe lights, hands moving to the beat, the crowd roaring."],
  ["mugshot", "Mugshot", "A playful police-lineup photo.", "A comedic police mugshot: the person holds a height-chart number board, camera flash pops, they pull a funny face, then grin."],
  ["ghoulgao", "Ghoulgao", "A spooky ghoul transformation.", "The person's features slowly change into a friendly cartoon ghoul with glowing eyes and pale skin in a foggy graveyard."],
  ["social-media-icon", "Social Media Icon", "You inside a social app profile frame.", "The picture becomes a round social media profile icon with a live-badge ring; likes and hearts pop up as the person waves."],
  ["idol", "Idol", "A K-pop idol moment on stage.", "The person becomes a pop idol performing a choreographed dance on a bright stage with light sticks waving in the crowd."],
  ["banana-eating", "Banana Eating", "A funny banana-eating clip.", "The person peels and eats a banana with an overly dramatic expression, close up, bright kitchen light, comedic timing."],
];

export const VIDEO_APPS: AppDef[] = [
  ...make("Ads", ADS, "product picture"),
  ...make("Templates", TEMPLATES, "picture"),
  {
    id: "asmr-add-on",
    name: "ASMR Add-On",
    group: "Ads",
    tagline: "A character adds the product into an ASMR scene.",
    slots: ["character picture", "product picture"],
    mode: "refs",
    prompt: "A slow, satisfying ASMR video: the character from the first reference picture gently handles and presents the product from the second reference picture, soft close-ups, delicate sounds. The product keeps its exact shape, colours and logo.",
  },
  {
    id: "transitions",
    name: "Transitions",
    group: "Video",
    tagline: "A transition between a start picture and an end picture.",
    slots: ["start frame", "end frame"],
    mode: "frames",
    options: [
      { key: "move", label: "Transition", choices: [["a smooth morph where shapes and colours flow into the next picture", "Morph"], ["a whip pan with strong motion blur", "Whip pan"], ["a burst of smoke that reveals the next picture", "Smoke"], ["a flock of ravens flying across and revealing the next picture", "Ravens"], ["a glitch and digital distortion cut", "Glitch"], ["a fast zoom through the centre into the next picture", "Zoom through"], ["a page-peel revealing the next picture beneath", "Page peel"], ["liquid water washing over the frame into the next picture", "Water"]] },
    ],
    prompt: "A cinematic transition from the first frame to the last frame: {move}.",
  },
];
