# Capability taslağı (Faz 0)

Tarih: 2026-09-30. **Onaylandı (2026-09-30).** Boş satırlar boş kalacak; Faz 1'de registry'ye bu haliyle işlenecek.

## Nasıl okunur

- Kaynak: registry'deki 124 model ve modları (`src/lib/registry`). Her capability'nin yanında onu sağlayan mod yazıyor. Capability'ler mod bazında önerildi (bkz. `architecture-notes.md` açık soru 5).
- "(otomatik)" modlar composer'da ayrı sekme değil; medya eklenince otomatik seçilir. Örnek: ilk kare eklenince Text to video → Image to video, görsel eklenince Generate → Edit.
- **emin misin = hayır** olan satırlarda capability sütunu bilerek boş. Tahmin yazılmadı; nedeni not sütununda.
- **—** = model incelendi, listedeki capability'lerin hiçbiri ona uymuyor (müzik, araçlar, tek görsel edit…).
- `image-edit-multi` yalnızca 2+ görsel alan modlara verildi; ≤N en fazla görsel sayısı.
- `text-to-video` spec'teki listede yoktu; Emir'in isteğiyle (2026-09-30) eklendi. Sadece adı "Text to video" / "Multi-shot" olan modlara verildi; girdileri opsiyonel olan başka modlar not sütununda belirsiz olarak işaretli.

## Özet

| capability | model sayısı |
|---|---|
| `text-to-image` | 45 |
| `image-edit-multi` | 25 |
| `text-to-video` | 41 |
| `image-to-video` | 51 |
| `reference-to-video` | 25 |
| `video-edit` | 7 |
| `motion-transfer` | 5 |
| `object-swap` | 1 |
| `lipsync-from-audio` | 3 |
| `text-to-speech` | 5 |

Emin: 118 model · Belirsiz (boş bırakıldı): 6 model.

## KIE · Görsel

| model | sağlayıcı | mevcut modlar | önerilen capability'ler | emin misin | not |
|---|---|---|---|---|---|
| **Nano Banana 2**<br>`nano-banana-2` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤14) | evet |  |
| **Nano Banana 2 Lite**<br>`nano-banana-2-lite` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤10) | evet |  |
| **Nano Banana Pro**<br>`nano-banana-pro` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤8) | evet |  |
| **Nano Banana**<br>`nano-banana` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤10) | evet |  |
| **Imagen 4**<br>`imagen-4` | KIE | Generate | `text-to-image` (Generate) | evet |  |
| **Imagen 4 Fast**<br>`imagen-4-fast` | KIE | Generate | `text-to-image` (Generate) | evet |  |
| **Imagen 4 Ultra**<br>`imagen-4-ultra` | KIE | Generate | `text-to-image` (Generate) | evet |  |
| **Seedream 5 Pro**<br>`seedream-5-pro` | KIE | Generate, Edit (otomatik), Layer decomposition | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤10) | evet | Layer decomposition capability değil |
| **Seedream 5 Flash**<br>`seedream-5-flash` | KIE | Generate, Edit (otomatik), Layer decomposition | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤10) | evet | Layer decomposition capability değil |
| **Seedream 5 Lite**<br>`seedream-5-lite` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤14) | evet |  |
| **Seedream 4.5**<br>`seedream-4-5` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤14) | evet |  |
| **Seedream 4.0**<br>`seedream-4` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤10) | evet |  |
| **Seedream 3.0**<br>`seedream-3` | KIE | Generate | `text-to-image` (Generate) | evet |  |
| **GPT Image 2**<br>`gpt-image-2` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤16) | evet |  |
| **GPT Image 2.5 Flare**<br>`gpt-image-2-5-flare` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤16) | evet |  |
| **GPT Image 2.5 Sunburst**<br>`gpt-image-2-5-sunburst` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤16) | evet |  |
| **GPT Image 1.5**<br>`gpt-image-1-5` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤16) | evet |  |
| **4o Image**<br>`4o-image` | KIE | Generate | `text-to-image` (Generate) | evet | Görsel girişi `files_url`, üst sınırı katalogda yok → image-edit-multi eklenmedi (açık soru) |
| **FLUX 2 Pro**<br>`flux-2-pro` | KIE | Generate, Reference (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Reference, ≤8) | evet |  |
| **FLUX 2 Flex**<br>`flux-2-flex` | KIE | Generate, Reference (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Reference, ≤8) | evet |  |
| **FLUX Kontext**<br>`flux-kontext` | KIE | Generate, Edit (otomatik) | `text-to-image` (Generate) | evet | Edit tek görsel; multi değil |
| **Grok Imagine Image 2.0**<br>`grok-imagine-image-2` | KIE | Generate, Edit (otomatik), Segment map (aksiyon), Segment map (image), Segment edit (aksiyon) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤5) | evet | Segment map/edit capability değil |
| **Grok Imagine**<br>`grok-imagine-image` | KIE | Generate, Image to image (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Image to image, ≤5) | evet |  |
| **Ideogram V3**<br>`ideogram-v3` | KIE | Generate, Edit, Remix (otomatik) | `text-to-image` (Generate) | evet | Edit tek görsel + maske; multi değil |
| **Ideogram Character**<br>`ideogram-character` | KIE | Generate, Edit, Remix (otomatik) |  | hayır | Karakter referansı zorunlu; saf text-to-image sayılır mı belirsiz |
| **Qwen Image**<br>`qwen-image` | KIE | Generate, Image to image, Edit (otomatik) | `text-to-image` (Generate) | evet | Image to image tek görsel |
| **Qwen2 Image**<br>`qwen2-image` | KIE | Edit | — | evet | Sadece tek görsel edit; listedeki hiçbir capability değil |
| **Qwen3 Image**<br>`qwen3-image` | KIE | Generate, Image to image (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Image to image, ≤3) | evet |  |
| **Qwen3 Image Pro**<br>`qwen3-image-pro` | KIE | Generate, Image to image (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Image to image, ≤3) | evet |  |
| **Qwen 2.1 Image**<br>`qwen2-1-image` | KIE | Generate, Image to image (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Image to image, ≤10) | evet |  |
| **Wan 2.7 Image**<br>`wan-2-7-image` | KIE | Generate | `text-to-image` (Generate) | evet | `input_urls` ≤9 Generate modunda; edit mi referans mı belirsiz → image-edit-multi eklenmedi |
| **Wan 2.7 Image Pro**<br>`wan-2-7-image-pro` | KIE | Generate | `text-to-image` (Generate) | evet | `input_urls` ≤9 Generate modunda; edit mi referans mı belirsiz → image-edit-multi eklenmedi |
| **Z-Image**<br>`z-image` | KIE | Generate | `text-to-image` (Generate) | evet |  |

## KIE · Video

| model | sağlayıcı | mevcut modlar | önerilen capability'ler | emin misin | not |
|---|---|---|---|---|---|
| **Veo 3.1**<br>`veo-3-1` | KIE | Text to video, Frames to video (otomatik), Reference, Extend (aksiyon), Fetch 1080p (aksiyon), Fetch 4K (aksiyon) | `text-to-video` (Text to video)<br>`image-to-video` (Frames to video)<br>`reference-to-video` (Reference) | evet | Extend / 1080p / 4K aksiyon |
| **Seedance 2.5**<br>`seedance-2-5` | KIE | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Seedance 2.0**<br>`seedance-2` | KIE | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Seedance 2.0 Fast**<br>`seedance-2-fast` | KIE | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Seedance 2.0 Mini**<br>`seedance-2-mini` | KIE | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Seedance 1.5 Pro**<br>`seedance-1-5-pro` | KIE | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Seedance 1.0 Pro**<br>`seedance-1-pro` | KIE | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Seedance 1.0 Pro Fast**<br>`seedance-1-pro-fast` | KIE | Image to video | `image-to-video` (Image to video) | evet |  |
| **Seedance 1.0 Lite**<br>`seedance-1-lite` | KIE | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Kling 3.0**<br>`kling-3` | KIE | Text to video, Image to video (otomatik), Multi-shot | `text-to-video` (Text to video / Multi-shot)<br>`image-to-video` (Image to video) | evet |  |
| **Kling 3.0 Omni**<br>`kling-3-omni` | KIE | Text to video, First frame (otomatik), First + last frame, Reference · Images, Reference · Video, Reference · Video + images, Transform · Video, Transform · Video + images | `text-to-video` (Text to video)<br>`image-to-video` (First frame / First + last frame)<br>`reference-to-video` (Reference · Images)<br>`video-edit` (Transform · Video (+ images)) | evet | Reference · Video (+ images) için video-edit mi reference mı belirsiz, eklenmedi |
| **Kling V3 Turbo**<br>`kling-v3-turbo` | KIE | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Kling 2.6**<br>`kling-2-6` | KIE | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Kling 2.5 Turbo**<br>`kling-2-5-turbo` | KIE | Text to video | `text-to-video` (Text to video) | evet | Registry'de sadece text-to-video var |
| **Kling 2.1 Standard**<br>`kling-2-1-standard` | KIE | Image to video | `image-to-video` (Image to video) | evet |  |
| **Kling 2.1 Pro**<br>`kling-2-1-pro` | KIE | Image to video | `image-to-video` (Image to video) | evet |  |
| **Kling 2.1 Master**<br>`kling-2-1-master` | KIE | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Kling 3.0 Motion Control**<br>`kling-3-motion-control` | KIE | Generate | `motion-transfer` (Generate / Motion control) | evet |  |
| **Kling 2.6 Motion Control**<br>`kling-2-6-motion-control` | KIE | Generate | `motion-transfer` (Generate / Motion control) | evet |  |
| **Kling Avatar**<br>`kling-avatar` | KIE | Generate | `lipsync-from-audio` (Generate) | evet |  |
| **Kling Avatar Pro**<br>`kling-avatar-pro` | KIE | Generate | `lipsync-from-audio` (Generate) | evet |  |
| **Hailuo 03 (H3)**<br>`minimax-h3` | KIE | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Hailuo 2.3**<br>`hailuo-2-3` | KIE | Image to video | `image-to-video` (Image to video) | evet |  |
| **Hailuo 2.3 Pro**<br>`hailuo-2-3-pro` | KIE | Image to video | `image-to-video` (Image to video) | evet |  |
| **Hailuo 02**<br>`hailuo-02` | KIE | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Hailuo 02 Pro**<br>`hailuo-02-pro` | KIE | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Wan 3.0**<br>`wan-3` | KIE | Reference, Frames, Document, Web page | `image-to-video` (Frames)<br>`reference-to-video` (Reference) | evet | Document / Web page capability değil; text-to-video belirsiz: Reference (tüm girdiler opsiyonel) ile sadece yazı gönderilebilir mi doğrulanmadı |
| **Wan 3.0 Prime**<br>`wan-3-prime` | KIE | Reference, Frames, Document, Web page | `image-to-video` (Frames)<br>`reference-to-video` (Reference) | evet | Document / Web page capability değil; text-to-video belirsiz: Reference (tüm girdiler opsiyonel) ile sadece yazı gönderilebilir mi doğrulanmadı |
| **Wan 2.7**<br>`wan-2-7` | KIE | Text to video, Image to video (otomatik), Reference, Video edit | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference)<br>`video-edit` (Video edit) | evet |  |
| **Wan 2.6**<br>`wan-2-6` | KIE | Text to video, Image to video (otomatik), Video to video | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet | Video to video (≤3 video) video-edit mi belirsiz, eklenmedi |
| **Wan 2.6 Flash**<br>`wan-2-6-flash` | KIE | Image to video, Video to video | `image-to-video` (Image to video) | evet | Video to video (≤3 video) video-edit mi belirsiz, eklenmedi |
| **Wan 2.5**<br>`wan-2-5` | KIE | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Wan 2.2 Turbo**<br>`wan-2-2` | KIE | Text to video, Image to video (otomatik), Speech to video | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`lipsync-from-audio` (Speech to video) | evet |  |
| **Wan Animate**<br>`wan-animate` | KIE | Animate, Replace |  | hayır | Animate ≈ motion-transfer, Replace ≈ object-swap olabilir; doğrulanmadı |
| **HappyHorse 1.1**<br>`happyhorse-1-1` | KIE | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **HappyHorse 1.0**<br>`happyhorse-1` | KIE | Text to video, Image to video (otomatik), Reference, Video edit | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference)<br>`video-edit` (Video edit) | evet |  |
| **PixVerse V6**<br>`pixverse-v6` | KIE | Text to video, Image to video (otomatik), Transition, Fusion, Extend (aksiyon), Extend (video) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video / Transition) | evet | Fusion ve Extend (video) belirsiz, eklenmedi |
| **Grok Imagine Video**<br>`grok-imagine-video` | KIE | Text to video, Image to video (otomatik), Upscale (aksiyon), Extend (aksiyon) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet | Upscale / Extend aksiyon |
| **Grok Imagine Video 1.5**<br>`grok-imagine-video-1-5` | KIE | Generate |  | hayır | Tek Generate modu, ≤7 görsel; ilk kare mi referans mı belirsiz |
| **Gemini Omni**<br>`gemini-omni` | KIE | Video, Create character, Create voice | `reference-to-video` (Video) | evet | Create character / voice capability değil; text-to-video belirsiz: Video (girdiler opsiyonel) ile sadece yazı gönderilebilir mi doğrulanmadı |
| **Gemini Omni 1.1 Flash**<br>`gemini-omni-flash-1-1` | KIE | Reference, Frames | `image-to-video` (Frames)<br>`reference-to-video` (Reference) | evet | text-to-video belirsiz: Reference (girdiler opsiyonel) ile sadece yazı gönderilebilir mi doğrulanmadı |
| **Runway**<br>`runway` | KIE | Generate, Extend (aksiyon) |  | hayır | Generate modunda opsiyonel tek görsel; image-to-video olarak davranışı doğrulanmadı |
| **Runway Gen-4 Aleph**<br>`runway-gen4-aleph` | KIE | Generate | `video-edit` (Generate) | evet |  |

## KIE · Ses

| model | sağlayıcı | mevcut modlar | önerilen capability'ler | emin misin | not |
|---|---|---|---|---|---|
| **Suno**<br>`suno-music` | KIE | Generate, Extend (aksiyon), Cover audio, Extend audio, Add vocals, Add instrumental, Mashup, Replace section (aksiyon), Replace section (upload), Sounds | — | evet | Müzik / araç; listedeki hiçbir capability değil |
| **Suno Studio**<br>`suno-studio` | KIE | Lyrics, Timestamped lyrics (aksiyon), Boost style, Stems (aksiyon), Stems (upload), MIDI (aksiyon), Convert to WAV (aksiyon), Cover art (aksiyon), Music video (aksiyon), Persona (aksiyon), Recover audio (aksiyon) | — | evet | Müzik / araç; listedeki hiçbir capability değil |
| **Suno Voice**<br>`suno-voice` | KIE | Verification phrase, Regenerate phrase (aksiyon), Create voice, Check availability (aksiyon) | — | evet | Müzik / araç; listedeki hiçbir capability değil |
| **ElevenLabs Turbo 2.5**<br>`elevenlabs-speech` | KIE | Speak | `text-to-speech` (Speak) | evet |  |
| **ElevenLabs Multilingual v2**<br>`elevenlabs-multilingual-v2` | KIE | Speak | `text-to-speech` (Speak) | evet |  |
| **ElevenLabs Dialogue**<br>`elevenlabs-dialogue` | KIE | Dialogue |  | hayır | Çok konuşmacılı diyalog; text-to-speech adımına uyar mı belirsiz |
| **Gemini 3.8 Flash TTS**<br>`gemini-tts-3-8` | KIE | Flash, Flash Lite | `text-to-speech` (Flash / Flash Lite) | evet |  |
| **Gemini 3.1 Flash TTS**<br>`gemini-tts` | KIE | Speak | `text-to-speech` (Speak) | evet |  |
| **Gemini 2.5 Pro TTS**<br>`gemini-tts-pro` | KIE | Speak | `text-to-speech` (Speak) | evet |  |

## KIE · Araçlar

| model | sağlayıcı | mevcut modlar | önerilen capability'ler | emin misin | not |
|---|---|---|---|---|---|
| **Topaz Upscale**<br>`topaz` | KIE | Image, Video | — | evet | Müzik / araç; listedeki hiçbir capability değil |
| **Recraft Tools**<br>`recraft` | KIE | Remove background, Crisp upscale | — | evet | Müzik / araç; listedeki hiçbir capability değil |
| **Audio Isolation**<br>`elevenlabs-isolation` | KIE | Isolate | — | evet | Müzik / araç; listedeki hiçbir capability değil |

## Higgsfield · Görsel

| model | sağlayıcı | mevcut modlar | önerilen capability'ler | emin misin | not |
|---|---|---|---|---|---|
| **Soul 2.0**<br>`hf-soul-2` | Higgsfield | Generate | `text-to-image` (Generate) | evet |  |
| **Soul Cinema**<br>`hf-soul-cinema` | Higgsfield | Generate | `text-to-image` (Generate) | evet |  |
| **Soul**<br>`hf-soul` | Higgsfield | Generate | `text-to-image` (Generate) | evet |  |
| **Marketing Studio 2.5 Flare**<br>`hf-marketing-studio-flare` | Higgsfield | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤16) | evet |  |
| **Marketing Studio 2.5 Sunburst**<br>`hf-marketing-studio-sunburst` | Higgsfield | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤16) | evet |  |
| **Marketing Studio 2.0**<br>`hf-marketing-studio-2` | Higgsfield | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤16) | evet |  |
| **Grok Image 2.0**<br>`hf-grok-image-2` | Higgsfield | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤10) | evet |  |
| **Ideogram 4.0**<br>`hf-ideogram-4` | Higgsfield | Generate, Remix (otomatik) | `text-to-image` (Generate) | evet | Remix tek görsel; multi değil |
| **Qwen Image 3**<br>`hf-qwen-image-3` | Higgsfield | Generate, Edit (otomatik) | `text-to-image` (Generate)<br>`image-edit-multi` (Edit, ≤3) | evet |  |
| **Recraft V4.1 Pro**<br>`hf-recraft-v4-1-pro` | Higgsfield | Generate | `text-to-image` (Generate) | evet |  |
| **Recraft V4.1**<br>`hf-recraft-v4-1` | Higgsfield | Generate | `text-to-image` (Generate) | evet |  |
| **Recraft V4.1 Utility Pro**<br>`hf-recraft-v4-1-utility-pro` | Higgsfield | Generate | `text-to-image` (Generate) | evet |  |
| **Recraft V4.1 Utility**<br>`hf-recraft-v4-1-utility` | Higgsfield | Generate | `text-to-image` (Generate) | evet |  |
| **Z-Image Turbo**<br>`hf-z-image-turbo` | Higgsfield | Generate | `text-to-image` (Generate) | evet |  |

## Higgsfield · Video

| model | sağlayıcı | mevcut modlar | önerilen capability'ler | emin misin | not |
|---|---|---|---|---|---|
| **Cinema Studio 4.0**<br>`hf-cinema-studio-4` | Higgsfield | Generate |  | hayır | Tek mod; image_urls ≤30 karakter/mekan referansı. image-to-video / reference-to-video sayılır mı belirsiz (Faz 3 native endpoint) |
| **Seedance 2.5**<br>`hf-seedance-2-5` | Higgsfield | Text to video, Image to video (otomatik), Reference, Edit video, Extend video | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference)<br>`video-edit` (Edit video) | evet | Extend video belirsiz, eklenmedi |
| **Seedance 2.0**<br>`hf-seedance-2` | Higgsfield | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Kling 3.0**<br>`hf-kling-3` | Higgsfield | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Kling O3**<br>`hf-kling-o3` | Higgsfield | Reference, Frames, Video reference, Edit video | `image-to-video` (Frames)<br>`reference-to-video` (Reference)<br>`video-edit` (Edit video) | evet | Video reference belirsiz, eklenmedi; text-to-video belirsiz: Reference (girdiler opsiyonel) ile sadece yazı gönderilebilir mi doğrulanmadı |
| **Kling Omni**<br>`hf-kling-omni` | Higgsfield | Reference, Frames, Video reference, Edit video | `image-to-video` (Frames)<br>`reference-to-video` (Reference)<br>`video-edit` (Edit video) | evet | Video reference belirsiz, eklenmedi; text-to-video belirsiz: Reference (girdiler opsiyonel) ile sadece yazı gönderilebilir mi doğrulanmadı |
| **Kling 2.6**<br>`hf-kling-2-6` | Higgsfield | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Kling 2.5 Turbo**<br>`hf-kling-2-5-turbo` | Higgsfield | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Wan 3.0 Prime**<br>`hf-wan-3-prime` | Higgsfield | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Wan 3.0**<br>`hf-wan-3` | Higgsfield | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Wan 2.7**<br>`hf-wan-2-7` | Higgsfield | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Wan 2.6**<br>`hf-wan-2-6` | Higgsfield | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet | Reference modu sadece video referansı (≤3); reference-to-video sayılır mı belirsiz |
| **HappyHorse 1.1**<br>`hf-happy-horse-1-1` | Higgsfield | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **HappyHorse 1.0**<br>`hf-happy-horse-1` | Higgsfield | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **MiniMax H3**<br>`hf-minimax-h3` | Higgsfield | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |
| **Hailuo 2.3**<br>`hf-hailuo-2-3` | Higgsfield | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **LTX-2.5**<br>`hf-ltx-2-5` | Higgsfield | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **PixVerse V6**<br>`hf-pixverse-v6` | Higgsfield | Text to video, Image to video (otomatik) | `text-to-video` (Text to video)<br>`image-to-video` (Image to video) | evet |  |
| **Grok Imagine Video 1.5**<br>`hf-grok-video-1-5` | Higgsfield | Text to video, Image to video (otomatik), Reference | `text-to-video` (Text to video)<br>`image-to-video` (Image to video)<br>`reference-to-video` (Reference) | evet |  |

## Higgsfield · Araçlar

| model | sağlayıcı | mevcut modlar | önerilen capability'ler | emin misin | not |
|---|---|---|---|---|---|
| **Genjutsu**<br>`hf-genjutsu` | Higgsfield | Motion transfer, Object swap | `motion-transfer` (Motion transfer)<br>`object-swap` (Object swap) | evet |  |
| **Kling 3.0 Motion Control**<br>`hf-kling-3-motion-control` | Higgsfield | Motion control | `motion-transfer` (Generate / Motion control) | evet |  |
| **Kling 2.6 Motion Control**<br>`hf-kling-2-6-motion-control` | Higgsfield | Motion control | `motion-transfer` (Generate / Motion control) | evet |  |

## Belirsiz kalanlar (Emir'in kararı gerekiyor)

| model | soru |
|---|---|
| `ideogram-character` | Karakter referansı zorunlu; saf text-to-image sayılır mı belirsiz |
| `wan-animate` | Animate ≈ motion-transfer, Replace ≈ object-swap olabilir; doğrulanmadı |
| `grok-imagine-video-1-5` | Tek Generate modu, ≤7 görsel; ilk kare mi referans mı belirsiz |
| `runway` | Generate modunda opsiyonel tek görsel; image-to-video olarak davranışı doğrulanmadı |
| `elevenlabs-dialogue` | Çok konuşmacılı diyalog; text-to-speech adımına uyar mı belirsiz |
| `hf-cinema-studio-4` | Tek mod; image_urls ≤30 karakter/mekan referansı. image-to-video / reference-to-video sayılır mı belirsiz (Faz 3 native endpoint) |

Ek olarak, emin olunan modellerde de bazı modlar dışarıda bırakıldı (not sütununda "eklenmedi" yazanlar): 4o-image ve Wan 2.7 Image çoklu görseli, Kling 3 Omni / Kling O3 / Kling Omni video referansı, Wan 2.6 Video to video, PixVerse Fusion ve Extend, Seedance 2.5 (HF) Extend video, Wan 2.6 (HF) video referansı.
