# KIE Studio

KIE AI API'sindeki **27 modelin tamamı** için Higgsfield tarzı tek bir stüdyo arayüzü.
Tek prompt barı, her modelin kendi ayarları, tüm çıktılar tek galeride.

API anahtarını gir, modeli seç, üret.

---

## Neden

KIE'nin API'si güçlü ama her model farklı bir endpoint'e, farklı bir parametre
setine ve farklı bir durum (task) formatına sahip. Bu proje bu farkları tek bir
**bildirimsel model kayıt defterinde (registry)** topluyor: her model kendi
alanlarını, izin verilen değerlerini ve hangi alanın ne zaman geçerli olduğunu
beyan ediyor; arayüz de tam olarak onu çiziyor. Yani bir model için geçerli
olmayan bir seçenek hiç görünmüyor, geçerli olan hiçbir seçenek de eksik kalmıyor.

## Kapsanan modeller

### Görsel (9)
| Model | Sağlayıcı | Modlar | Öne çıkan ayarlar |
|---|---|---|---|
| Nano Banana 2 / Lite | Google | generate, edit | 15 en-boy oranı, 1K/2K/4K, 14 referans, Google Search grounding |
| Seedream 5 Lite / Pro / V4 | ByteDance | generate, edit | Sürüm başına ayrı ayar seti, kalite basic/high, 6'ya kadar batch |
| GPT Image 2 | OpenAI | generate, edit | 16 referans görsel, 1K/2K/4K |
| FLUX Kontext Pro / Max | Black Forest Labs | generate, edit | Prompt upsampling, safety tolerance (edit'te 0–2) |
| FLUX 2 Pro / Flex | Black Forest Labs | generate, reference | 1–8 referans, 1K/2K |
| Qwen Image | Alibaba | generate, edit | Steps 2–250, CFG 0–20, acceleration, negatif prompt |
| Z-Image | Tongyi-MAI | — | Çift dilli metin render |
| Midjourney | Midjourney | txt2img, img2img, style ref, omni ref, video, video HD | Stylization, weirdness, variety, motion, batch |
| Grok Imagine | xAI | t2i, i2i, t2v, i2v, upscale | fun/normal/spicy, task ID ile zincirleme |

### Video (12)
| Model | Sağlayıcı | Modlar | Öne çıkan ayarlar |
|---|---|---|---|
| Veo 3.1 | Google DeepMind | t2v, i2v | veo3 / veo3_fast, start+end frame, fallback |
| Seedance 2.5 | ByteDance | t2v, i2v, reference | Native audio, 3–15 sn, 480p–1080p, görev zinciri |
| Kling 3.0 | Kuaishou | t2v, i2v, multi-shot | Çok sahneli anlatım, elements ile karakter tutarlılığı, native audio |
| Hailuo 03 (H3) | MiniMax | t2v, i2v, reference | 9 görsel + 3 video + 3 ses referansı, 768p |
| Wan 2.7 | Alibaba | t2v, i2v, reference, video edit | Driving audio ile mimik, prompt extend, NSFW filtresi |
| HappyHorse 1.0 | Alibaba | t2v, i2v, reference, video edit | 9 referansa kadar, 3–15 sn |
| Gemini Omni | Google | video, karakter, ses | Tekrar kullanılabilir karakter/ses, 4K'ya kadar |
| Runway Aleph | Runway | — | Video-to-video dönüşüm, stil referansı |
| Wan Animate | Alibaba | animate, replace | Hareket transferi veya karakter değişimi |
| OmniHuman 1.5 | ByteDance | — | Portre + ses ile animasyon, maske desteği |
| Kling Avatar | Kuaishou | — | Standard 720p / Pro 1080p konuşan avatar |
| InfiniTalk | InfiniTalk | — | Uzun formlu lip sync |

### Ses (3)
| Model | Sağlayıcı | Modlar | Öne çıkan ayarlar |
|---|---|---|---|
| Suno | Suno | simple, custom | V3.5–V5.5, enstrümantal, vokal cinsiyeti, style/weirdness/audio ağırlıkları |
| ElevenLabs Speech | ElevenLabs | — | 21 ses, turbo/multilingual, stability / similarity / style / speed |
| ElevenLabs SFX | ElevenLabs | — | 0.5–22 sn, loop, 19 çıkış formatı |

### Araçlar (3)
Topaz Upscale (1×–8×), Ideogram Reframe, Recraft arka plan kaldırma.

---

## Çalıştırma

```bash
npm install
npm run dev     # http://localhost:3000
```

Sonra arayüzdeki anahtar butonuna tıklayıp KIE API anahtarını gir.
Anahtar [kie.ai/api-key](https://kie.ai/api-key) adresinden alınır.

Üretim için:

```bash
npm run build && npm run start
```

Vercel, Netlify veya herhangi bir Node host'una olduğu gibi deploy edilebilir —
sunucu tarafında saklanan sır yok.

## API anahtarı nerede duruyor

Anahtar **sadece tarayıcının `localStorage`'ında** tutulur ve her istekte
`x-kie-key` başlığıyla bu uygulamanın kendi `/api/kie/*` route'larına gönderilir.
Bu route'lar isteği `api.kie.ai`'ye iletir; anahtar sunucuda diske yazılmaz,
loglanmaz ve kalıcı hale getirilmez. Tarayıcıdan doğrudan KIE'ye gidilmemesinin
sebebi CORS ve anahtarın URL'lerde görünmemesi.

`/api/kie/create` yalnızca registry'nin gerçekten kullandığı endpoint listesine
izin verir; aksi hâlde route, kullanıcının anahtarıyla çalışan genel bir relay'e
dönüşürdü.

## Mimari

```
src/
├─ lib/registry/        # Modellerin tamamı — arayüzün tek doğruluk kaynağı
│  ├─ types.ts          # Field / Mode / ModelDef sözleşmesi
│  ├─ common.ts         # Paylaşılan alan üreticileri ve yardımcılar
│  ├─ image.ts          # 9 görsel modeli + 3 araç
│  ├─ video.ts          # 12 video modeli
│  └─ audio.ts          # 3 ses modeli
├─ lib/kie/client.ts    # KIE REST sarmalayıcısı + sonuç normalizasyonu
├─ app/api/kie/*        # create / task / credits / upload proxy route'ları
├─ components/          # Rail, prompt barı, model seçici, ayar paneli, galeri
└─ store/studio.ts      # Zustand store (anahtar, değerler, çalışmalar)
```

### Model nasıl eklenir

`src/lib/registry/*.ts` içine bir `ModelDef` ekle — UI'da hiçbir şeye dokunma:

```ts
const myModel: ModelDef = {
  id: "my-model",
  name: "My Model",
  vendor: "Vendor",
  category: "video",
  output: "video",
  tagline: "Tek cümlelik tanım.",
  tags: ["text to video"],
  modes: [{ id: "text-to-video", label: "Text to video" }],
  defaultMode: "text-to-video",
  fields: [
    promptField(),
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",          // bar | panel | prompt | input
      default: "720p",
      choices: choices([["720p", "720p"], ["1080p", "1080p"]]),
      when: inMode("text-to-video"),   // koşullu görünürlük
    },
  ],
  build: (v) => ({
    endpoint: "/api/v1/jobs/createTask",
    poll: "jobs",
    payload: { model: "vendor/my-model", input: compact({ prompt: v.prompt, resolution: v.resolution }) },
  }),
};
```

`placement` alanın nerede çıkacağını belirler:

- `prompt` — büyük metin alanı
- `input` — prompt'un üstündeki referans medya şeridi
- `bar` — prompt barındaki chip (her üretimde dokunduğun ayarlar)
- `panel` — sağdaki gelişmiş ayarlar çekmecesi

Yeni bir endpoint kullanıyorsan `src/app/api/kie/create/route.ts` içindeki
`ALLOWED_ENDPOINTS` listesine de eklemen gerekir.

## Tasarım sistemi

Arayüz [krea.ai](https://www.krea.ai/app)'in tasarım dilinden ilham alıyor:
İsviçre grotesk tipografi, üretilen işin üzerinde durduğu neredeyse siyah bir
tuval, nötr bir gri rampa ve ekrandaki tek önemli aksiyona ayrılmış saf beyaz.

**Renkler** — koyu temada tuval `#0b0f15`, bant `#000000`, yüzeyler `#171717`
ve `#262626`; metin rampası `#737373 → #a3a3a3 → #d4d4d5 → #ffffff`. Dört
marka rengi yalnızca vurgu olarak kullanılıyor ve her biri bir kategoriye
bağlı: görsel `#62a2ff`, video `#762fad`, ses `#65f223`, araçlar `#55227d`.
Açık tema aynı iskeleti ters çeviriyor — tuval `#fbfbfc`, kartlar beyaz, CTA
ise saf beyaz yerine neredeyse siyah oluyor. Tema raydaki güneş/ay düğmesiyle
değişiyor ve tarayıcıda saklanıyor.

**Tipografi** — Suisse Intl'in yerine, aynı neo-grotesk iskelete sahip ve
değişken eksenli olan **Geist** kullanılıyor; sayısal değerler, bölüm
başlıkları ve istek önizlemesi **Geist Mono** ile. Gövde 400, buton etiketleri
**450**, başlıklar 500 — Krea'nın ara ağırlık detayı birebir korunuyor.

**Geometri** — sadece dört yarıçap var, arası yok: `8px` (chip, giriş, ray
düğmesi), `14px` (kart), `24px` (panel, modal, prompt barı) ve tam yuvarlak
(sadece CTA'lar). Boşluk 4px tabanlı.

**Hareket** — iki easing: yerine oturan her şey için
`cubic-bezier(0.32, 0.72, 0, 1)`, açılan yüzeyler için hafif taşan
`cubic-bezier(0.34, 1.4, 0.64, 1)`. Üç süre: 120ms mikro etkileşim, 200ms
standart, 320ms panel. Popover'lar ve modallar yaylanarak açılıyor, model
kartları ve galeri kutuları kademeli (staggered) giriyor, model değişince
başlık ve mod şeridi yumuşak geçiş yapıyor, tamamlanmamış çalışmalar dört
marka renginin yavaşça sürüklendiği bir gradyan üzerinde bekliyor.
`prefers-reduced-motion` açıksa tüm hareket kapanıyor.

## Arayüz notları

- **Mod şeridi** — modeli olan her model için t2v / i2v / reference gibi modlar.
  Mod değiştirince o moda ait olmayan değerler temizlenir, böylece eski bir
  first-frame URL'i yanlışlıkla bir text-to-video isteğine binmez.
- **Chip'ler** — bar'daki her ayar bir chip; tıklayınca kendi kontrolü açılır
  (en-boy oranı orantılı kutucuklarla, süre slider'la, boolean'lar tek tıkla).
  Popover ekran kenarına yakınsa kendini içeri çeker.
- **İstek önizlemesi** — ayar panelinin altında, gönderilecek JSON birebir görünür.
- **Galeri** — her çalışma gerçek en-boy oranında bir kutu ayırır; bitince
  medya yerine oturur. Tile üzerinden indir, URL kopyala, ayarları tekrar kullan.
- **Kısayollar** — `⌘K` model seçiciyi açar, `⌘↵` üretimi başlatır, `Esc` açık
  katmanı kapatır.
- **Yoklama (polling)** — bitmemiş işler 3.5 saniyede bir sorgulanır; `jobs`,
  `veo`, `suno`, `mj`, `flux` ve `aleph` durum formatlarının hepsi tek bir
  normalize ediciden geçer.
- Çalışmalar, ayarlar ve tema `localStorage`'da tutulur, sekme kapanınca kaybolmaz.

## Bilinen sınır

Bu depo geliştirilirken `api.kie.ai`'ye ve `docs.kie.ai`'ye ağ erişimi olmadığı
için uçtan uca canlı üretim testi yapılamadı. Model ve parametre bilgisi, KIE'nin
yayınladığı resmi araç tanımlarından (`@felores/kie-ai-core`) birebir çıkarıldı —
bunlar dokümantasyonun kaynağıyla aynı şemaları taşır. İstek oluşturma, hata yüzeyi, yoklama ve galeri
akışının tamamı gerçek HTTP yoluyla (engellenen upstream'e karşı) doğrulandı;
her modelin ürettiği payload, KIE'nin resmi araç tanımlarındaki şemalarla
karşılaştırılarak kontrol edildi. Kendi anahtarınla ilk çalıştırmada bir modeli
teyit etmen iyi olur.
