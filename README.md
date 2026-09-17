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

Katalog doğrudan **docs.kie.ai**'den üretiliyor: `scripts/kie-catalog/build.py`
dokümanın sayfa indeksini (`llms.txt`) çekiyor, her model sayfasına gömülü
OpenAPI şemasını ayrıştırıyor ve `src/lib/registry/generated/catalog.json`
dosyasını yazıyor. Şu anki katalog **176 üretken endpoint** içeriyor; arayüz
bunları **69 ürün ailesi** olarak sunuyor (chat/LLM modelleri kapsam dışı).

```bash
pip install pyyaml
python3 scripts/kie-catalog/build.py     # kataloğu dokümandan yeniden üret
```

### Görsel (28 aile)
Nano Banana 2 · 2 Lite · Pro · Nano Banana · Imagen 4 (Fast/Standard/Ultra) ·
Seedream 5 Pro (generate/edit/layer decomposition) · 5 Lite · 4.5 · 4.0 · 3.0 ·
GPT Image 2 · 2.5 Flare · 2.5 Sunburst · 1.5 · 4o Image · FLUX 2 Pro · FLUX 2 Flex ·
FLUX Kontext · Grok Imagine Image 2.0 (segment map/edit dahil) · Grok Imagine ·
Ideogram V3 (generate/edit/remix) · Ideogram Character · Qwen Image · Qwen2 ·
Qwen3 (standard/pro) · Wan 2.7 Image (standard/pro) · Z-Image

### Video (31 aile)
Veo 3.1 (text/frames/reference + extend + 1080p/4K) · Seedance 2.5 · 2.0 · 2.0 Fast ·
2.0 Mini · 1.5 Pro · 1.0 (Pro/Lite) · Kling 3.0 (multi-shot) · Kling 3.0 Omni
(8 mod, 4K) · Kling V3 Turbo · 2.6 · 2.5 Turbo · 2.1 · Kling Motion Control (2.6/3.0) ·
Kling Avatar · Hailuo 03 (H3) · Hailuo 2.3 · Hailuo 02 · Wan 3.0 (Video/Prime) ·
Wan 2.7 · 2.6 (+Flash) · 2.5 · 2.2 Turbo (speech-to-video dahil) · Wan Animate ·
HappyHorse 1.1 · 1.0 · PixVerse V6 (template, fusion, transition, extend) ·
Grok Imagine Video (1.5 preview, upscale, extend) · Gemini Omni (video, karakter, ses) ·
Runway (generate/extend/Aleph) · OmniHuman 1.5 · InfiniTalk · Volcengine Lip Sync

### Ses (7 aile)
Suno (generate, extend, cover, add vocals/instrumental, mashup, replace section, sounds) ·
Suno Studio (lyrics, stems, MIDI, WAV, cover art, music video, persona) · Suno Voice ·
ElevenLabs Speech (67 ses, Turbo/Multilingual) · ElevenLabs Dialogue v3 · Gemini TTS (2.5 Pro / 3.1 Flash)

### Araçlar (3 aile)
Topaz Upscale (image/video) · Recraft (remove background, crisp upscale) · ElevenLabs Audio Isolation

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
├─ lib/registry/
│  ├─ generated/catalog.json  # docs.kie.ai'den üretilen 176 endpoint şeması
│  ├─ curation.ts       # 69 ürün ailesi: ad, satıcı, modlar, sunum ayarları
│  ├─ auto.ts           # şema → alan/kontrol/payload adaptörü (sezgisel kurallar)
│  └─ types.ts          # Field / Mode / ModelDef sözleşmesi
├─ scripts/kie-catalog/build.py   # kataloğu dokümandan yeniden üretir
├─ lib/kie/client.ts    # KIE REST sarmalayıcısı + sonuç normalizasyonu
├─ app/api/kie/*        # create / task / credits / upload proxy route'ları
├─ components/          # Rail, prompt barı, model seçici, ayar paneli, galeri
└─ store/studio.ts      # Zustand store (anahtar, değerler, çalışmalar)
```

### Model nasıl eklenir

Parametreler dokümandan geliyor; senin işin sadece **hangi endpoint'lerin hangi
kartta hangi mod olarak** görüneceğini söylemek. `src/lib/registry/curation.ts`
içine bir aile ekle:

```ts
{
  id: "my-model",
  name: "My Model",
  vendor: "Vendor",
  category: "video",
  output: "video",
  tagline: "Tek cümlelik tanım.",
  modes: [
    m("text-to-video", "Text to video", "vendor/my-model-t2v"),
    m("image-to-video", "Image to video", "vendor/my-model-i2v", { require: ["image_url"] }),
    // aynı şemayı paylaşan modlar: hide / require / fixed ile ayrıştır
    m("multi-shot", "Multi-shot", "vendor/my-model", { fixed: { multi_shots: true } }),
    // dokümanın oneOf varyantları: variant başlığıyla seç
    m("extend", "Extend", "vendor/my-model-extend", { variant: "TaskId" }),
  ],
  // isteğe bağlı sunum düzeltmeleri
  fields: { quality: { kind: "segmented", placement: "bar" } },
}
```

`model` değeri `catalog.json`'da yoksa uygulama açılışta hata verir — eski bir
kimlik sessizce yayına çıkmaz. Kontrol türü, konumu, sınırları ve varsayılanı
`auto.ts` dokümandaki şemadan çıkarır; `fields` ile tek tek ezebilirsin.

`placement` alanın nerede çıkacağını belirler (adaptör bunu anahtar adından tahmin eder, `fields` ile değiştirilebilir):

- `prompt` — büyük metin alanı
- `input` — prompt'un üstündeki referans medya şeridi
- `bar` — prompt barındaki chip (her üretimde dokunduğun ayarlar)
- `panel` — sağdaki gelişmiş ayarlar çekmecesi

Tüm modeller `/api/v1/jobs/createTask` üzerinden gidiyor (Veo, Runway, Suno,
Flux Kontext dahil — KIE eski ayrı endpoint'leri bu tek endpoint'te birleştirdi).
Farklı bir endpoint gerekirse `src/app/api/kie/create/route.ts` içindeki
`ALLOWED_ENDPOINTS` listesine eklenmeli.

## Tasarım sistemi

Arayüz [krea.ai](https://www.krea.ai/app)'in tasarım dilinden ilham alıyor:
İsviçre grotesk tipografi, üretilen işin üzerinde durduğu neredeyse siyah bir
tuval ve ekrandaki tek önemli aksiyona ayrılmış tek bir vurgu rengi. Palet
"sinema siyahı + amber": soğuk gri yerine sıcak, hafif kahve altı tonlu bir
karanlık ve üzerinde tek bir amber.

**Renkler** — koyu temada tuval `#0a0908`, bant `#050403`, yüzeyler `#151311`
ve `#1f1c18`; metin rampası krem: `#6f685e → #a39b8f → #d6cfc3 → #f5efe6`.
Düğmeler Higgsfield'ın dilinde: seçili hap ve CTA krem `#f5efe6` üzerine
tuval rengi metin, seçili olmayanlar gri metin, ikon düğmeleri hafif gri
dolgulu daire. Amber `#f2a33a` yalnızca durum ve vurgu için (anahtar
noktası, kapak rozetleri, kategori kutuları). Dört kategori rengi aynı sıcak banttan
türetiliyor: görsel amber `#f2a33a`, video bakır `#d9632c`, ses altın
`#f0cf6b`, araçlar kül `#a89f92`. Model kapakları da 12°–58° arası sıcak
hue bandında üretiliyor. Açık tema aynı iskeleti krem üzerine çeviriyor —
tuval `#f7f3ec`, kartlar `#fffdf9`, amber koyulaşıp `#c9821f` oluyor. Tema
raydaki güneş/ay düğmesiyle değişiyor ve tarayıcıda saklanıyor.

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

Katalog dokümanın kendisinden üretildiği için parametreler ve sınırlar
dokümanla birebir; ancak bu depo geliştirilirken gerçek bir API anahtarıyla
uçtan uca canlı üretim testi yapılamadı. Her aile×mod kombinasyonu (201 adet)
programatik olarak derlenip payload üretimi doğrulandı. İstek oluşturma, hata yüzeyi, yoklama ve galeri
akışının tamamı gerçek HTTP yoluyla (engellenen upstream'e karşı) doğrulandı;
her modelin ürettiği payload, KIE'nin resmi araç tanımlarındaki şemalarla
karşılaştırılarak kontrol edildi. Kendi anahtarınla ilk çalıştırmada bir modeli
teyit etmen iyi olur.
