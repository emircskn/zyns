# Higgsfield web → ZYNS: Kie eşleme tablosu (Adım 1, onaya açık)

Kaynak: Higgsfield web arayüzünün kullanıcı gibi gezilerek çıkarılmış analizi (22 araç, ekran görüntüleri ve raporlar repoda değil; kişisel içerik taşıdıkları için). Tarih: 2026-10-18.

## Çalışma kuralı
- Üstteki sağlayıcı geçişi (toggle) ile **Higgsfield** ya da **Kie** seçilir. Otomatik yedek yok: Kie seçiliyken her araç, en yakın Kie modeliyle çalışır; karşılığı yoksa "Kie'de yok" notuyla gizlenir.
- Fiyat: Higgsfield seçiliyken anahtarın `estimate` değeri, Kie seçiliyken Kie'nin fiyatı (`registry/generated/pricing.json`). Bulunamazsa boş bırakılır.
- Dışarıda: **Games & Characters** (10 uygulama), **Pricing/plan** sayfaları, **Community**, Supercomputer ve Assist (ajan; ekran görüntüsü dışında analiz yok).
- Hook/Setting ve efekt metinleri Higgsfield'dan kopyalanmaz; kendi sözlerimizle yazılır. Önizleme medyası kullanıcı tarafından R2'ye (`presets/` önekiyle) elle eklenir.

## Durum tablosu

Durum: **VAR** = zyns'te çalışıyor · **KISMEN** · **YAPILACAK** · **YOK** = Kie'de karşılığı yok · **KARAR** = senin kararın gerek.

| # | Higgsfield aracı | Kie seçiliyken | Durum |
|---|---|---|---|
| 1 | Cinema Studio Image (Soul Cinema, Soul 2.0, GPT Image 2.5, Nano Banana 2.1, Seedream 5…) | Nano Banana 2.1 / Seedream 5 Pro / GPT Image 2.5; Camera, Lens, Film, Palette seçimleri prompt'a derlenir (`compose.ts`) | VAR |
| 2 | Cinema Studio Video (Cinema Studio 4.0, Seedance, Kling, Veo…) | Seedance 2.5 (varsayılan), Kling 3.0, Veo 3.1; kart seçimleri prompt'a derlenir | VAR |
| 3 | Marketing Studio Image (16 stil, şablonlar, ürün/avatar slotları) | GPT Image 2.5 / Nano Banana 2 + prompt stilleri | VAR |
| 3b | Brand kit | Marka kartı (ad, renk, yazı tipi, ton) prompt'a | YAPILACAK (sonra) |
| 3c | Hazır avatar kütüphanesi (40) | Zyns'in kendi avatarları, Kie ile bir kez üretilir | YAPILACAK (sonra) |
| 4 | Marketing Video: UGC, Product motion, Hypermotion, 2D motion, Mixed media, SaaS | 6 tarif | VAR |
| 4b | Hook (9) ve Setting (14) seçicileri | Prompt parçası kataloğu, kendi metinlerimiz | YAPILACAK |
| 4c | UGC kısa (8), UGC çözünürlüklü (12), TikTok (8), Typography, Dark Minimalism, Color pop, Product Showcase | Stil başına tarif (Seedance 2 / 2.5, Kling 3) | YAPILACAK |
| 4d | Product Link video, Ad Reference | Mevcut Product Link + Hypermotion tarifi; Ad Reference videoyu anlayan model ister | KISMEN / KARAR |
| 5 | Image sayfası (37 model) | 22 Kie görsel modeli var. Eksik: FLUX 3 Image, FLUX.2 Max, Flux Kontext Max, Ideogram 4.5, Recraft V4.1, Kling O1, GPT Image 1.5, Seedream 4.0, Multi Reference. Hepsi için **Kie'de var mı bakılacak** | KISMEN |
| 5b | Soul, Soul 2.0, Soul Cinema, AI Cast | Higgsfield'a özel. En yakın: Nano Banana 2.1 | YOK (yakın model) |
| 5c | Face Swap, Character Swap | Nano Banana Pro edit, iki görsel + sabit yönerge | YAPILACAK |
| 5d | Auto (en uygun modeli seç) | Küçük kural | KARAR |
| 6 | Create Video (Seedance 2.5/2.0, MiniMax H3, Kling 3, Veo 3.1, Wan 3, Grok 1.5, HappyHorse, Gemini Omni) | Hepsi Kie'de, FLUX.3 Video hariç | VAR |
| 6b | Seedance 2.5 Extend ve Draft | Kie'de var mı bakılacak | KISMEN |
| 7 | Edit Video: Edit (Seedance 2.5 Edit) | Kling 3 Omni, Wan 2.7, Runway Aleph (video-edit). "Draw to Edit" yok | VAR / KISMEN |
| 7b | Extend Video | Veo 3.1 Extend, Gemini Omni Extend | KISMEN |
| 7c | Upscale (FLUX.3, Topaz Starlight, ByteDance, Topaz Video) | Topaz | KISMEN |
| 7d | Reframe, Remove Background (video), SDR to HDR, FPS Boost, Depth Map | Kie'de doğrudan karşılık yok | YOK |
| 8 | Motion Control (Kling 3.0 ve 2.6) | Kling 3 / 2.6 Motion Control | VAR |
| 9 | Genjutsu: Motion transfer | Kling 3 Motion Control; 12 stil kendi metinlerimizle | KISMEN |
| 9b | Genjutsu: Objects swap | Kling 3 Omni / Wan 2.7 video-edit | YAPILACAK |
| 10 | Apps, görsel düzenleme: Expand image, Relight | Nano Banana Pro edit | VAR |
| 10b | Angles 2.0, Skin Enhancer, AI Stylist, Outfit Swap, Style Snap, Outfit Vending, Glitter Sticker, Outfit Shot (görsel) | Nano Banana Pro/2 edit + sabit yönerge | YAPILACAK |
| 10c | Shots, Zooms, What's Next? (9'lu ızgara + büyütme) | Nano Banana ızgara + Topaz büyütme | YAPILACAK (orta) |
| 10d | Color grading | Tarayıcıda canvas/CSS ile, Kie gerekmez | YAPILACAK |
| 10e | Görsel Upscale, Inpaint | Higgsfield web'de de yok | — |
| 11 | Apps, yüz/kimlik: Character Swap 2.0, Face Swap, Commercial Faces, Headshot Generator | Nano Banana Pro edit (iki görsel) | YAPILACAK |
| 11b | Recast, Video Face Swap | Kling 3 Omni / Runway Aleph video-edit | KISMEN / KARAR |
| 12 | Apps, reklam: ASMR (3), Poster, Bullet Time (3), Chameleon, Packshot, Macro (2), Magic button, Truck, Giant Product, Kick, Billboard, Graffiti, Fridge, Volcano (19) | Görselden video + sabit prompt şablonu | YAPILACAK |
| 12b | Transitions (başlangıç + bitiş karesi) | Kling 3 / Veo 3.1 start-end frame | YAPILACAK |
| 12c | Behind the Scenes, Breakdown, Japanese Show | Görselden görsel/video + şablon | YAPILACAK |
| 12d | ClipCut, Urban Cuts, Sticker Match Cut, Video Background Remover | Video-to-video gerekir | KARAR |
| 12e | Virality Predictor | Kie'de karşılık yok, Higgsfield'da var | YOK (HF'de kalır) |
| 13 | Trending Templates (25) + Extras (Paint App, Signboard, Micro-Beasts, AI Meme, Background Remover) | Tek mekanizma: 1 görsel + görsel/video anahtarı; **küratörlü liste** | YAPILACAK |
| 14 | Effects (87+ efekt; tek görsel + karakter/mekân/ürün) | Görselden video + efekt başına prompt; **~20-25 efekt** + serbest efekt kutusu | KARAR (sayı) |
| 15 | Katana | Üretimi Claude MCP içinde. İşlevi Genjutsu Motion transfer ile aynı | YOK (ayrı iş yok) |
| 16 | Audio: Text to Speech (7 model, ~117 ses) | ElevenLabs, Gemini TTS var. Eksik: ses seçicide cinsiyet/yaş süzgeci, çıktı biçimi ve örnekleme hızı | KISMEN |
| 16b | Voice Change, Translate (18 dil, dudak senkronlu) | Zincir: ses ayır → çeviri (Kie LLM) → TTS → dudak senkronu (Kling Avatar). Büyük | KARAR |
| 17 | Canvas (düğüm tabanlı iş akışı) | Yeni sayfa; çekirdek: Prompt, Image, Video, Upload düğümleri. En büyük iş | KARAR |
| 18 | AI Influencer: karakter oluşturma (9 tip, ~20 özellik) | Nano Banana 2 + özelliklerden prompt kuran form | YAPILACAK |
| 18b | AI Influencer: Motion | Genjutsu ile aynı (9, 9b) | KISMEN |
| 19 | Soul ID | Higgsfield'a özel. Kie'de: Elements görselleri referans | VAR (Elements) |
| 20 | Ads Studio: statik reklam (web sitesinden marka kiti + ürünler + 3 oran) | Kie LLM + GPT Image 2.5, Product Link ile | YAPILACAK (sonra) |
| 20b | Ads Studio: Ad multiplier (referans video, hook/CTA değişimi) | Kling 3 / Seedance referans | KARAR |
| 21 | Supercomputer, Assist (ajan) | Zyns'te yok, bilerek analiz dışı | — |
| 22 | Assets, Projects, Explore, Trash, Favourites, Elements | Zyns'te var (Trash 30 gün, süzgeçler, Not viewed, brief şablonu dahil) | VAR |

## Önerilen yapım sırası (Adım 2)
1. **Altyapı:** tek "App şablonu" sayfası + katalog dosyası (id, ad, girdi alanları, seçenekler, çıktı, Kie modeli, prompt şablonu, `cover`).
2. **Dalga 1 (görsel düzenleme, ~15 uygulama):** Face Swap, Character Swap, Angles, Skin Enhancer, AI Stylist, Outfit Swap, Style Snap, Headshot, Commercial Faces, Color grading…
3. **Dalga 2 (Marketing video):** Hook ve Setting kataloğu + 28 yeni stil tarifi.
4. **Dalga 3 (görselden video şablonları):** Effects (küratörlü), Transitions, 19 reklam uygulaması, şablonlar.
5. **Dalga 4:** Audio iyileştirmeleri; karar bekleyenler (Voice Change/Translate, Canvas, video-to-video uygulamalar, Ad Reference, Ads Studio).

## Karar noktaları
1. Yapım sırası uygun mu?
2. Effects kaç tane? (öneri 20-25)
3. Voice Change ve Translate zinciri yapılsın mı?
4. Canvas yapılsın mı, yoksa Recipes geliştirilsin mi?
5. Video-to-video uygulamalar (Recast, Video Face Swap, ClipCut, Urban Cuts) ve Ad Reference/Ad multiplier yapılsın mı?
6. Kie'de var mı bakılacak modeller (satır 5, 6b, 7c) Adım 2'den önce doğrulanır.

## Adım 2 ilerleme (onaylandı: sıra uygun, tüm Effects, 3-6 evet)

**Kie doğrulaması (Kie'nin kendi fiyat listesi + katalog):**
- Kie'de YOK: FLUX 3 Image/Video, FLUX.2 Max, Ideogram 4.5, Recraft V4.1, Seedance 2.5 Extend (ayrı model yok). Bunlar Higgsfield'da kalır.
- Seedance 2.5 **Draft** ayrı model değil, `draft` parametresi.
- Kie'de var, henüz bağlanmamış: Flux Kontext Pro/Max, GPT Image 1.5, Seedream 4, Grok Imagine Extend/Upscale, Veo/Runway Extend, Topaz Image/Video Upscaler (Topaz ve Recraft bağlı), Ideogram V3 Edit/Remix/Reframe.

**Yapıldı (`src/lib/registry/apps/`):** tek fabrika + katalog; her uygulama bir Tool (form, fiyat tahmini, geçmiş hazır).
- 20 görsel uygulama (Face/Character Swap, Commercial Face, Headshot, Skin Enhancer, Angles, AI Stylist, Outfit Swap/Shot/Vending, Style Snap, Glitter Sticker, Shots, Zooms, What's Next, Breakdown, Japanese Show, Paint App, Signboard, Micro-Beasts) → Nano Banana Pro edit.
- 87 Effects (Higgsfield listesinin tamamı) + 25 şablon + 19 reklam uygulaması + Behind the Scenes + Transitions (+ASMR Add-On) → Seedance 2.0 (Best) veya 2.0 Fast; 153 uygulama.
- Seçici: Tools altında uygulama grubuna göre alt başlıklar.

### Son durum (Adım 2 tamamlandı)
- **Video'dan videoya (8):** Recast, Video Face Swap, Objects Swap, Motion Transfer, Video Styles (12 görünüm), Sticker Match Cut, Ad Multiplier, Ad Reference → Wan 2.2 Animate / Wan 2.7 VideoEdit / Kling 3 Motion Control / Kling 3 Omni Reference. Video süresi bilinmediği için fiyat tahmini boş.
- **Marketing Studio:** Hook (9) ve Setting (14) seçicileri (kendi metinlerimiz) + 32 yeni video stili (UGC 20, TikTok 7, Motion 5).
- **Yeni Kie modelleri:** GPT Image 1.5, Seedream 4.0, Imagen 4 (Standard/Fast/Ultra), Video Lip Sync, Seedance 2.5 "Finalize draft" (sonuç üzerinde eylem).
- **AI Influencer** (9 tip, 9 özellik), **Static Ad** (3 oran, 5 görünüm), **ClipCut**, **Urban Cuts**.
- **Dub & translate:** metni yaz → ses → dudak senkronu (Kie'de konuşma tanıma yok, metni kullanıcı yazar).
- **Canvas** (`/canvas`): Text, Image/Video/Audio upload, Image ve Video düğümleri; bağla, çalıştır. Tarif motorunun üstünde.
- **Color grading** (`/grade`): tarayıcıda, kredi harcamaz.
- Bilerek yapılmadı: Auto model kuralı, Brand kit, 40'lık avatar kütüphanesi (SaaS aşamasına), TTS ses süzgeci (Kie'nin sabit ses listesi var), Video Background Remover / Reframe / SDR→HDR / FPS Boost / Depth Map (Kie'de yok), Virality Predictor.

### Yerleşim düzeltmesi (Higgsfield'ın menü yapısına göre)
- **Effects** artık kendi menü sayfası (`/effects`): solda efekt kartı + Change (87'lik ızgara + arama), sağda History.
- **Apps** kendi menü sayfası (`/apps`): arama, kategori çipleri (Professional, Enhance & Style, Face & Identity, Video Editing, Ads & Products, Trending Templates, Extras), kapak kartları, her kart kendi sayfasında.
- Apps/Effects artık **Tools'ta ve model seçicide yok**; sonuçları Tools sayfasında değil kendi History'sinde.
- Her sayfada **hangi modelin çalıştığı** yazar ("Runs on Seedance 2.0 · KIE") ve fiyat görsel eklenmeden de görünür.
- **Draw to Edit** (Apps > Professional): resmin üstüne fırçayla boya → maske (beyaz = değişecek yer) + resim Nano Banana Pro'ya gider. Relight ve Outpaint (Expand image) de Apps'e taşındı.
- Kapak resimleri: `public/app-covers/<uygulama-id>.webp` (yoksa sade kutu). Id'ler: `app-<ad>`, efektler `app-fx-<ad>`.

### AI Influencer, Katana, Ads Studio sayfaları
- **AI Influencer** (`/ai-influencer`): solda Create Influencer | Motion sekmeleri; karakter tipi kartları (9), "Hair · 9" gibi açılır bölümler, Batch size, Generate; Motion'da Motion transfer | Objects swap; sağda Explore | History.
- **Katana** (`/katana`): referans video + karakterler + Instructions → Kling 3 Omni referansı ile aynı kurgu. Claude/MCP gerekmez.
- **Ads Studio** (`/ads-studio`): iki kart: Create Static Ads, Ad Multiplier.
- Tüm uygulama panelleri: 4'ten uzun seçim listeleri açılır satır, Batch size 1-4, fiyat × adet.
