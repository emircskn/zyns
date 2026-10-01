# Mimari notlar (Faz 0)

Tarih: 2026-09-30. Kaynak: `zyns-main` @ `f1aad68`. Bu fazda kod değişmedi.

---

## 1. Model registry

| Ne | Nerede |
|---|---|
| Tipler (`ModelDef`, `Field`, `Mode`, `Choice`, `Category`, `Provider`) | `src/lib/registry/types.ts` |
| Birleştirme ve sorgular (`KIE_MODELS`, `HF_MODELS`, `ALL_MODELS`, `modelsFor`, `getModel`, `providerOf`, `categoriesFor`, `validateValues`, `shownInputs`, `barAndPanel`) | `src/lib/registry/index.ts` |
| KIE modelleri: aile → `ModelDef` üretimi | `src/lib/registry/auto.ts` (`familyToModel`) |
| KIE elle düzeltmeleri (etiket, sıra, gizli alan, mod adları, `prepare` hook'u) | `src/lib/registry/curation.ts` |
| KIE katalog verisi (docs.kie.ai'den üretilir) | `src/lib/registry/generated/catalog.json`, `pricing.json`; üretici `scripts/kie-catalog/build.py`, `pricing.py` |
| Higgsfield modelleri: spec → `ModelDef` | `src/lib/registry/hf/auto.ts` |
| Higgsfield elle düzeltmeleri | `src/lib/registry/hf/curation.ts` |
| Higgsfield katalog verisi (81 spec, docs.higgsfield.ai'den) | `src/lib/registry/hf/generated/catalog.json`; üretici Zorvyn reposunda `scripts/hf-catalog/build.py` |
| Otomatik mod (ör. ilk kare eklenince Text→Image to video) | `src/lib/registry/autoMode.ts` (`withAutoMode`) |
| Sonuç aksiyonları (Extend, Upscale, Stems…) | `src/lib/registry/actions.ts` (`withActions`), `src/lib/resultActions.ts` |
| Fiyat tahmini | `src/lib/registry/pricing.ts`, HF için `src/lib/useEstimate.ts` |

**Bir model/mod nasıl tanımlanıyor:** Katalog JSON'undaki her aile (`family`) bir `ModelDef` olur. Ailenin her endpoint'i bir `Mode` (`{id, label, hint, icon, hidden?, action?}`) olur. Alanlar (`Field`) katalogdaki parametrelerden üretilir. Alan `kind`'ları: `textarea`, `text`, `select`, `segmented`, `ratio`, `slider`, `number`, `toggle`, `images`, `media`, `shots`, `elements`, `clips`, `records`, `list`, `json`, `source`. Her alan bir `when` koşuluyla belirli modlara bağlanır. Curation dosyaları üretilen tanımın üstüne elle düzeltme uygular. Kullanımdan kalkmış parametreler `RETIRED` filtresiyle düşürülür.

**Sağlayıcı:** `ModelDef.provider: "kie" | "higgsfield"`. Higgsfield id'leri `hf-` ile başlar (`hf-genjutsu`, `hf-cinema-studio-4`…). Toplam 124 model var: 88 KIE, 36 Higgsfield.

## 2. İstek atan ve durum sorgulayan kod

**KIE**
- İstemci: `src/lib/kie/client.ts`. Base `https://api.kie.ai`. `createTask`, sonuç normalizasyonu, `extractMade`, `tracks`.
- Taşıma katmanı: `src/lib/kie/transport.ts`. `createTask`, `getTask` (aileye göre `POLL_PATHS`), `getCredits`, `upload`. Key `x-kie-key` header'ında gider.
- Route'lar: `src/app/api/kie/{create,task,credits,upload}/route.ts`
- Hata metinleri: `src/lib/kie/errors.ts`

**Higgsfield**
- İstemci: `src/lib/higgsfield/client.ts`.
  - `HF_BASE = https://api.higgsfield.ai` ve `Authorization: Key …` header'ı.
  - `ENDPOINTS` beyaz listesi katalogdan gelir.
  - `submit` → `request_id`, `status`, `cancel`, `estimate`, `verify`, `uploadTicket` (`/files/generate-upload-url`), `UPLOAD_TYPES`.
- Taşıma katmanı: `src/lib/higgsfield/transport.ts`. `createTask`, `getTask`, `cancelTask`, `getEstimate`, `verifyKey`, `uploadFile`. Key `x-hf-key` header'ında gider.
- Route yardımcıları: `src/lib/higgsfield/route.ts` (`keyFrom`, `missingKey`, `failure`). Key hiçbir yerde loglanmaz.
- Route'lar: `src/app/api/higgsfield/{create,status,estimate,upload,verify}/route.ts`

**Ortak orkestrasyon**
- `src/lib/generate.ts`: `submitRun`, `pollRun`, `refreshCredits`
- `src/components/RunPoller.tsx`: bekleyen run'ları sayfa yenilense de sorgulamaya devam eder.

Faz 1'de bunlar kullanılacak, yenisi yazılmayacak.

## 3. Tarayıcıdan mı, function üzerinden mi?

**Web uygulamasında (Vercel) istekler zaten function üzerinden gidiyor.**
- Tarayıcı `/api/higgsfield/*` ve `/api/kie/*` route'larını çağırır, key'i header'da taşır.
- Route key'i `api.higgsfield.ai` / `api.kie.ai`'ye iletir; key'i loglamaz ve saklamaz.

Tek istisna tek dosyalık standalone build (`npm run build:standalone` → `dist/zyns.html`, claude.ai artifact'ı). Orada sunucu olmadığı için `src/standalone/main.tsx` `window.__KIE_DIRECT__` / `__HF_DIRECT__` bayraklarını açar ve istekler doğrudan gider. Bu kasıtlı bir tercih; canlı site (zyns-swart.vercel.app) proxy kullanıyor.

**Sonuç: yeni bir proxy gerekmiyor.** Faz 1 §1.1 için mevcut istemcide kapatılması gereken boşluklar:

| Eksik | Plan (Faz 1) |
|---|---|
| `status_url` / `cancel_url` kullanılmıyor; `/requests/{id}/status` elle kuruluyor | `submit` dönen URL'leri döndürsün, `Run`'da saklansın, `status`/`cancel` onları kullansın (host `api.higgsfield.ai` ile sınırlı kalsın). Eski run'lar için mevcut kurulum yedek olarak kalsın. |
| `Idempotency-Key` yok | `createTask` her gönderimde bir UUID üretsin; zaman aşımında aynı key ile tekrar denensin. `src/lib/higgsfield/client.ts` `submit`. |
| Eşzamanlılık kuyruğu yok | `src/lib/generate.ts` içinde sağlayıcı başına semaphore. "Maximum number of concurrent requests (N)" 400'ünde N'i öğrenip bekleyip tekrar denesin. |
| Webhook yok | Opsiyonel. Tek kullanıcılı ve kalıcı sunucu deposu olmadığı için poll yeterli; ilk etapta yapılmaması önerilir. |
| `api/hf-catalog` yok | Yeni route: `src/app/api/hf-catalog/route.ts` (bkz. §5). |
| Ses yüklemede wav dönüşümü yok (HF sadece wav alıyor) | `src/lib/upload.ts` içinde yüklemeden önce dönüşüm (Faz 1 §1.4). |

## 4. Medya yükleme ve Assets

**Yükleme**
- `src/lib/upload.ts` → `uploadFile(file, apiKey, provider)`. Sağlayıcıya göre ikiye ayrılır:
  - KIE `file-stream-upload` (24 saat–3 gün sonra silinir).
  - HF `generate-upload-url` + presigned PUT. PUT, route üzerinden yedeklidir.
- `src/lib/useUploader.ts`: UI tarafı ve ilerleme göstergesi. Görseller `upload.ts` içinde önce `src/lib/prepareImage.ts`'ten geçer.

**Assets**
- `src/store/studio.ts` içindeki zustand store, `localStorage`'da `zyns` anahtarıyla persist ediliyor:
  - `uploads: Upload[]` `{id,url,kind,name,createdAt}`, en fazla 200 kayıt.
  - `runs: Run[]` `{id, taskId, modelId, provider, prompt, values, state, urls, tracks, made, …}`.
- `src/lib/assets.ts` bu ikisinden `Asset {id,url,kind,source:'run'|'upload'|'pending',category,label,prompt,createdAt,run}` listesini türetir.
- Beğeniler de store'da.

**Önemli:** Zyns'in kendi kalıcı deposu yok. Saklanan şey sağlayıcının URL'i; KIE upload'ları birkaç günde, HF çıktıları ~7 gün sonra silinebilir. Spec'teki "Assets'e kalıcı kopya" (`MediaRef.storageUrl`) için Cloudflare R2 seçildi (bkz. açık sorular, madde 1).

`src/app/api/media/route.ts` yalnızca indirme/paylaşım için medyayı kendi origin'den geri veren bir geçittir; depolama değildir.

## 5. API key'ler

- `src/store/studio.ts`: `apiKey` (KIE) ve `hfKey` (Higgsfield). Tarayıcının `localStorage`'ında persist edilir; `activeKey` / `keyFor` sağlayıcıya göre seçer.
- Giriş ve doğrulama: `src/components/ApiKeyDialog.tsx` (KIE için `getCredits`, HF için `verifyKey`).
- Sunucuda ortam değişkeni ya da saklanan key yok. Key her istekte header'la route'a gelir.

---

## Spec tipleri ↔ mevcut kod

### Mevcutta karşılığı olanlar

| Spec | Mevcut | Not |
|---|---|---|
| Registry `provider: 'kie' \| 'higgsfield'` | `ModelDef.provider` | Aynı |
| Registry modelleri / modları | `ModelDef`, `Mode`, `Field` | Mod = endpoint |
| Model seçici modalı | `ModelPicker` (sağlayıcı rozeti `VendorBadge` ile) | Capability filtresi eklenecek |
| Higgsfield istemcisi (submit/status/cancel/upload) | `src/lib/higgsfield/*` | Eksikler §3'te |
| KIE istemcisi | `src/lib/kie/*` | Aynen kalır |
| Assets | `uploads` + `runs` → `src/lib/assets.ts` | Kalıcı kopya yok |
| Run kaydı | `Run` (`src/store/studio.ts`) | `RecipeRun.stepStates[]` her adım için bir `Run` id'si tutabilir |
| Sayfa yenilenince devam | `RunPoller` | Recipe adımları da buna bağlanabilir |
| Maliyet gösterimi | `pricing.ts` (KIE), `useEstimate` (HF `/estimate`) | Spec katalog `pricing`'i istiyor; HF'de `/estimate` daha kesin |
| `@` ile prompt'a referans | `src/lib/mentions.ts` (`@Image N`) | Element seçicisi buna eklenir |
| "Continue with" / sonuçtan devam | `resultActions.ts`, MediaViewer | Recipe'de "bu adımdan tekrar dene" için örnek |

### Çakışanlar (Faz 1'de karar gerekir)

| Spec | Mevcut | Öneri |
|---|---|---|
| `Element` (karakter/mekan/ürün/stil kütüphanesi) | `Field.kind: "elements"` (Kling'in `kling_elements` parametresi, UI'da "Elements") ve Gemini Omni'nin `made` karakter/sesleri | Kodda `LibraryElement` / `libraryElements` gibi ayrı bir isim. UI'da sayfa adı yine "Elements" olabilir. |
| `Choice` (recipe seçeneği) | Registry'de `Choice` tipi var (select seçenekleri) | `RecipeChoice` |
| Sayfa yolları `/remix`, `/studio`, `/marketing`, `/effects` | Uygulama tek sayfa; gezinme store'daki `page` state'i ile (`src/lib/layout.ts`, TopBar) | Mevcut `page` state'ine yeni sayfalar eklenir. İstenirse URL senkronu ayrı iş. |
| `/registry/overrides/higgsfield/*.json` | Override'lar TS'te: `src/lib/registry/hf/curation.ts` | Mevcut kalıp kazanır: override'lar curation.ts'te kalır, şemadan üretilen formun üstüne uygulanır. |
| `/data/hf-catalog.snapshot.json`, `scripts/refresh-hf-catalog.ts` | HF katalog `src/lib/registry/hf/generated/catalog.json`, docs.higgsfield.ai'den Python ile (Zorvyn'de) üretiliyor | Snapshot `src/lib/registry/hf/generated/` altına. Kaynak `dash.higgsfield.ai`'ye geçer, script Zyns'e taşınır. |
| `api/hf-catalog` | Route'lar `src/app/api/...` altında | `src/app/api/hf-catalog/route.ts` |
| `/recipes/**/*.json` | — | `src/recipes/**` (import edilebilsin, standalone build'e girsin) |
| `ui_schema` `advanced: true` | Katalogda bayrak `ui_schema.<alan>["ui:options"].advanced` altında (17 alan), üst düzeyde değil | Okuyucu `ui:options.advanced`'e bakacak |
| Enum etiketleri "tire → boşluk, baş harf büyük" | Mevcut `humanize` zaten sentence-case yapıyor | Aynı fonksiyon + küçük sözlük |

### Yeni eklenecekler

- `Capability` tipi ve `ModelDef` (veya `Mode`) üzerinde `capabilities` alanı. Capability mod bazında olmalı: aynı model bir modda T2I, başka modda edit.
- `paramMap` (ortak isim → modelin alan adı). Mod bazında olmalı; KIE'de aynı modelin modları farklı alan adları kullanıyor (ör. Seedance 2 `first_frame_url` vs `reference_image_urls`).
- `MediaRef` ve `remoteUrls` cache'i, `ensureRemoteUrl`.
- Kalıcı depolama: Cloudflare R2 (bkz. açık sorular, madde 1).
- `Element` (kütüphane), Elements sayfası, Assets'te "Element yap".
- `Recipe`, `Slot`, `Step`, `RecipeRun`, `runRecipe`, `lastModelByStep`.
- `Project` ve asset'lerde `projectId`.
- `MotionClip` (Faz 2).
- Sağlayıcı başına eşzamanlılık kuyruğu, `Idempotency-Key`, `status_url`/`cancel_url` saklama.

---

## Higgsfield katalog uçları (2026-09-30'da çağrıldı)

| Uç | Sonuç |
|---|---|
| `GET dash.higgsfield.ai/api/v2/catalog-models/` | 200. 1. sayfa 24, 2. sayfa 10 kayıt (toplam 34). `count` 35 diyor. `genjutsu` slug'ı iki kez geçiyor, bir kayıt eksik görünüyor; normalize ederken slug ile tekilleştirmek gerekecek. |
| `GET …/catalog-models/filters/` | 200 |
| `GET …/app-models/?page_size=100` | 200. 82 mod. `output_type`: image 16, video 66. `operation_type` bir **liste**: image2video 44, text2video 18, text2image 13, video2video 8, image_edit 7, character 1. |
| `GET …/app-models/{id}/` | 200 (`higgsfield/genjutsu/motion-transfer/v1.0`, `higgsfield/cinema-studio/4.0`, `marketing-studio/image`). Anahtarlar: `input_schema`, `ui_schema`, `pricing_description`, `playground.initial_values`, `markdown_docs`, `related_models`, `workflow`. |
| `GET …/app-models/{id}/examples/` | 200, boş liste `[]` |
| `GET dash.higgsfield.ai/models/{id}/llms.txt` | 200 |
| `GET api.higgsfield.ai/marketing-studio/image/presets` | **Çağrılamadı.** Emir'in HF key'i yalnızca kendi tarayıcısında; bu oturumda yok. |

Şemalardan doğrulananlar:
- Motion transfer: `prompt`, `video_url`*, `image_urls`* (1–8), `resolution` 480p/720p/1080p (varsayılan 720p). Fiyat giriş saniyesi başına 0.318 / 0.681 / 1.632 $, yukarı yuvarlanıyor.
- Cinema Studio 4.0'daki enum sayıları: era 5, genre 6, light 6, pacing 4, resolution 2, aspect 6, camera_model 4, lens 5, aperture 3, movement 33, color_palette 50. Spec'teki tabloyla uyumlu.
- Marketing Studio image girdileri: `prompt`, `quality` (low/medium/high), `preset_id`, `image_urls`, `moderation` (auto/low), `resolution` (1k/2k/4k), `aspect_ratio` (auto + 8), `enhance_prompt`.

**Marketing preset `type` değerleri (dolaylı kaynak):** API ucu yerine oturuma bağlı Higgsfield connector'ı (`get_presets`, source `marketing_studio`) üzerinden salt okunur listelendi. Toplam 649 preset; kategoriler `motion`, `product-shot`, `effects`. İlk 50 kayıtta görülen tipler:

- `product_shots`, `product_shots_people` (önizleme görsel)
- `hypermotion`, `mixed_media`, `2d_motion`, `saas_motion` (önizleme video)

Önizleme alanları `thumbnail_url`, `preview_url`, `preview_type`. Bu liste API ucunun (`/marketing-studio/image/presets`) döndüreceğiyle aynı olmayabilir; API ucu yalnızca image preset'leri verebilir. Faz 4'ten önce Emir'in key'iyle bir kez doğrulanmalı.

---

## Açık sorular (hepsi 2026-09-30'da Emir tarafından cevaplandı)

1. ~~**Kalıcı depolama**~~ **Karar (2026-09-30): Cloudflare R2.** Ücretsiz katmanda 10 GB depolama, aylık 1M yazma / 10M okuma işlemi; indirme trafiği her zaman ücretsiz. Aşımda sadece aşan kısım ücretlenir (~$0.015/GB-ay), erişim kesilmez. Vercel Blob Hobby'de 1 GB'ta kalıyor ve aşımda 30 gün kapanıyordu.
   - Faz 1 §1.4 planı: bucket `zyns-media` (2026-10-01'de oluşturuldu, ENAM, Standard). Bucket **private** kalır; public erişim (r2.dev) açılmaz, çünkü r2.dev hız sınırlı ve sadece geliştirme için. Sunucu tarafında `src/app/api/storage/` route'u yükleme için presigned PUT imzalar; tarayıcı dosyayı doğrudan R2'ye yükler. Okuma için sabit bir Zyns adresi (`/api/storage/<key>`) kısa ömürlü presigned GET'e yönlendirir. Nesne adları tahmin edilemez UUID olur.
   - Kimlik bilgileri yalnızca Vercel ortam değişkenlerinde durur (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`); repoya ya da tarayıcıya girmez.
   - Kopyalanacaklar: yüklenen dosyalar, Element görselleri, beğenilenler, recipe çıktıları. Her üretimin otomatik kopyalanması şart değil; alan dolmasın diye seçici tutulur.
   - Yapılanlar: R2 Emir tarafından etkinleştirildi; bucket Cloudflare connector'ı ile oluşturuldu. API token'ı ve 4 değişken Emir tarafından Vercel'e girildi (2026-10-01). Vercel connector'ının bu projeye okuma yetkisi yok; değişkenlerin çalıştığı Faz 1'deki ilk storage deploy'unda test edilecek.
2. **Standalone artifact → Karar:** Sunucu isteyen özellikler (R2, `api/hf-catalog`, recipe'ler) tek dosyalık `dist/zyns.html`'de gizlenir; canlı site tam çalışır.
3. **Zorvyn → Karar:** Zorvyn kapsam dışı. Faz 1–5 sadece Zyns'e yapılır; Zorvyn'e taşıma yok.
4. **`text-to-video` → Karar:** Eklenmiyor. Spec'teki `Capability` listesi aynen kalır (Higgsfield'daki gibi); recipe adımlarında video bir görselden başlar. Normal Video sayfasındaki text-to-video modları etkilenmez.
5. **Capability'nin birimi → Karar:** Mod bazında.

---

## Faz 1 sonrası (2026-10-01)

Neyin nerede olduğu:

| Konu | Dosyalar |
|---|---|
| Higgsfield idempotency, dönen status/cancel URL'leri, eşzamanlılık kuyruğu | `src/lib/higgsfield/client.ts`, `transport.ts`, `queue.ts`; `Run.statusUrl/cancelUrl/idempotencyKey/request/held` |
| Katalog | `src/lib/higgsfield/catalogSource.ts` (normalize), `catalogServer.ts` (1 saat bellek önbelleği + snapshot'a düşüş), `src/app/api/hf-catalog/route.ts` (edge: `s-maxage=3600, stale-while-revalidate=86400`), `scripts/refresh-hf-catalog.ts` → `src/lib/registry/hf/generated/catalog.json` |
| Şemadan form + override | `src/lib/registry/hf/auto.ts` (`ui:order`, `ui:options.advanced`, `visibleWhen`, başlık/yardım/placeholder), override = `hf/curation.ts`; canlı katalog `src/lib/useHiggsfieldCatalog.ts` ile ziyaret başına bir kez uygulanır (`applyHiggsfieldCatalog`) |
| Model seçicide önizleme/fiyat | `ModelDef.preview/price`, `src/components/ModelPicker.tsx` |
| Kalıcı depolama (R2) | `src/lib/storage/r2.ts` (SigV4 elle), `guard.ts` (yazmak için geçerli KIE/HF key), `src/app/api/storage/{copy,file/[...key],remote}`; tarayıcı: `src/lib/storage/client.ts` (`keepCopy`, `mediaSrc`, `ensureRemoteUrl`), `StorageKeeper` (yüklemeler + beğenilenler) |
| MediaRef, WAV, medya ölçüsü | `src/lib/media.ts`, `src/lib/wav.ts`, `src/lib/mediaMeta.ts`; gönderimde `src/lib/sendMedia.ts` |
| Elements | `src/lib/elements.ts` (`LibraryElement`), `ElementsPage.tsx`, `ElementEditor.tsx`, `@` menüsü `PromptBar.tsx` |
| Recipe motoru | `src/lib/registry/capabilities.ts` (onaylı tablo), `src/lib/recipes/{types,template,paramMap,engine}.ts`, `src/recipes/**` (JSON), `src/components/recipes/*`, test sayfası `/lab` |
| Projeler | `Project` + `Run.projectId/Upload.projectId` (`src/store/studio.ts`), `src/components/ProjectMenu.tsx` |

Spec'ten sapmalar ve nedenleri:

- **Preview deploy:** Proje tek dal (`zyns-main`) ile canlıya gidiyor; her görev canlıya çıktı. Ayrı bir preview dalı açmak için Emir'in onayı gerekir.
- **Snapshot yolu:** `/data/hf-catalog.snapshot.json` yerine mevcut `src/lib/registry/hf/generated/catalog.json` (mevcut kalıp).
- **Override'lar:** JSON yerine mevcut `hf/curation.ts` (mevcut kalıp).
- **`ui:widget: hidden`:** Uygulanmadı. Higgsfield Kling'in `elements` alanını gizliyor, Zyns onu kullanıyor.
- **Kalıcı kopya:** Her çıktı değil; yüklenenler, beğenilenler, Element görselleri ve recipe adım çıktıları kopyalanıyor (10 GB ücretsiz alan için).
- **Recipe'ler:** `/recipes/**` yerine `src/recipes/**` (import edilebilsin diye).
- **Gemini TTS:** Konuşmacı/ses seçimi zorunlu; recipe adımında "Settings" altından seçilmeli, otomatik eşlenmiyor.
- **Higgsfield katalogunda yeni:** `higgsfield/genjutsu/restyle/v1.0` (Faz 2 §2.3 "ayrı style endpoint'i yok" diyordu; artık var, `preset_id` istiyor) ve Soul 2.0 image-to-image (Soul 2.0'a "Edit" modu olarak eklendi).

