# ZYNS — Higgsfield özellikleri: uygulama spec'i

Bu dosya Claude Code'a verilmek için yazıldı. Hedef: Zyns'e Higgsfield'daki **Effects**, **Genjutsu**, **Cinema Studio** ve **Marketing Studio** akışlarını eklemek.

v2'de değişen: Zyns'te hem **KIE** hem **Higgsfield** API key'i var. Higgsfield'ın public API'sinde bir özelliğin kendi endpoint'i varsa (Genjutsu, Cinema Studio, Marketing Studio) o endpoint kullanılır. Spec hiçbir yerde kendi kafasına göre model seçmez. Kendi endpoint'i olmayan adımlarda model, Emir'in o an composer'da seçtiği modeldir. Model bilgileri, form alanları ve önizleme medyaları mümkün olan her yerde Higgsfield'ın katalog API'sinden **dinamik** çekilir.

> **Claude Code'a not — önce oku, sonra yaz.**
> Bu spec Zyns'in canlı sürümüne ve commit mesajlarına bakılarak yazıldı, kaynak koduna bakılmadan. Kodda şunlar zaten var: model registry (modlar, chip'ler, seçenekler), Image / Video / Audio / Tools sayfaları, Assets ve Favorites, KIE AI / Higgsfield sağlayıcı seçimi ve kullanıcının kendi API key'leri, video sayfasında sol composer + geçmiş listesi.
> Faz 0'da repo'yu tara ve şunları bul, spec'teki isimleri mevcut yapıya uydur:
> 1. Model registry nerede, bir model/mod nasıl tanımlanıyor, sağlayıcı (KIE / Higgsfield) nerede belirtiliyor?
> 2. KIE ve Higgsfield'a istek atan, durumu sorgulayan kod nerede? **Aynısını kullan, yenisini yazma.**
> 3. Higgsfield istekleri tarayıcıdan mı gidiyor, bir Vercel function üzerinden mi? (Faz 1 §1.1'e bak.)
> 4. Kullanıcı medyası nasıl yükleniyor, üretimler (Assets) nerede saklanıyor?
> 5. API key'ler nerede tutuluyor?
>
> Spec'teki tip isimleri ve dosya yolları öneridir. Mevcut kalıplarla çelişirse mevcut kalıp kazanır.

## Nasıl çalışılacak (Claude Code için)

Bu spec **fazlara bölünmüş**. Hepsini bir seferde yapma.

1. Her seferinde **sadece Emir'in söylediği fazı** uygula. "Faz 2'yi yap" dendiyse sadece Faz 2 bölümündeki görevler yapılır.
2. Her fazın başında o fazın bölümünü baştan sona oku; bu dosyanın başındaki kurallar her fazda geçerli.
3. Faz 1 bitmeden Faz 2–5 başlamaz. Faz 2–5 birbirinden bağımsız ama bu sırayla gidilmesi öneriliyor. Önce kendi endpoint'i olan özellikler geliyor, çünkü bunlar adım bazında model seçici gerektirmiyor ve altyapıyı gerçek istekle test ediyor.
4. Her faz "Bu faz bitince" adımıyla biter:
   - commit
   - preview deploy
   - kabul kriterlerinin kontrolü
   - Emir'e özet
   - **onay beklemek**

   Onay gelmeden sonraki faza geçme.
5. Hangi fazların bittiğini `docs/zyns-progress.md`'de tut (faz, tarih, durum, notlar). Yeni bir oturumda önce bu dosyaya bak.

| Faz | Konu | Durum |
|---|---|---|
| Faz 0 | Keşif: repo, mimari notlar, capability etiketleri. Kod yazılmaz. | ☐ |
| Faz 1 | Altyapı: Higgsfield istemcisi, dinamik katalog, şemadan form, medya, Elements, Recipe motoru, projeler | ☐ |
| Faz 2 | Remix (Genjutsu karşılığı) → `/remix` | ☐ |
| Faz 3 | Studio (Cinema Studio karşılığı) → `/studio` | ☐ |
| Faz 4 | Marketing (Marketing Studio karşılığı) → `/marketing` | ☐ |
| Faz 5 | Effects → `/effects` | ☐ |

Bölüm numaraları (§1.1–§1.7) Faz 1'deki altyapı bölümleridir; diğer fazlar bunlara atıf yapar.

---

## Kurallar (her fazda geçerli)

1. **Model üretim anında seçilir, kodda sabitlenmez.**
   - Bir özellik Higgsfield'da kendi endpoint'iyle geliyorsa (ör. Genjutsu = `higgsfield/genjutsu/motion-transfer/v1.0`) o endpoint kullanılır; bu bir tercih değil, özelliğin kendisi.
   - Kendi endpoint'i olmayan her adımda (Effects zincirleri, UGC videosu gibi) composer'da **o adımın model seçicisi** vardır. Emir her üretimde istediği modeli seçer.
   - Seçici sadece o adımın gerektirdiği yeteneği destekleyen modelleri listeler (ör. "image-edit, çoklu görsel"). KIE ve Higgsfield modelleri birlikte, sağlayıcı rozetiyle görünür.
   - Son seçim adım bazında hatırlanır. Claude Code hiçbir adıma kendi tahminiyle model atamaz. Hiç seçim yapılmamış adımda seçici açık başlar ve Generate pasif kalır.
   - Zyns tek kullanıcılı (sadece Emir kullanıyor); kullanıcı başına ayar, paylaşım ve çok kullanıcılı rate limit gerekmez.
2. **Sağlayıcı yönlendirmesi registry'den gelir.** Her model kaydında `provider: 'kie' | 'higgsfield'` var. Bir özellik Higgsfield'a özelse ve Higgsfield key'i yoksa, özellik sayfası "Bu özellik Higgsfield key'i ister" durumu gösterir ve key ekleme akışına yönlendirir.
3. **Dinamik veri öncelikli.** Higgsfield modellerinin açıklaması, fiyatı, parametre şeması, enum seçenekleri ve önizleme medyası katalog API'sinden çekilir (Bölüm 1.3). Elle kopyalanmış enum listesi yazılmaz.
4. **Tasarım:** Yeni ekranlar Zyns'in mevcut görsel dilini kullanır (koyu zemin, kenardan kenara medya, ince ayraçlar, sade composer). Uyarı/bildirim kartlarında sol kenarda renkli vurgu şeridi kullanılmaz.

---

## Faz 0 — Keşif (kod yazılmaz)

Bu dosyanın tamamına bir kere göz at ki sonraki fazlarda neyin geleceğini bil. Bu fazda **hiç kod değiştirme.**

### Görevler

1. Repo'yu tara, dosyanın başındaki 5 sorunun cevabını `docs/architecture-notes.md`'ye yaz. Her cevapta ilgili dosya yollarını ver.
2. Higgsfield istekleri tarayıcıdan doğrudan mı gidiyor, bir Vercel function üzerinden mi? Tarayıcıdan gidiyorsa Faz 1 §1.1'deki proxy için kısa bir plan yaz (hangi dosya, hangi route, key nasıl taşınacak).
3. Faz 1–5'teki tip ve isimleri (Element, MediaRef, Recipe, Step, RecipeRun, Project, registry alanları) mevcut koda eşle. Mevcutta karşılığı olanları, çakışanları ve yeni eklenecekleri ayrı ayrı listele.
4. **Capability etiketleri:** registry'deki her model/mod için hangi capability'leri desteklediğini çıkar. Liste Faz 1 §1.6'daki `Capability` tipinde: `text-to-image`, `image-edit-multi`, `image-to-video`, `reference-to-video`, `video-edit`, `motion-transfer`, `object-swap`, `lipsync-from-audio`, `text-to-speech`.
   - Tablo formatı: model | sağlayıcı | mevcut modlar | önerilen capability'ler | emin misin (evet/hayır).
   - Emin olmadığın modeli boş bırak, tahmin yazma.
   - Tabloyu `docs/capabilities-draft.md`'ye kaydet.
5. Higgsfield katalog uçlarını (Faz 1 §1.3) bir kere çağırıp çalıştıklarını doğrula. Emir'in Higgsfield key'i erişilebiliyorsa `marketing-studio/image/presets` ucunu da çağır ve dönen `type` değerlerini not et (Faz 4 için gerekli).

### Çıktı

Emir'e kısa bir özet:
- mimari notlar (5 soru)
- proxy gerekip gerekmediği
- çakışmalar ve açık sorular
- capability tablosunun linki
- katalog uçlarının durumu

---

### Bu faz bitince

- `docs/zyns-progress.md`'yi güncelle.
- Kod değişikliği yok, sadece `docs/architecture-notes.md` ve `docs/capabilities-draft.md` commit'lenir.
- **Dur ve onay bekle.** Emir capability tablosunu düzeltip onaylayacak. Emir onay vermeden Faz 1'e geçme.

---

## Faz 1 — Altyapı

Faz 0'da çıkan `docs/architecture-notes.md` ve onaylanmış `docs/capabilities-draft.md` bu fazın girdisi. Onaylı capability tablosunu registry'ye işle; tabloda boş kalan modellere capability ekleme.

Bu fazda yeni bir özellik sayfası yapılmaz (Elements sayfası hariç). Amaç sonraki fazların üzerine kurulacağı temeli hazırlamak.

### Görevler

1. Higgsfield istemcisini tamamla: upload, idempotency, eşzamanlılık kuyruğu, webhook (opsiyonel), gerekiyorsa proxy (§1.1).
2. `api/hf-catalog` + snapshot + refresh script'i (§1.3).
3. Şemadan form üretici + override katmanı. Higgsfield registry kayıtlarını katalogdan üret; model seçici kartlarında önizleme ve fiyat göster (§1.3).
4. `ensureRemoteUrl` (iki sağlayıcı), wav dönüşümü, video meta (§1.4).
5. Elements veri modeli + Elements sayfası + Assets'ten "Element yap" + `@` seçici bileşeni (§1.5).
6. Recipe motoru: capability'ler, onaylı capability etiketleri, adım bazında model seçici + son seçimi hatırlama, `paramMap`, `runRecipe`, kalıcılık (§1.6).
7. Projeler (§1.7).

### Detaylar

#### 1.1 Higgsfield API istemcisi

Zyns'te zaten bir Higgsfield istemcisi varsa onu kullan ve eksikleri tamamla. Referans (docs.higgsfield.ai):

- Base URL: `https://api.higgsfield.ai`
- Auth header: `Authorization: Key {KEY_ID}:{KEY_SECRET}`
- Gönderim: `POST https://api.higgsfield.ai/{model_id}` (ör. `/higgsfield/genjutsu/motion-transfer/v1.0`), gövde = modelin input şeması.
  - Dönen: `{ status: "queued", request_id, status_url, cancel_url }`. URL'leri kendin kurma, dönenleri kullan.
- Durum: `status_url`'i sorgula. Durumlar: `queued`, `in_progress`, `completed`, `failed`, `nsfw`, `canceled`.
  - Çıktı alanı modelin türüne göre değişir: `images[].url`, `video.url` ya da `audio.url`.
  - Çıktılar en az 7 gün tutuluyor. Assets'e kalıcı kopya al.
- Webhook (opsiyonel): gönderimde `?hf_webhook=<https url>` query parametresi.
  - Tekrarlı teslim olabilir; `request_id` + `status` ile tekilleştir.
- İptal: `cancel_url`'e POST. Sadece `queued` durumunda çalışır.
- Idempotency: gönderimde `Idempotency-Key` header'ı. Zaman aşımında tekrar denersen çift üretim olmaz.
- Eşzamanlılık limiti hesaba göre değişiyor. Aşılınca `400` ve "Maximum number of concurrent requests (N)" mesajı dönüyor. İstemci tarafında kuyruk/semaphore kur, bu hatada bekleyip tekrar dene.
- Dosya yükleme:
  1. `POST /files/generate-upload-url` ile `{content_type}` gönder; `{ public_url, upload_url, upload_headers }` döner.
  2. `upload_url`'e `upload_headers`'ın hepsiyle PUT at.
  3. `public_url`'i modele ver.

  Desteklenen tipler: jpeg/png/webp/gif, wav, mp4. Upload URL'i 1 saat geçerli.
- **Key güvenliği:** Higgsfield docs'u credential'ların sunucu tarafında kalmasını istiyor; resmi TS SDK tarayıcıda çalışmayı engelliyor. Zyns'te istekler tarayıcıdan doğrudan gidiyorsa bir Vercel function proxy'si kur. Kullanıcının key'i istek başına header'da proxy'ye gelsin. Proxy key'i loglamasın ve saklamasın, isteği `api.higgsfield.ai`'ye iletsin.

#### 1.2 KIE istemcisi

Mevcut KIE kodu aynen kalır (`/api/v1/jobs/createTask` + durum sorgulama + file upload). KIE upload'ları 24 saat ile 3 gün arasında siliniyor. Kalıcı medyada `ensureRemoteUrl` kullan (1.4).

#### 1.3 Dinamik katalog (Higgsfield)

Higgsfield'ın API konsolu (open.higgsfield.ai) kendi model kataloğunu aşağıdaki uçlardan çekiyor. 1 Ekim 2026'da test edildi. `dash.higgsfield.ai` uçları **auth istemiyor**, ama **dokümante değiller**; değişebilirler. Bu yüzden sunucu tarafında cache'le, hata olursa son iyi kopyaya düş.

| Uç | Auth | Ne verir |
|---|---|---|
| `GET https://dash.higgsfield.ai/api/v2/catalog-models/` (`?output_type=video\|image`, `?tags=featured\|trending`, `?page=2`) | Yok | Model aileleri ve workflow'lar: `title`, `description`, `company`, `preview_video {thumbnail_url, video_url}` / `preview_image`, `pricing.primary` (tutar, birim, indirim), `entry_points[].mode_id`, `tags`, `availability_state`. ~35 kayıt, 2 sayfa. |
| `GET https://dash.higgsfield.ai/api/v2/catalog-models/filters/` | Yok | Filtre sayıları: çıktı tipi, şirket, tag, katalog tipi |
| `GET https://dash.higgsfield.ai/api/v2/app-models/?page_size=100` | Yok | Tüm modlar (82): `slug` (= model_id), `title`, `variant_title`, `banner_media {type, url, poster}`, `preview_video`, `preview_image`, `output_type`, `operation_type`, `tags` |
| `GET https://dash.higgsfield.ai/api/v2/app-models/{model_id}/` | Yok | Tek mod detayı: **`input_schema`** (JSON Schema: tipler, enum'lar, min/max, default), **`ui_schema`** (`ui:order`, alan bazında `advanced` bayrağı, widget ipuçları: `textarea`, `range`, `imageUrlString`), `banner_media`, `description`, `pricing_description`, `playground.initial_values` (örnek prompt) |
| `GET https://dash.higgsfield.ai/api/v2/app-models/{model_id}/examples/` | Yok | Örnek üretimler (şu an çoğu modelde boş liste; boşsa gizle) |
| `GET https://dash.higgsfield.ai/models/{model_id}/llms.txt` | Yok | Modelin okunabilir dokümanı (fiyat kuralları, özel modlar). Kod içinde değil, geliştirme sırasında referans. |
| `GET https://api.higgsfield.ai/marketing-studio/image/presets?size=50` (`&cursor=`) | Kullanıcının HF key'i | **Dokümante.** Marketing Studio preset'leri: `{ total, cursor, items: [{ id, type, name, ...medya alanları }] }`. Önizleme alanı `media.url`, `cover_image.url`, `preview_url` ya da `image_url` olabilir; sırayla dene. |

**Nasıl kullanılacak:**

- `api/hf-catalog` Vercel function'ı: yukarıdaki public uçları çeker, normalize eder, `s-maxage=3600, stale-while-revalidate=86400` ile cache'ler. Hata durumunda repo'daki `/data/hf-catalog.snapshot.json`'a düşer. Snapshot'ı güncelleyen bir `scripts/refresh-hf-catalog.ts` script'i de olsun.
- **Registry'nin Higgsfield tarafı katalogdan üretilir.** Her `app-model` için `input_schema` + `ui_schema`'dan composer formu otomatik çıkar:
  - enum → chip/select
  - `integer` + min/max → slider (`ui:widget: range`)
  - `array<uri>` → çoklu yükleme alanı; `maxItems` limit olur
  - `boolean` → toggle
  - `ui:order` → alan sırası
  - `advanced: true` → "Gelişmiş" açılır bölümüne

  Zyns'in elle ayarladığı chip/etiket düzeltmeleri varsa, bunlar üretilen şemanın üzerine "override" katmanı olarak uygulanır (`/registry/overrides/higgsfield/*.json`). Böylece Higgsfield yeni bir parametre eklediğinde form kendiliğinden güncellenir, Zyns'in özelleştirmeleri de kaybolmaz.
- **Model seçici kartları:** Higgsfield modellerinde `banner_media` / `preview_video` sessiz loop olarak, `preview_image` poster olarak gösterilir. Fiyat `pricing.primary`'den ("from $0.144/sn" gibi) alınır.
- **Enum etiketleri:** API slug veriyor (`vintage-anamorphic`, `f14-wide-open`). Etiket üretimi: tireleri boşluk yap, baş harfi büyüt. Özel durumlar için (`f14-wide-open` → `f/1.4 Wide Open`) küçük bir etiket sözlüğü tut. Seçenek listesinin kendisi her zaman şemadan gelir.

**KIE tarafı:** KIE'nin dokümante bir katalog ya da önizleme API'si yok; sitesinin kullandığı iç uçlar da dokümante değil. KIE modelleri mevcut elle yazılmış registry'de kalır. Önizleme gerekiyorsa Zyns'in kendi üretimleri kullanılır.

**Kullanılmayanlar (bilerek):** higgsfield.ai web uygulamasının iç API'si (`fnf-api-gw.higgsfield.ai`). Effects/viral preset kataloğu, Motion Library klipleri, kamera hareketi önizlemeleri, Genjutsu stil listesi oradan geliyor. Bu uçlar API key ile değil, giriş yapılmış web oturumuyla çalışıyor ve dokümante değil. Zyns'te kullanmak için Emir'in Higgsfield oturum çerezlerini uygulamaya koymak gerekir. Bu hem güvenlik riski, hem de her site güncellemesinde kırılabilir. Bu yüzden spec bunları kapsamıyor. İleride bu içerikler public API'ye eklenirse aynı katalog katmanına bağlanır.

#### 1.4 Medya yardımcıları

- `ensureRemoteUrl(mediaRef, provider)`: medyanın hedef sağlayıcıda geçerli, süresi dolmamış bir URL'i olmasını sağlar. Kalıcı orijinal Zyns'in deposunda durur. KIE için KIE upload'ı, Higgsfield için `generate-upload-url` akışı kullanılır. Sağlayıcıya göre URL'i ayrı ayrı cache'le (`remoteUrls: { kie?: {url, expiresAt}, higgsfield?: {url, expiresAt} }`).
- Tip dönüşümü: Higgsfield upload'u ses için sadece `wav` kabul ediyor. mp3/m4a gelirse yüklemeden önce wav'a çevir (ffmpeg.wasm ya da function).
- Video meta: süre, boyut ve en-boy tarayıcıda `<video>` ile okunur. Her modelin limitleri şemadan (`minimum`/`maximum`, açıklama) ya da override dosyasından gelir.

#### 1.5 Elements kütüphanesi (karakter / mekan / ürün / stil)

```ts
type ElementKind = 'character' | 'location' | 'product' | 'style';

interface Element {
  id: string;
  kind: ElementKind;
  name: string;              // "@emir", "@depo", "@green-puffer"
  images: MediaRef[];        // 1–10 referans görsel (ilki kapak)
  notes?: string;            // prompt'a eklenecek kısa tarif
  createdAt: number;
}

interface MediaRef {
  id: string;
  kind: 'image' | 'video' | 'audio';
  storageUrl: string;        // Zyns'teki kalıcı kopya
  remoteUrls?: Partial<Record<'kie' | 'higgsfield', { url: string; expiresAt?: number }>>;
  width?: number; height?: number; durationSec?: number;
}
```

- Yeni sayfa: **Elements**. Grid, tür filtresi, oluştur/düzenle/sil. Assets'teki herhangi bir görselde "Element yap" aksiyonu olsun.
- Prompt kutularında `@` yazınca element seçici açılsın. Gönderirken element görselleri modelin görsel alanına (`image_urls` vb.) eklenir, `notes` ise prompt'a eklenir.
- Not: Higgsfield katalogunda `soul-id` (karakter kimliği) modu var ama public şemasında parametre görünmüyor. Karakter element'lerini Soul ID'ye bağlamak ileride ayrı bir iş olarak değerlendirilebilir; bu spec'in kapsamında değil.

#### 1.6 Recipe motoru (zincirli üretim)

Effects, Marketing'deki video şablonları ve UGC akışı için. Tek fark v1'den: step'ler sabit model taşımaz; model composer'da o an seçilir (native endpoint'li adımlar hariç).

```ts
interface Recipe {
  id: string;
  name: string;
  category: 'effect' | 'product-motion' | 'ugc';
  description: string;
  preview?: { thumbUrl: string; videoUrl?: string };
  output: 'image' | 'video';
  slots: Slot[];
  choices: Choice[];
  steps: Step[];
}

type Slot =
  | { key: string; type: 'image'; label: string; required: boolean; min?: number; max?: number; elementKind?: ElementKind }
  | { key: string; type: 'video'; label: string; required: boolean }
  | { key: string; type: 'audio'; label: string; required: boolean }
  | { key: string; type: 'text';  label: string; required: boolean; placeholder?: string; hiddenByDefault?: boolean };

interface Choice { key: string; label: string; options: string[]; default: string }

interface Step {
  id: string;                          // "frame", "motion"
  capability: Capability;              // gereken yetenek
  fixedModel?: string;                 // sadece native endpoint'li adımlarda; yoksa model composer'da seçilir
  params: Record<string, Template>;    // {{slots.x}}, {{choices.y}}, {{steps.frame.output.url}}
  when?: Template;
}

type Capability =
  | 'text-to-image' | 'image-edit-multi'          // çoklu referansla görsel düzenleme
  | 'image-to-video' | 'reference-to-video'
  | 'video-edit' | 'motion-transfer' | 'object-swap'
  | 'lipsync-from-audio' | 'text-to-speech';
```

- **Adım bazında model seçici (composer'da):**
  - Recipe'nin `fixedModel` olmayan her step'i için composer'da bir satır: adımın adı ("Kare", "Hareket", "Ses"...) + model kartı + "Değiştir".
  - "Değiştir" mevcut model seçici modalını açar, ama sadece o step'in `capability`'sini destekleyen registry modelleriyle filtrelenmiş halde. KIE + Higgsfield birlikte, sağlayıcı rozeti, Higgsfield modellerinde katalogdan önizleme ve fiyat.
  - Model değişince o adımın model'e özel ayarları (çözünürlük, süre, kalite...) seçilen modelin şemasından yeniden üretilir ve adım satırının altında açılır.
  - Hatırlama: son seçim `lastModelByStep["effects.frame"]` gibi bir anahtarla saklanır (localStorage yeterli; Zyns tek kullanıcılı). Efekt bazında ayrı hatırlama da olsun: `lastModelByStep["effects.gravity-drop.frame"]` varsa o önce gelir.
  - Hiç seçim yoksa satır "Model seç" durumunda, Generate pasif.
  - Çalıştırma kaydı (`RecipeRun`) her adımda hangi modelin kullanıldığını saklar. "Aynı ayarlarla tekrar" o modelleri geri yükler, "Bu adımı başka modelle dene" sadece o step'in modelini değiştirip yeniden çalıştırır.
- **Parametre eşleme:** Recipe parametreleri ortak isimlerle yazılır (`prompt`, `images`, `video`, `aspect_ratio`, `resolution`, `duration`). Her registry modeli bu ortak isimleri kendi alan adlarına çeviren bir `paramMap` taşır: KIE Kling MC → `input_urls` / `video_urls`, Higgsfield → `image_urls` / `video_url`. Model desteklemediği bir parametreyi atlar, ama bunu çalıştırma kaydına uyarı olarak düşer.
- **Çalıştırıcı (`runRecipe`):**
  1. Slot'ları doğrula.
  2. Step'leri sırayla çalıştır. Her step'te şablonu çöz, `ensureRemoteUrl` ile medyayı hazırla, mevcut sağlayıcı istemcisiyle gönder ve durumu sorgula.
  3. Ara çıktıyı Assets'e `runId` ile "ara adım" olarak kaydet.
  4. "Bu adımdan tekrar dene" ile tek bir step yeniden çalıştırılabilsin.
  5. Durum kalıcı olsun: `RecipeRun { id, recipeId, inputs, stepStates[], createdAt }`. Sayfa yenilenince devam etsin.
  6. Maliyet: Higgsfield modellerinde katalogdaki `pricing`'den, KIE'de registry'deki tahminden hesaplanıp Generate butonunda gösterilsin.
- Recipe'ler `/recipes/**/*.json` altında durur.

#### 1.7 Projeler

Minimal hali: `Project { id, name, coverUrl?, createdAt }`, her asset'te opsiyonel `projectId`. Assets'e proje filtresi, composer'a "şu projeye kaydet" seçicisi eklenir.

### Kabul kriterleri

- Higgsfield'a bir test isteği (ör. ucuz bir görsel modeli) proxy/istemci üzerinden gidiyor. Upload, durum sorgulama ve çıktının Assets'e kalıcı kopyası çalışıyor. Eşzamanlılık limiti aşılınca istek kuyrukta bekliyor.
- `api/hf-catalog` çalışıyor. Uç kapatıldığında (test için URL'i boz) snapshot'a düşüyor.
- Mevcut Image/Video sayfalarındaki Higgsfield modelleri formlarını şemadan alıyor ve eskisi gibi çalışıyor. Zyns'in eski özelleştirmeleri override olarak korunmuş.
- Model seçicide Higgsfield modellerinin önizleme videosu ve fiyatı görünüyor.
- Elements'te karakter oluşturup herhangi bir composer'da `@` ile çağırınca görselleri isteğe ekleniyor.
- Test amaçlı 2 adımlı bir recipe (UI'sız, script ya da geçici bir sayfadan) çalışıyor:
  - adım bazında model seçimi
  - ara çıktının Assets'e düşmesi
  - sayfa yenilenince devam
  - tek adımı başka modelle yeniden çalıştırma
- KIE tarafındaki mevcut üretimler hiçbir şekilde bozulmamış.

---

### Bu faz bitince

- `docs/zyns-progress.md`'yi güncelle.
- Her görev ayrı commit.
- Preview deploy yap, kabul kriterlerini tek tek kontrol et ve sonucu Emir'e özetle (neler çalışıyor, neler eksik, spec'ten sapılan yerler ve nedeni).
- **Dur ve onay bekle.**  Emir onay vermeden sonraki faza geçme.

---

## Faz 2 — Remix (Genjutsu karşılığı)

Faz 1'in altyapısı hazır olmalı; burada yeni istemci, katalog ya da recipe motoru yazılmaz, Faz 1'dekiler kullanılır.


### Görevler

1. `/remix` sayfası ve menü girişi.
2. Hareket aktar ve Değiştir modları: formlar katalog şemasından, fiyat hesabı, Higgsfield key yokken durum ekranı.
3. Restyle modu: varsayılan olarak motion-transfer, yanında `video-edit` modelleri için seçici; Zyns'e ait stil preset'leri.
4. Video doğrulama ve kırpıcı.
5. Before/after karşılaştırma ve "Aynı kaynakla başka referans dene".
6. Hareket Kütüphanesi + Assets'te "Hareket klibi olarak kaydet".


### Detaylar

#### 2.1 Higgsfield'da gözlem

- Motion transfer / Objects swap modları var. Referans video 4–30 sn. Karakter, ürün ve kıyafet görselleri yükleniyor.
- "Style" ile restyle yapılabiliyor.
- Motion Library'deki hazır klipler "Recreate" ile kullanılıyor.

#### 2.2 Endpoint'ler (Higgsfield native — seçim değil, özelliğin kendisi)

| Zyns modu | Model ID | Parametreler (katalog şemasından; 1 Ekim 2026) |
|---|---|---|
| **Hareket aktar** | `higgsfield/genjutsu/motion-transfer/v1.0` | `video_url` (zorunlu, 4–30 sn), `image_urls` (zorunlu, 1–8, sıralı referans), `prompt` (ops., ≤10.000), `resolution` (`480p`/`720p`/`1080p`, varsayılan 720p) |
| **Nesne / kişi değiştir** | `higgsfield/genjutsu/object-swap/v1.0` | `video_url`, `image_urls` (1–8), `prompt`, `resolution` |

- Parametreleri elle yazma; formu 1.3'teki `input_schema`'dan üret. Tablo sadece referans.
- Fiyat giriş videosunun saniyesine göre (katalogdaki `pricing` / llms.txt). Yüklenen videonun süresi × çözünürlük fiyatı olarak Generate butonunda göster; süre yukarı yuvarlanıyor.
- Bu modlar Higgsfield key'i ister (Kural 2).

#### 2.3 Restyle

Higgsfield public API'sinde ayrı bir "style" endpoint'i yok. Motion transfer'in açıklaması karakter, mekan ve **stil** referans görsellerini kapsıyor. Bu yüzden:

- **Restyle modu varsayılan olarak `motion-transfer`'i çağırır:** kaynak video + stil referans görseli/görselleri (Elements'te `kind: 'style'`) + stil prompt'u.
- Bu yaklaşım ilk sürümde **test edilmeli**. Restyle modunda da bir model seçici olsun. İlk sırada Genjutsu motion-transfer dursun, altında `video-edit` yeteneğindeki bütün registry modelleri listelensin; Emir o an istediğini seçer. Katalogda bu yetenekteki Higgsfield modları `bytedance/seedance-2.5/video-edit` ve `kling-video/o3/video-edit`. KIE'dekiler Zyns registry'sinde neyse onlar.
- Stil preset'leri Zyns'in kendi listesi: her stil = isim + prompt parçası + referans görsel + önizleme. Önizlemeler Zyns ile üretilir.

#### 2.4 Ekran

- **Sol composer:**
  - Mod sekmeleri: Hareket aktar · Değiştir · Restyle.
  - **Kaynak video**: yükle / Assets'ten seç / Hareket Kütüphanesi'nden seç. Yüklenince süre ve limit kontrolü yapılır; 4 sn'den kısa ya da 30 sn'den uzun videoda uyarı + kırpıcı çıkar.
  - **Referans görseller**: element seçici + yükleme, en fazla 8, sürükleyerek sıralanabilir (sıra modele aynen gider).
  - Prompt (opsiyonel), çözünürlük (şemadan), fiyat, Generate.
- **Sağ sekmeler:** Geçmiş · Hareket Kütüphanesi · Stiller (sadece Restyle modunda).
- **Sonuç kartı:** kaynak ile sonucu karşılaştıran before/after slider'ı ve "Aynı kaynakla başka referans dene" butonu.
- Sayfa başlığında Higgsfield katalogundan gelen `banner_media` (motion-transfer ve object-swap için) sessiz loop olarak dursun. Bu dinamik bir asset; kaynağı 1.3.

#### 2.5 Hareket Kütüphanesi

Higgsfield'ın Motion Library'si public API'de yok (1.3'teki "Kullanılmayanlar"). Zyns'in kütüphanesi kullanıcının kendi klipleri ve Zyns üretimlerinden oluşur: `MotionClip { id, title, media: MediaRef, durationSec, tags[] }`. Assets'teki videolarda "Hareket klibi olarak kaydet" aksiyonu olsun.

#### 2.6 Kabul kriterleri

- İki native modda uçtan uca üretim çalışıyor. Form alanları ve limitler katalog şemasından geliyor.
- Higgsfield key'i yokken sayfa doğru durumu gösteriyor.
- Restyle motion-transfer ile çalışıyor; seçiciden başka bir video-edit modeli seçilince istek o modele gidiyor.
- Limit dışı videoda uyarı ve kırpma var. Before/after karşılaştırma ve "aynı kaynakla tekrar" çalışıyor.

---

### Bu faz bitince

- `docs/zyns-progress.md`'yi güncelle.
- Her görev ayrı commit.
- Preview deploy yap, kabul kriterlerini tek tek kontrol et ve sonucu Emir'e özetle (neler çalışıyor, neler eksik, spec'ten sapılan yerler ve nedeni).
- **Dur ve onay bekle.**  Emir onay vermeden sonraki faza geçme.

---

## Faz 3 — Studio (Cinema Studio karşılığı)

Faz 1'in altyapısı hazır olmalı; burada yeni istemci ya da katalog yazılmaz, Faz 1'dekiler kullanılır.


### Görevler

1. `/studio` sayfası ve menü girişi.
2. Ayar kartları ve modallar (Kamera, Film, Işık, Palet, Referanslar). Bütün seçenekler `higgsfield/cinema-studio/4.0` şemasından gelir.
3. `@` element referansları, alt satır ayarları, adet → kuyruk.
4. Gönderim öncesi şema doğrulaması.
5. (3b) Storyboard + devamlılık + birleştirme. **Bunu 1–4 onaylandıktan sonra, Emir ayrıca isterse yap.**

### Detaylar

#### 3.1 Higgsfield'da gözlem

- Composer: References · Film setup (Genre, Era, Tempo) · Camera (Setup: gövde/lens/diyafram tekerlekleri; Movement: önizlemeli grid) · Color palette · Lighting.
- Prompt'ta `@` ile karakter/mekan eklenebiliyor. Model, çözünürlük, en-boy, süre, ses ve adet seçilebiliyor.
- Projeler var.

#### 3.2 Endpoint (Higgsfield native)

`higgsfield/cinema-studio/4.0`. Bütün yönetmen kontrolleri bu modelin **gerçek parametreleri**, prompt'a gömülmüyor. Şemadaki alanlar (1 Ekim 2026):

| Alan | Tip | Not |
|---|---|---|
| `prompt` | string, zorunlu | |
| `duration` | int 4–30, vars. 5 | `ui:widget: range` |
| `resolution` | `480p` / `720p` | |
| `aspect_ratio` | 16:9, 4:3, 1:1, 3:4, 9:16, 21:9 | |
| `image_urls` | ≤30 | karakter/mekan/element görselleri |
| `video_urls` | ≤10 | video referans (fiyatlamayı değiştirir, bkz. llms.txt) |
| `audio_urls` | ≤10 | |
| `generate_audio` | bool, vars. true | |
| `camera_model` | enum | modern, 35mm-film, 8mm-film, dv-camcorder |
| `camera_lens` | enum | clean-sharp, anamorphic, vintage-anamorphic, warm-vintage, halation-vintage |
| `camera_aperture` | enum | f14-wide-open, f4-moderate, f11-deep-focus |
| `camera_movement` | enum, **tek değer** | 33 hareket (snorricam, dolly-zoom, bullet-time, whip-pan, crush-zoom, helicopter-shot…) |
| `genre` | enum | epic, drama, noir, comedy, horror, action |
| `era` | enum | 1960s, 1980s, 1990s, 2000s, 2020s |
| `pacing` | enum | chaotic, dynamic, calm, single-shot |
| `light` | enum | silhouette, practicals, window, overhead-fall, contre-jour, soft-cross |
| `color_palette` | enum | 50 isimli palet |

**Tablodaki listeler UI'a elle yazılmayacak.** Hepsi `input_schema`'dan okunur; Higgsfield seçenek eklerse Zyns'te de kendiliğinden görünür. `ui_schema`'daki `advanced: true` alanları üstteki ayar kartları, `advanced: false` alanları ise alt satır olur.

#### 3.3 Ekran

> Ek: `docs/zyns-studio-ref/STUDIO-UI.md` (Higgsfield ekranının ayrıntılı taraması). Emir'in kararı (2026-10-03): Zyns'in tasarım dili ve dizilimi korunur; ekten şimdilik sadece seçenek verisi (`data/cinema-studio-options.json`) alındı. Diğer maddeler Emir seçtikçe eklenecek.

- Üstte ayar kartları: **Kamera** (model + lens + diyafram + hareket), **Film** (genre + era + pacing), **Işık**, **Palet**, **Referanslar** (x/30).
- **Kamera modalı:** Setup sekmesinde üç sütun dikey "tekerlek" seçici (Otomatik + şemadaki enum'lar), Hareket sekmesinde grid. API tek hareket kabul ettiği için hareket seçimi **tekli**.
- **Seçenek önizlemeleri:** kamera hareketi, lens ve palet önizlemeleri public API'de yok. İlk sürümde kartlar metin + ikonla gösterilir. İstenirse sonra `scripts/render-cinema-previews.ts` her enum değeri için sabit bir sahneyle Cinema Studio'yu 480p/4 sn çalıştırıp Zyns'in kendi önizlemelerini üretebilir (maliyetli, isteğe bağlı; Emir onaylarsa).
- "Otomatik" seçili alanlar isteğe hiç eklenmez.
- Prompt'ta `@` → element seçici. Seçilen element görselleri `image_urls`'e eklenir (limit 30).
- Alt satır: süre slider'ı, çözünürlük, en-boy, ses toggle'ı, adet (1–4 → N ayrı istek; eşzamanlılık kuyruğundan geçer).
- Sol mini menü: Home · Projeler · Üretimlerim · Element'lerim · Favoriler.
- Başlık alanında katalogdaki `banner_media` ve `playground.initial_values.prompt` (boş composer'da placeholder örneği olarak) kullanılabilir.

#### 3.4 Çok çekimli sahne (3b — ayrı onayla)

- Storyboard: çekim kartları. Her kart kendi Cinema Studio parametrelerini tutar, element'ler ortaktır.
- Devamlılık: çekim N'in son karesi tarayıcıda videodan çıkarılır (canvas), çekim N+1'e `image_urls[0]` olarak eklenir.
- "Hepsini üret" sırayla çalışır, eşzamanlılık limitine uyar.
- Birleştirme ilk sürümde indirme listesi, sonra ffmpeg.wasm ile tek MP4.

#### 3.5 Kabul kriterleri

- Bütün seçenekler şemadan geliyor. Şemaya yeni bir enum değeri eklendiğinde (snapshot'ı değiştirerek test et) UI'da görünüyor.
- "Otomatik" alanlar istekte yok. Gönderilen gövde şemaya göre doğrulanıyor (ajv vb.).
- `@` element seçici ve referans limiti çalışıyor. Üretimler projeye kaydoluyor.

---

### Bu faz bitince

- `docs/zyns-progress.md`'yi güncelle.
- Her görev ayrı commit.
- Preview deploy yap, kabul kriterlerini tek tek kontrol et ve sonucu Emir'e özetle (neler çalışıyor, neler eksik, spec'ten sapılan yerler ve nedeni).
- **Dur ve onay bekle.**  Emir onay vermeden sonraki faza geçme.

---

## Faz 4 — Marketing (Marketing Studio karşılığı)

Faz 1'in altyapısı hazır olmalı; burada yeni istemci, katalog ya da recipe motoru yazılmaz, Faz 1'dekiler kullanılır.


### Görevler

1. `/marketing` sayfası ve menü girişi.
2. Preset kataloğu (API'den, sayfalı) + galeri + preset seçici modalı. Kategoriler Faz 0'da not edilen `type` değerlerinden.
3. Direkt ve preset modları; ürün/avatar slotları ve `image_urls` sırası.
4. Ürün Linki function'ı + "Ürün olarak kaydet".
5. Reklam Referansı.
6. Video recipe'leri: Product motion ve UGC sihirbazı (adım bazında model seçicilerle).


### Detaylar

#### 4.1 Higgsfield'da gözlem

- Composer: Image/Video, stil seçici (Product shot: Closeup, Faceless, Full body, Editorial, UGC, Studio white, Color pop, Natural…; Ads; Marketplace; Video: UGC, Motion), Avatar ve Product slotları.
- Şablon galerisi ve Ad Reference / Product Link araçları var.

#### 4.2 Görsel üretimi (Higgsfield native)

Model: `marketing-studio/image`. Katalogdaki varyantlar: `marketing-studio/image/flare` (GPT Image 2.5 Flare), `marketing-studio/image/sunburst` (GPT Image 2.5 Sunburst). Varyant composer'daki model seçiciden o an seçilir, son seçim hatırlanır.

İki mod (docs'tan):

1. **Direkt:** `prompt` + opsiyonel `image_urls` (verilirse düzenleme). `resolution` 1k/2k/4k, `aspect_ratio`, `quality`.
2. **Preset (enhanced):**
   - Gövde: `enhance_prompt: true` + `preset_id` + `image_urls[0]` = ürün, opsiyonel `image_urls[1]` = model/avatar referansı.
   - Avatar verilmezse görsel sadece ürün kompozisyonu olur; kişi otomatik üretilmez.
   - Maliyet direkt moda göre %10 fazla.

**Preset kataloğu dinamik:** `GET https://api.higgsfield.ai/marketing-studio/image/presets?size=50` (kullanıcının HF key'iyle, `cursor` ile sayfalama).

- Docs açıkça "preset UUID'lerini hardcode etme, statik enum yapma" diyor; presetler CMS'ten yönetiliyor.
- Docs bu ucun "görünür, kullanılabilir Ads preset'lerini" döndürdüğünü söylüyor. Katalogda aynı modele bağlı üç workflow var: Product shots, Graphic ads, Marketplace design. İlk iş Emir'in key'iyle çağırıp dönen `type` değerlerine bak. Product shot ve Marketplace preset'leri de geliyorsa galeri kategorileri `type`'tan kurulur; gelmiyorsa galeri sadece gelenleri gösterir, eksik kategori uydurulmaz.
- Proxy function üzerinden çek, kısa süreli cache'le (ör. 10 dk).
- Galeri kartı: `name`, `type` (kategori chip'i olur), önizleme (`media.url` → `cover_image.url` → `preview_url` → `image_url` sırasıyla).

#### 4.3 Ekran

- Composer: Image/Video toggle, prompt, **Preset seçici** (modal: sol tarafta API'den gelen `type`'lara göre kategoriler, sağda önizlemeli grid, arama), model varyantı, çözünürlük, en-boy, kalite, adet, **Ürün** ve **Avatar** slotları.
- Preset seçilince `enhance_prompt` otomatik açılır. Ürün slotu zorunlu hale gelir ve `image_urls` sırası UI'da açıkça gösterilir (1: ürün, 2: avatar).
- Galeri: preset kataloğunun tamamı, sonsuz kaydırma (`cursor`).
- Yan menü: Home · Üretimler · Favoriler · Ürünlerim (product element'leri) · Araçlar (Ürün Linki, Reklam Referansı) · Projeler.

#### 4.4 Video (UGC ve Motion şablonları)

Higgsfield public API'sinde Marketing Studio **video** endpoint'i yok. Video şablonları Recipe motoruyla yapılır; her adımın modeli composer'da o an seçilir (1.6):

- **Product motion** recipe: `frame` (capability `image-edit-multi`; Marketing Studio Image de bu listede çıkar) → `motion` (capability `image-to-video`).
- **UGC** recipe (sihirbaz, 4 adım, her adımın kendi model seçicisi var, her adım ayrı yeniden üretilebilir):
  1. Senaryo: kullanıcı yazar. Registry'de bir LLM varsa seçip taslak ürettirebilir; seçmezse adım elle yazılır.
  2. Ses: capability `text-to-speech`. Kullanıcı kendi kaydını da yükleyebilir; o zaman model seçimi gerekmez.
  3. Kare: avatar + ürün, capability `image-edit-multi` (Marketing Studio preset'i de seçilebilir).
  4. Konuşan video: capability `lipsync-from-audio`.

  Bu akış Emir'in mevcut UGC iş akışıyla aynı (aktör kimlik kartı → still → video); avatar slotu = karakter element'i.

#### 4.5 Ürün Linki

- Vercel function: URL'i çek. Shopify ise önce `<ürün-url>.json`'u dene, olmazsa HTML'deki `og:*` ve JSON-LD `Product` alanlarından `name`, `image[]`, `description`, `price` al.
- Önizlemede kullanıcı görselleri seçer, "Ürün olarak kaydet" = product element'i.
- Güvenlik: yalnızca http/https, özel IP aralıklarını engelle (SSRF), 8 sn zaman aşımı, rate limit.

#### 4.6 Reklam Referansı

Referans reklam görseli + ürün → `marketing-studio/image` **direkt modu**: `image_urls: [referans, ürün]`, prompt: "Recreate the composition, lighting and layout of image 1 with the product from image 2; leave text areas empty." Metinler sonradan eklenir. Uyarı: referansın kullanım hakkı kullanıcıda olmalı.

#### 4.7 Kabul kriterleri

- Preset kataloğu API'den geliyor, sayfalama çalışıyor. Hiçbir preset ID'si kodda yok.
- Direkt ve preset modunda üretim çalışıyor, ürün/avatar sırası doğru gidiyor.
- Ürün Linki ile ürün element'i oluşturulabiliyor.
- UGC sihirbazı uçtan uca çalışıyor; model seçilmemiş adımda "model seç" durumu çıkıyor, adım modeli değiştirilip sadece o adım yeniden üretilebiliyor.

---

### Bu faz bitince

- `docs/zyns-progress.md`'yi güncelle.
- Her görev ayrı commit.
- Preview deploy yap, kabul kriterlerini tek tek kontrol et ve sonucu Emir'e özetle (neler çalışıyor, neler eksik, spec'ten sapılan yerler ve nedeni).
- **Dur ve onay bekle.**  Emir onay vermeden sonraki faza geçme.

---

## Faz 5 — Effects

Faz 1'in altyapısı hazır olmalı; burada yeni istemci, katalog ya da recipe motoru yazılmaz, Faz 1'dekiler kullanılır.


### Görevler

1. `/effects` sayfası ve menü girişi: sol composer (recipe slot'larından otomatik form + Kare/Hareket model satırları), sağda katalog grid'i ve Geçmiş.
2. İlk 12–15 recipe JSON'u. Gizli prompt'ları Claude Code taslak olarak yazar, Emir onaylar. Efektin tek adımlı `fixedModel` olup olmayacağına Emir karar verir.
3. `scripts/render-recipe-previews.ts`: önizlemeleri Zyns'le üret. Önizleme üretiminde hangi modellerin kullanılacağını script çalıştırılmadan önce Emir'e sor.


### Detaylar

#### 5.1 Durum

Higgsfield'ın Effects kataloğu (~90 zincir preset) public API'de **yok** (1.3 "Kullanılmayanlar"). Zyns'te Effects kendi Recipe'lerimizle yapılır. Arayüz Higgsfield'daki gibi: sol composer (efekt kartı + slotlar + prompt toggle'ı + çözünürlük/en-boy), sağda katalog grid'i + geçmiş.

#### 5.2 Model seçimi

Her efekt tipik olarak 2 adım: `frame` (capability `image-edit-multi`) → `motion` (capability `image-to-video`). Efekt composer'ında slotların altında iki satır durur: **Kare modeli** ve **Hareket modeli**. Emir her üretimde istediğini seçer (1.6). Son seçim hem genel hem efekt bazında hatırlanır. Böylece bir efekt için Seedance, başka biri için Kling'de kalabilir.

Bir efekt tek adımlı da olabilir. Ör. hareket ağırlıklı efektler doğrudan `higgsfield/cinema-studio/4.0`'ın `camera_movement` parametresiyle yapılabilir; bu durumda step `fixedModel: 'higgsfield/cinema-studio/4.0'` taşır ve seçici gösterilmez. Hangi efektin böyle yazılacağına recipe yazılırken Emir karar verir.

#### 5.3 Ekran ve içerik

- Katalog grid: masonry, sessiz loop önizleme (sadece görünen kartlar oynar), arama, kategori chip'leri, favoriler. URL: `/effects?e=<id>`.
- İlk tarif seti: 12–15 adet, kendi isimlerimiz ve gizli prompt'larımızla. Önizlemeler `scripts/render-recipe-previews.ts` ile Zyns'te üretilir (480p, 3–5 sn, <2 MB).
- Kabul kriterleri: iki adımlı zincir çalışıyor; ara kare Assets'te; yenilemede devam ediyor; tek adım tekrar çalıştırılabiliyor; zorunlu slot boşken Generate pasif; model seçilmemiş adımda "model seç" durumu; kare ve hareket modeli her üretimde değiştirilebiliyor ve son seçim hatırlanıyor.

---

### Bu faz bitince

- `docs/zyns-progress.md`'yi güncelle.
- Her görev ayrı commit.
- Preview deploy yap, kabul kriterlerini tek tek kontrol et ve sonucu Emir'e özetle (neler çalışıyor, neler eksik, spec'ten sapılan yerler ve nedeni).
- **Dur ve onay bekle.**  Emir onay vermeden sonraki faza geçme.

---

## Emir'in karar vermesi gerekenler

- Menü isimleri: Remix / Studio / Marketing / Effects uygun mu?
- Cinema Studio seçenek önizlemelerini Zyns'le üretmek istiyor musun (her enum için bir üretim; maliyetli)?
- Registry'deki modellerin capability etiketleri: Claude Code, modellerin mevcut mod tanımlarından (i2v, edit, ref...) etiketleri çıkarıp bir liste halinde Emir'e onaya sunsun. Emin olmadığı modeli etiketlemesin.

Model seçimi bu listede yok, çünkü her üretimde composer'dan yapılıyor.

---

## Kaynaklar

- Higgsfield canlı arayüzü (Effects, Genjutsu, Cinema Studio, Marketing Studio) — 1 Ekim 2026'da incelendi
- Higgsfield katalog uçları (`dash.higgsfield.ai/api/v2/catalog-models/`, `/app-models/`, `/app-models/{id}/`) — 1 Ekim 2026'da test edildi, dokümante değil
- [Higgsfield API docs](https://docs.higgsfield.ai/docs) · [llms.txt dizini](https://docs.higgsfield.ai/docs/llms.txt)
- [Requests and lifecycle](https://docs.higgsfield.ai/docs/concepts/requests.md) · [Webhooks](https://docs.higgsfield.ai/docs/how-to/webhooks.md) · [File uploads](https://docs.higgsfield.ai/docs/concepts/file-uploads.md) · [Rate limits](https://docs.higgsfield.ai/docs/concepts/rate-limits.md)
- [Genjutsu Motion Transfer](https://docs.higgsfield.ai/docs/models/genjutsu/motion-transfer) · [model llms.txt](https://dash.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/llms.txt)
- [Genjutsu Object Swap llms.txt](https://dash.higgsfield.ai/models/higgsfield/genjutsu/object-swap/v1.0/llms.txt)
- [Cinema Studio 4.0 llms.txt](https://dash.higgsfield.ai/models/higgsfield/cinema-studio/4.0/llms.txt)
- [Marketing Studio Image llms.txt](https://dash.higgsfield.ai/models/marketing-studio/image/llms.txt)
- [Higgsfield API konsolu](https://open.higgsfield.ai/explore)
- [KIE docs](https://docs.kie.ai/) · [KIE file upload](https://docs.kie.ai/file-upload-api/quickstart)
