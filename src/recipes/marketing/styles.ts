/**
 * Marketing Studio's video styles beyond the six hand-written recipes: UGC
 * kinds, TikTok kinds and a few motion looks. Each is one recipe of two
 * steps (a still of the scene, then a clip from it) made from a row here:
 * what the still shows and what happens in the clip, in our own words.
 */
import type { Recipe, Slot, Step } from "@/lib/recipes/types";
import { HOOKS, SETTINGS } from "./catalog";

/** [id, name, what the still shows, what happens in the clip]. */
type Row = [string, string, string, string];

const LOOK = "The product from the reference picture stays exactly as it is: same shape, colours, label and logo.";

const UGC: Row[] = [
  ["ugc-shopping", "Shopping", "A person in a shop aisle holding the product up to the phone camera, casual and candid.", "The person walks the aisle, picks the product off the shelf, turns it to the camera and says why they are buying it."],
  ["ugc-at-home", "At Home", "A person on their sofa at home holding the product, warm everyday light.", "The person settles in, shows the product, and talks about how it fits their day, relaxed and honest."],
  ["ugc-delivery", "Delivery", "A person at their front door with a delivery box opened, product in hand.", "The person opens the delivery package on camera, pulls out the product and reacts happily."],
  ["ugc-review", "Review", "A person holding the product close to the camera in a cosy room, as if recording a review.", "The person gives a short, honest product review, pointing to details and nodding."],
  ["ugc-try-on", "Try-on", "A person trying the product on in front of a mirror, phone in hand.", "The person tries the product on, turns to show every angle and reacts to how it looks."],
  ["ugc-unboxing", "Unboxing", "A person at a table with the product's box in front of them, about to open it.", "The person opens the box slowly, lifts the product out and shows it to the camera."],
  ["ugc-tutorial", "Tutorial", "A person at a counter with the product laid out, ready to show how it is used.", "The person walks through using the product step by step, speaking to the camera."],
  ["ugc-before-after", "Before / After", "A split picture: the left side before using the product, the right side after, the same person.", "The video wipes from the before to the after as the person shows the product and the clear difference."],
];

const UGC_PLUS: Row[] = [
  ["giant-figure", "Giant Figure", "A towering giant version of the product standing in a real street with tiny people next to it.", "The camera pans up the giant product as people look up in amazement."],
  ["unboxing-virtual-try-on", "Unboxing Virtual Try-On", "A person with the box open on the table and the item already worn.", "The person unboxes the item, puts it on and shows how it looks."],
  ["unboxing-asmr", "Unboxing ASMR", "A close-up of hands about to open the product's box on a clean table.", "Slow ASMR unboxing: gentle taps, soft paper sounds, the product revealed in crisp close-up."],
  ["virtual-try-on-sneakers", "Virtual Try-On Sneakers", "A person's legs and feet wearing the sneakers from the picture, on a street.", "The person walks, turns and shows the sneakers from every angle."],
  ["crush-test", "Crush Test", "The product on a workbench under a hydraulic press, dramatic light.", "The press comes down on the product; it survives or reacts in a surprising way, shown in slow motion."],
  ["mystery-box", "Mystery Box", "A person holding a sealed mystery box, excited, with the product shown beside it.", "The person opens the mystery box and reveals the product with a big reaction."],
  ["reboxing", "Reboxing", "A person carefully placing the product back into its box on a clean table.", "The person reboxes the product slowly, closes the lid and presents the finished box."],
  ["tv-spot", "TV Spot", "A polished television commercial frame with the product and a person in a bright set.", "A short TV commercial: smooth camera moves, a happy person using the product, a confident closing shot."],
  ["ugc-addiction", "UGC Addiction", "A person obsessively holding several of the product, wide-eyed and delighted.", "The person shows how many they own, hugging the product and laughing."],
  ["ugc-virtual-try-on", "UGC Virtual Try On", "A casual selfie of a person wearing the product in everyday surroundings.", "The person shows how it looks on them, turning and smiling."],
  ["pro-virtual-try-on", "Pro Virtual Try On", "A professional studio shot of a model wearing the product, soft key light.", "The model turns slowly and shows the product from front, side and back."],
  ["wild-card", "Wild Card", "A surprising, imaginative scene starring the product in an unexpected place.", "Something unexpected and delightful happens around the product, ending on a clear product shot."],
];

const TIKTOK: Row[] = [
  ["this-gadget-saved-me", "This Gadget Saved Me", "A person in a mildly stressful everyday moment holding the product.", "The person is in a small mess, uses the product, and visibly relaxes as it solves the problem."],
  ["couple-sharing", "Couple Sharing At Home", "A couple on a sofa at home, one holding the product, sharing a moment.", "The couple pass the product between them and chat about why they love it."],
  ["selfie-testimonial", "Selfie Testimonial", "A person filming a selfie testimonial with the product in hand.", "The person tells their story with the product in a warm, honest selfie style."],
  ["direct-to-camera", "Direct-to-Camera", "A person looking straight into the lens, product held next to their face.", "The person speaks straight to camera, confident and clear, ending on the product."],
  ["secret-hack-reveal", "Secret Hack Reveal", "A person leaning in conspiratorially to the camera with the product partly hidden.", "The person whispers a secret hack, then reveals the product and shows the trick."],
  ["camera-pov", "Camera POV", "A first-person view of hands holding the product at a table.", "A first-person demo: hands show and use the product while a voice explains."],
  ["classic-meets-modern", "Classic Meets Modern", "A split scene: an old-fashioned way on one side, the product's modern way on the other.", "The clip compares the old way with the product's modern way, ending on the product."],
];

const MOTION: Row[] = [
  ["mess-to-fresh", "Mess to Fresh", "A messy scene around the product, clutter and stains, product on the table.", "The mess clears away in a satisfying rewind and the scene becomes spotless with the product at the centre."],
  ["typography", "Typography", "The product on a plain colour background with large bold type around it.", "Big kinetic typography slides and snaps around the product in time with a beat."],
  ["dark-minimalism", "Dark Minimalism", "The product alone on a black surface with a single soft rim light.", "A slow, moody push-in with light gliding across the product's edges."],
  ["color-pop-video", "Color Pop", "The product on a vivid single-colour backdrop with saturated shadows.", "Colours flip and pop in rhythm as the product spins slightly and returns to centre."],
  ["product-showcase", "Product Showcase", "A clean studio shot of the product on a pedestal with soft light.", "A polished showcase: a slow orbit and gentle light sweeps over the product."],
];

const slotsOf = (avatar: boolean, talk: boolean): Slot[] => [
  ...(avatar ? [{ key: "avatar", type: "image", label: "Person", required: false, min: 1, max: 1, elementKind: "character" } as Slot] : []),
  { key: "product", type: "image", label: "Product", required: true, min: 1, max: 4, elementKind: "product" },
  { key: "notes", type: "text", label: "Details", required: false, placeholder: "Anything else about the scene or what happens" },
  ...(talk
    ? [
        { key: "hook", type: "text", label: "Hook", required: false, placeholder: "How the first seconds open", presets: HOOKS } as Slot,
        { key: "setting", type: "text", label: "Setting", required: false, placeholder: "Where it happens", presets: SETTINGS } as Slot,
      ]
    : []),
];

function recipe([id, name, still, clip]: Row, group: string, category: Recipe["category"], opts: { avatar: boolean; talk: boolean; seconds: string[]; defaultSeconds: string }): Recipe {
  const steps: Step[] = [
    {
      id: "frame",
      label: "Frame",
      capability: "image-edit-multi",
      params: {
        prompt: `${still} ${LOOK} {{slots.setting}} {{slots.notes}}`,
        images: opts.avatar ? ["{{slots.avatar}}", "{{slots.product}}"] : ["{{slots.product}}"],
        aspect_ratio: "{{choices.ratio}}",
      },
    },
    {
      id: "motion",
      label: "Video",
      capability: "image-to-video",
      params: {
        prompt: `${clip} {{slots.hook}} {{slots.setting}} {{slots.notes}} The product keeps its exact shape, label and logo throughout.`,
        images: ["{{steps.frame.output.url}}"],
        aspect_ratio: "{{choices.ratio}}",
        duration: "{{choices.seconds}}",
      },
    },
  ];
  return {
    id: `marketing-${id}`,
    name,
    group,
    category,
    description: still,
    output: "video",
    slots: slotsOf(opts.avatar, opts.talk),
    choices: [
      { key: "ratio", label: "Aspect ratio", options: ["9:16", "1:1", "16:9"], default: "9:16" },
      { key: "seconds", label: "Seconds", options: opts.seconds, default: opts.defaultSeconds },
    ],
    steps,
  };
}

const talk = { avatar: true, talk: true, seconds: ["5", "8", "10", "12", "15"], defaultSeconds: "8" };
const motion = { avatar: false, talk: false, seconds: ["5", "8", "10", "15"], defaultSeconds: "5" };

export const STYLE_RECIPES: Recipe[] = [
  ...UGC.map((row) => recipe(row, "UGC", "ugc", talk)),
  ...UGC_PLUS.map((row) => recipe(row, "UGC", "ugc", talk)),
  ...TIKTOK.map((row) => recipe(row, "TikTok", "ugc", talk)),
  ...MOTION.map((row) => recipe(row, "Motion", "mixed-media", motion)),
];
