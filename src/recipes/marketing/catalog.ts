import type { TextPreset } from "@/lib/recipes/types";

/** Openers for the first seconds of an ad, in our own words. A tap in the Hook chip writes one into the prompt, to edit. */
export const HOOKS: TextPreset[] = [
  { name: "Product Hit", group: "Stunt", text: "Opening beat: an object flies into frame and bonks the person. A short surprised reaction, then they pivot straight into showing the product." },
  { name: "Random Object Mic", group: "Stunt", text: "Opening beat: while filming a casual vlog, an absurd random object drops into the person's hand from above and they use it as a microphone, completely serious, to start reviewing the product." },
  { name: "Blizzard", group: "Stunt", text: "Opening beat: a cosy room is suddenly hit by an impossible blizzard and chaos fills the frame, but the product stays intact and working; when the storm stops it is still perfect." },
  { name: "Product Dodge", group: "Stunt", text: "Opening beat: the product flies at the person's face, they duck, and in the next frame they stand up already holding it and review it as if nothing happened." },
  { name: "Epic Fail", group: "Stunt", text: "Opening beat: the person tries a backflip and lands badly, then without a pause pulls out the product and starts a calm, unbothered review." },
  { name: "Spicy", group: "Subtle", text: "Opening beat: an extreme close-up on the collarbone slowly tilts up to a flawless look, pulls back into selfie framing, holds a silent pause, then moves into the product pitch." },
  { name: "Interview", group: "Subtle", text: "Opening beat: a street interviewer asks a stranger a question built on the previous stranger's random answer; confusion builds until the person notices the product and turns into a casual review." },
  { name: "Product Crash", group: "Subtle", text: "Opening beat: the product falls from above and smashes in a burst of chaos, then the scene snaps clean and a person calmly starts reviewing the intact product." },
  { name: "Camera Bump", group: "Subtle", text: "Opening beat: the camera operator bumps into the person, who reacts briefly, recovers and naturally reveals the product while sliding into a casual explanation." },
];

/** Places for the ad to happen, in our own words. A tap in the Setting chip writes one into the prompt, to edit. */
export const SETTINGS: TextPreset[] = [
  { name: "Bedroom", group: "Realistic", text: "Sitting on an unmade bed propped on pillows, soft window light, cosy textures, a relaxed honest low-effort feel." },
  { name: "Bathroom", group: "Realistic", text: "Selfie in front of a bathroom mirror, vanity or ring-light glow, tiles visible, an intimate getting-ready mood with the product shown mid-routine." },
  { name: "Kitchen", group: "Realistic", text: "Leaning on a kitchen island in natural daylight, a clean counter with a mug and fruit behind, an easy mid-day feel." },
  { name: "Office", group: "Realistic", text: "At a tidy desk with a laptop open and coffee nearby, soft monitor glow, a quick product mention squeezed between tasks." },
  { name: "Gym", group: "Realistic", text: "On a gym floor or locker-room bench under bright overhead light, equipment behind, fresh post-workout energy." },
  { name: "Nature", group: "Realistic", text: "Outdoors on a trail, beach or garden that suits the product, natural light, greenery or open sky, a peaceful or active mood." },
  { name: "Street", group: "Realistic", text: "Walking down a busy city sidewalk with a handheld selfie camera, storefronts, traffic and passers-by, energetic and spontaneous." },
  { name: "In Car", group: "Realistic", text: "Selfie from the driver or passenger seat of a parked or moving car, window light on the face, chatty between errands." },
  { name: "Airplane Wing", group: "Unrealistic", text: "Sitting on an airplane wing in mid-flight at altitude, strong wind, clouds and engine roar, reviewing the product as if it were normal." },
  { name: "Skyscraper Roof", group: "Unrealistic", text: "On the edge of a skyscraper roof with the city stretched out far below, wind in the hair, golden hour, completely unbothered by the height." },
  { name: "Volcano Rim", group: "Unrealistic", text: "Sitting on an active volcano rim with lava glowing below and smoke drifting past, reviewing the product with zero reaction." },
  { name: "Tiny Reviewer", group: "Unrealistic", text: "The person is shrunk to 15 cm tall beside a product as big as they are, filming a normal selfie review at an impossible scale." },
  { name: "Car Roof", group: "Unrealistic", text: "On the roof of a moving car on a desert highway at golden hour, swaying with the road while a semi truck passes without a flinch." },
  { name: "Train Surf", group: "Unrealistic", text: "Hanging off the outside of a moving train while filming a selfie, the wind pushing on them being the live demo of the product." },
];
