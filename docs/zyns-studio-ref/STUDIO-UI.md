# Faz 3 eki — Studio arayüzü (Cinema Studio 4.0 birebir)

Bu dosya `docs/zyns-spec.md` içindeki **Faz 3**'ün ekidir. Faz 3 §3.3 "Ekran" bölümünün yerine geçer, diğer Faz 3 kuralları (Higgsfield native endpoint, şema doğrulaması, Auto = isteğe ekleme) aynen geçerli.

Kaynak: higgsfield.ai/generate (Cinema Studio 4.0 web arayüzü), 3 Ekim 2026'da Emir'in hesabıyla incelendi. Ölçüler ve renkler tarayıcıdaki computed style'lardan alındı.

Bu klasörde:

| Dosya | Ne |
|---|---|
| `STUDIO-UI.md` | Bu dosya |
| `cinema-studio-options.json` | Bütün seçeneklerin (kamera, lens, diyafram, 33 hareket, tür, dönem, tempo, ışık, 50 renk paleti) etiketleri, API değerleri, sıraları ve önizleme medyaları |
| `screens/*.png\|jpg` | 29 referans ekran görüntüsü. Dosya adları aşağıdaki bölümlerde geçiyor; tasarımı yaparken bunlara bak. |

> **Claude Code'a not:** Ekran görüntüleri görsel referans. Ölçü/renk çelişirse bu dosyadaki değerler geçerli. Higgsfield'a özgü promosyon içerikleri (hero'daki filmler, "Credits are running low" toast'u, Pricing, Community, Academy, AI Influencer sekmesi, Share/Publish) **taşınmayacak**.

---

## 1. Veri: `cinema-studio-options.json`

### 1.1 Neden snapshot

Higgsfield bu seçenekleri web uygulamasının iç ucundan çekiyor (`fnf-api-gw.higgsfield.ai/fnf/cinema-studio-4-0/creative-controls`). Bu uç API key'le değil, giriş yapılmış web oturumuyla çalışıyor; Zyns'ten canlı çekilemez. O yüzden veri bir kere tarayıcıdan dışa aktarıldı.

- Medyalar `cdn.higgsfield.ai` üzerinde **public**. 230 URL'in hepsi 3 Ekim'de 200 döndü.
- Dosyayı `data/cinema-studio-options.json` olarak repoya koy.
- Opsiyonel: `scripts/mirror-cinema-assets.ts` ile medyaları Zyns'in kendi deposuna (Vercel Blob vb.) kopyala ve JSON'daki URL'leri yeniden yaz. CDN'de bir dosya silinirse kırılmaz.

### 1.2 Yapı

```jsonc
{
  "video": {
    "camera_model":    [{ "label": "35mm Film", "value": "35mm-film", "auto": false, "priority": 71, "media": { "type": "image", "url": "…webp", "width": 1080, "height": 607 } }, …],
    "camera_lens":     [...],
    "camera_aperture": [...],
    "camera_movement": [{ "label": "Robot arm", "value": "robot-arm", "media": { "type": "video", "url": "…mp4", "poster": "…webp", "width": 600, "height": 338 } }, …],  // 33
    "genre":   [...],   // 6 + Auto ("General")
    "era":     [...],   // 5 + Auto
    "pacing":  [...],   // 4 + Auto
    "light":   [...]    // 6 + Auto
  },
  "color_palette": [{ "label": "Twilight Fable", "value": "twilight-fable", "background": "#764019", "hex": ["#040605", …12 renk], "image": "…webp" }, …],  // 50
  "image": { "camera": [...], "lens": [...], "focal_length": [...], "aperture": [...] },  // bkz. §4.6
  "composer_icons": { "film_setup": "…svg", "camera": "…svg", "color_palette": "…webp", "lighting": "…webp" }
}
```

- `value` = `higgsfield/cinema-studio/4.0` şemasındaki enum değeri. Hepsi şemayla birebir eşleştirildi, eksik ya da fazla yok.
- `auto: true` olan kaydın `value`'su `null`. Seçiliyse o parametre isteğe **hiç eklenmez**.
- Liste sırası = Higgsfield'daki sıra (priority büyükten küçüğe; Auto kayıtları gruplarına göre başta ya da sonda).

### 1.3 Şemayla birleştirme

Kaynak gerçeği hâlâ Faz 1'deki katalogdan gelen `input_schema`:

- Şemada olup JSON'da olmayan bir değer → metin-only kart olarak göster (etiket: slug'dan üret).
- JSON'da olup şemada olmayan değer → gösterme.
- Şemadaki limitler (duration min/max, image/video/audio maxItems, resolution ve aspect_ratio enum'ları) UI'ı belirler. Örnek: web arayüzü 1080p sunuyor ama API şeması sadece `480p`/`720p` kabul ediyor → Zyns sadece şemadakileri gösterir.

---

## 2. Tasarım token'ları

```css
:root {
  /* zemin */
  --bg-app: #0F1113;              /* html */
  --bg-panel: #131416;            /* sidebar ve ana panel */
  --panel-border: rgba(255,255,255,.05);
  --panel-radius: 16px;           /* paneller ekran kenarından 4px içeride */

  /* yüzeyler */
  --surface-1: #1C1E20;           /* composer kabı, dialog kabı */
  --surface-2: rgba(255,255,255,.05);  /* ayar kartı, prompt kutusu, chip, dialog sol nav */
  --surface-active: rgba(255,255,255,.10); /* aktif nav, Reset all butonu */
  --row-hover: #23262A;           /* popover satır vurgusu */
  --popover-bg: rgba(43,45,49,.75);  /* + backdrop-filter: blur(8px) */
  --popover-border: rgba(217,217,217,.04);

  /* metin */
  --text-1: #F7F7F8;
  --text-white: #FFFFFF;
  --text-2: #828282;              /* bölüm başlıkları, "Private" */
  --text-3: #898A8B;              /* pasif mod butonu, spec chip */
  --text-dim: rgba(255,255,255,.5);  /* pasif sekme */

  /* vurgu */
  --accent: #D1FE17;              /* lime: Generate, aktif değer, seçili check */
  --on-accent: #131517;
  --accent-soft: rgba(209,254,23,.14);
  --mention: #5B91FE;             /* prompt içi hareket/element chip metni */
  --mention-bg: rgba(91,145,254,.10);
}
```

**Fontlar** (Google Fonts):

- **Inter**: tüm UI.
- **Space Grotesk**: başlık ve Generate.
  - Hero başlığı 40/36, 700, uppercase. Rengi dikey gradient: `linear-gradient(#fff 14%, rgba(255,255,255,.41) 100%)` + `background-clip:text`.
  - Generate yazısı 12/18, 700, uppercase.
  - Rozetler (NEW/TOP) 10, 700, uppercase.
- **IBM Plex Mono**: ayar kartlarındaki küçük etiketler ("Film setup", "Camera"…), 10/14, 500. Rengi `linear-gradient(to top, rgba(255,255,255,.4), rgba(255,255,255,.1))` + text-clip.

**Köşe yarıçapları:** composer/dialog kabı 24 · iç kutu 20 · ayar kartı 16 · nav item ve model satırı 12 · grid kartı 10–12 · chip ve popover satırı 8 · mention chip 4 · pill butonlar 9999.

Hiçbir kartta sol kenar renkli vurgu şeridi yok; Zyns'te de olmayacak.

---

## 3. Sayfa düzeni

### 3.1 Kabuk (`screens/01-home-composer.jpg`)

- `--bg-app` zemin üzerinde iki panel. Sidebar 229px genişlik; ana panel ekranın geri kalanı. İkisi de `--bg-panel`, 1px `--panel-border`, radius 16, kenarlardan 4px boşluk.
- **Sidebar** üstten aşağı:
  - Uygulama seçici ("Cinema Studio" + chevron; Zyns'te "Studio") + sidebar daraltma butonu.
  - Nav: Home · My generations · My elements · My favorites. Item 36px, radius 12, padding 6 12 6 6, 24px renkli ikon karosu + 14/500 etiket. Aktifte `--surface-active` arka plan.
  - "Projects" bölümü: 12/500 `--text-2` başlık, sağda arama ve sıralama ikonları. Altında "New project" (soluk) ve proje listesi; her satırda 24px kapak küçük resmi. En altta "All projects ›".
  - En alt: kullanıcı satırı, üstünde 1px `--panel-border` ayraç.
- **Home içeriği:**
  - Hero: 3 kartlık 3D yığılmış carousel; ortadaki büyük ve önde, kenarları 2px açık çerçeveli, yanlar küçük ve geride, otomatik döner. **Zyns'te içerik:** Emir'in son Studio üretimleri (yoksa proje kapakları). Higgsfield'ın filmleri kullanılmaz.
  - Başlık "BRING YOUR STORIES TO LIFE" stili (Zyns metni kendi; ör. "DIRECT EVERY SHOT").
  - Composer (bkz. §4), ortalı, 800px.
  - "My projects ›": 3 sütun kart. İlki "Create new project" (ortada yuvarlak klasör+ ikonu). Diğerleri kapak görseli, altında başlık 14/500 + sağda kilit ikonlu "Private" 12 `--text-2`.

### 3.2 Üretimler ve proje sayfası

Bkz. `screens/25-generations-grid-hover.jpg`, `27-project-page.jpg`.

- Başlık satırı: sol başlık 14/600; sağda **Filter** ve **View** butonları. 32px yükseklik, radius 8, `--surface-2`.
- Grid kenardan kenara, 5 sütun, 2–4px boşluk. Zyns'in mevcut Assets düzeni bunu zaten yapıyor; onu kullan.
- Composer sayfanın altında ortalı **yüzer** halde durur (aynı bileşen). Kendi yüksekliği kadar alt padding bırak ki son satır görünsün.
- **Kart hover'ı:**
  - sol üstte seçim checkbox'ı
  - sağda dikey ikon yığını: beğen · indir · prompt'u kopyala · referans olarak kullan · daha fazla
  - video kartta ortada play ikonu
  - son açılan kartta ortada "👁 Last viewed" rozeti
- **Filter menüsü** (`29-filter-menu.png`):
  - Type: All types ›, All models ›, Date range ›, Status ›, Hide failed toggle
  - Activity: All / Generated / Uploaded / Liked / Downloaded
- **View menüsü** (`28-view-menu.png`): Layout Square / Masonry (check ile) + Card size slider.
- **Proje içi sidebar:** ‹ Back · proje adı + ⋮ menü · Project brief · Settings · Elements · Folders (All assets + adet, + Add folder) · Trash.
  - Canvas/Chat/AI Director/Share/Publish kapsam dışı.
  - Başlıktaki "Upload" kalsın.

### 3.3 Detay görüntüleyici (`screens/26-detail-view.jpg`)

- Tam ekran. Arka plan medyanın büyük bulanık kopyası. Solda medya ortalı; altında küçük "prompt göster" ve "tam ekran" ikonları.
- Sağda 336px panel (`--surface-1`, radius 16):
  - Üst: avatar + kullanıcı adı + "Author", sağda ✕.
  - Sekmeler: Info · Edit · Comments. Zyns'te sadece **Info**.
  - **PROMPT** bloğu: referans küçük resimleri (64px, radius 8) + prompt metni (14/600), "See all ˅" ile açılır, sağ üstte "Copy".
  - **DETAILS** bloğu:
    - Model, Quality/Resolution, Size, Duration, Created
    - Zyns ek olarak Studio ayarlarını da yazsın: Genre, Era, Tempo, Camera, Lens, Aperture, Movement, Light, Palette
  - Aksiyonlar:
    - tam genişlik lime **"Turn to video"** (görselde; videoyu Studio video moduna referans olarak taşır)
    - **Recreate** (bütün ayarları composer'a geri yükler) + **Reference** (referanslara ekler)
    - **Download** + beğen + daha fazla

---

## 4. Composer

### 4.1 Video modu anatomisi (`screens/02-composer-zoom.png`, `03-setting-cards-selected.png`)

```
┌─────┐ ┌──────────────────────────────────────────────────────────────────────────────┐
│ img │ │ [+ References 0/50] [▣ Film setup Auto] [◉ Camera Auto] [▨ Color palette Auto] [▣ Lighting Auto] │
│     │ │ ┌──────────────────────────────────────────────────────────┐ ┌──────────┐     │
│ VID │ │ │ Describe your scene - use @ to add characters & locations│ │ GENERATE │     │
│     │ │ │ [+][@][⌗] [◈ Cinema Studio 4.0 ›][◇ 720p][▭ 16:9][◷ 5s][🔊 On][− 1/4 +]│ │  ✦ 60    │     │
└─────┘ │ └──────────────────────────────────────────────────────────┘ └──────────┘     │
        └──────────────────────────────────────────────────────────────────────────────┘
```

- **Mod anahtarı** (solda, ayrı kap):
  - Kap 72×116, `--surface-1`, radius 24, padding 4.
  - İçinde iki buton 64×52, radius 20, üstte ikon, altta etiket 10/12 700: Image / Video.
  - Aktif buton biraz açık zemin + beyaz metin; pasif `--text-3`.
  - Composer'ın altına hizalı durur.
- **Ana kap:** 800 genişlik, `--surface-1`, radius 24, padding 4, gap 4.
- **Satır 1 — ayar kartları** (5 adet, eşit genişlik, yükseklik 48):
  - Kart: `--surface-2`, radius 16, padding 8 12 8 8, gap 8.
  - Kart içi: solda 32–40px görsel, sağda iki satır. Üst satır mono etiket (§2), alt satır değer (Inter 14/20 500, letter-spacing .1px).
  - Görseller:
    - **References:** 26px kare "+" (radius 5, `--surface-2`), değer "x/50". 50 = şemadaki `image_urls` 30 + `video_urls` 10 + `audio_urls` 10.
    - **Film setup:** `composer_icons.film_setup` (animasyonlu film makarası svg). Değer: seçili genre etiketi, yoksa era/tempo, hiçbiri yoksa "Auto". Birden fazla seçiliyse "Epic +2" gibi.
    - **Camera:** `composer_icons.camera`. Değer: seçili kamera > lens > diyafram etiketi, ya da "Auto".
    - **Color palette:** seçili paletin görseli (32×24, radius 4). Seçim yoksa `composer_icons.color_palette`.
    - **Lighting:** seçili ışığın poster'ı. Seçim yoksa `composer_icons.lighting`.
- **Satır 2 — prompt kutusu:** `--surface-2`, radius 20, padding 12, gap 12.
  - Üstte contenteditable prompt, 14/20, min 2 satır; uzayınca kendi içinde scroll eder (max ~10 satır).
  - Altta araç satırı. Chip'ler 28px yükseklik, radius 8, `--surface-2`, 12/16 500, ikon + metin, gap 4:
    - `+` (referans ekle → References picker)
    - `@` (element ekle → picker'ın Elements sekmesi)
    - `⌗` (kare/son kare yakala → referanslara ekler; opsiyonel)
    - ayraç
    - **model chip**: lime ikon + "Cinema Studio 4.0" 12/600 + ›
    - çözünürlük, en-boy, süre, ses (On/Off toggle)
    - **adet stepper** (− 1/4 +)
- **Generate:**
  - 128×80, `--accent` zemin, `--on-accent` metin, radius 12.
  - Gölge katmanlı ve sağ alta düşüyor: `10px 34px 24px rgba(0,0,0,.15), 8px 21px 6px rgba(0,0,0,.01), 3px 8px 12px rgba(0,0,0,.25)` (son katman yaklaşık).
  - "GENERATE" (Space Grotesk 12/18 700) + altında maliyet: ✦ ikon + tutar. İndirim varsa eski tutar üstü çizili.
  - Maliyet Faz 1'deki katalog fiyatından hesaplanır (Cinema Studio token formülü llms.txt'de).
  - Prompt boşsa ya da istek geçersizse pasif (opacity .5).

### 4.2 Popover'lar

Görseller: `19-model-dropdown.jpg`, `20-resolution-popover.png`, `21-aspect-popover.jpg`, `22-duration-popover.jpg`.

- **Ortak:** `--popover-bg` + blur(8px), 1px `--popover-border`, radius 16, padding 8. Satırlar 36–40px, radius 8, hover'da `--row-hover`, seçilide sağda lime ✓.
- **Model dropdown** (400px):
  - üstte arama kutusu
  - gruplar ("Cinematic models", "Featured models") ✦ ikonlu 12/500 başlıkla
  - satır 52px, radius 12: 40px ikon karosu + ad (14/600) + açıklama (12, `--text-2`) **ya da** spec chip'leri (10/14 500, `--text-3`, küçük kutu: "1080p", "4s-30s")
  - rozetler: NEW = lime zemin; TOP = mavi gradient `90deg #3259B4 → #3C8CFF → #00C8D2 → #78C9E6`, radius 4
  - seçili satır `--surface-2` + ✓
  - **Zyns'te liste:** Studio'da kullanılabilen video modelleri (Cinema Studio 4.0 başta). Başka model seçilirse ayar kartlarının API karşılığı yok; o durumda kartlar Faz 1'deki `compileCinemaPrompt` ile prompt'a derlenir ve kartlarda küçük "prompt'a eklenecek" ipucu gösterilir.
- **Çözünürlük / en-boy:**
  - basit liste
  - en-boyda her satırın solunda oranına göre çizilmiş küçük dikdörtgen ikon
  - değerler şemadan
- **Süre:** "Duration" başlığı + yatay slider. Dolgu çubuğu, içinde değer ("5s"). Min/max şemadan (4–30).

### 4.3 Prompt içi token'lar

Görseller: `12-movement-chip-in-prompt.jpg`, `13-hash-popover.jpg`.

- **`#` → hareket seçici popover'ı:**
  - 220px genişlik, satır 48px
  - satırda 32px poster + ad 14/600
  - ilk satır vurgulu; ok tuşlarıyla gezinilir, Enter ile seçilir, Esc ile kapanır
  - yazdıkça filtreler
- **`@` → element seçici:** aynı görünüm, element kapakları ile.
- **Chip görünümü:** inline, atomik (tek Backspace ile silinir), `--mention-bg` zemin, `--mention` metin, radius 4, padding 0 2. Hareket chip'inde solda küçük video ikonu, element chip'inde element kapağı.
- **API eşlemesi:**
  - Hareket chip'i → `camera_movement` parametresi. Chip metni prompt'tan çıkarılarak gönderilir.
  - **Cinema Studio 4.0 tek hareket kabul ediyor.** Higgsfield web'i birden fazla hareket chip'ine izin veriyor. Zyns'te ikinci hareket eklenince eskisi yenisiyle değişsin; kısa bir toast göstersin ("Bu model çekim başına tek kamera hareketi alıyor").
  - Element chip'i → element görselleri `image_urls`'e eklenir (limit 30), notları prompt'a eklenir.

### 4.4 Docked hali

Üretimler ve proje sayfalarında aynı composer altta yüzer. Prompt'a odaklanınca kutu yukarı doğru büyür (`screens/25-…` uzun prompt örneği). Odak kaybolunca 2 satıra iner.

### 4.5 Durum kalıcılığı

Composer state'i (mod, prompt, chip'ler, tüm ayarlar, referanslar, model, çözünürlük, en-boy, süre, ses, adet) sayfalar arasında korunur ve localStorage'a yazılır. Higgsfield de bunu yapıyor: başka sayfaya geçince ayarlar kaybolmuyor.

### 4.6 Image modu (`screens/23-image-mode-composer.jpg`, `24-image-mode-camera.jpg`)

- Düzen farklı:
  - ayar kartı satırı yok
  - solda prompt kutusu ve altında chip'ler: + · model · en-boy · kalite · › (taşma kaydırması)
  - sağda iki kare karo (88×80, radius 16):
    - **CHARACTER**: + ile karakter element'i seç
    - **Kamera karosu**: seçili kamera görseli + "Kamera adı / Lens adı"
  - en sağda Generate
- Kamera karosu küçük bir dialog açar: "Set up camera" + Reset. İki sütun CAMERA / LENS (video modundaki tekerlek pill'leri).
- Higgsfield image modunda kendi "Soul Cinema" modelini kullanıyor; bu model public API'de yok. Zyns'te:
  - model registry'deki görsel modellerinden composer'da seçilir
  - kamera/lens seçimi prompt'a derlenir (Faz 1 `compileCinemaPrompt`)
  - kamera ve lens listesi için `video.camera_model` / `video.camera_lens` kullan (Higgsfield web'i de aynı listeyi gösteriyor)
- JSON'daki `image` bloğu (Modular 8K Digital, 70s Cinema Prime, 8/14/35/50mm vb.) eski image kamera ayarları. İstersen image modunda ikinci bir "Gelişmiş" sekmesi olarak kullanılabilir. Zorunlu değil.

---

## 5. Dialog'lar

### 5.1 Ortak kabuk (`screens/09-camera-setup.jpg`)

- Overlay koyu (~%60 siyah), sayfa arkada soluk.
- Kap 800×504, `--surface-1`, radius 24, padding 4.
- **Başlık satırı** (40px):
  - solda başlık 16/600
  - sağda **Reset all** (pill, `--surface-active`, 14/600) + ✕ (32px yuvarlak)
- **Gövde:** radius 20, kabın biraz daha açık tonu.
  - Solda 184px nav (`--surface-2`, padding 12); item 36px, radius 12, ikon + 14/500; aktifte `--surface-active`.
  - Nav item'ın alt ayarı Auto dışında bir değerdeyse sağda 6px lime nokta (`06-film-setup-genre-selected.jpg`).
- **İçerik başlığı:** 14/600 başlık + altında 12 `--text-2` açıklama. Sağ üstte gerekiyorsa "⇅ Sort by" + 🔍.
- Seçim anında state'e yazılır (ayrı "Uygula" butonu yok). ✕ ve Esc kapatır.

### 5.2 Film setup

Görseller: `05-film-setup-genre.jpg`, `06-…-selected.jpg`, `07-film-setup-era.jpg`, `08-film-setup-tempo.jpg`.

Nav: Genre · Era · Tempo.

- **Genre** ("Select genre" / "Story conventions the model should follow"):
  - **Yay (dial) carousel.** İçerik alanının üst yarısında büyük bir yay; ortada seçili kart (≈316×176, radius 24, 2px beyaz/30 çerçeve) seçeneğin videosunu loop oynatır.
  - Komşu kartlar yay üzerinde iki yanda, ~45° döndürülmüş, kısmen görünür.
  - Altta: ‹ yuvarlak buton (32px) · etiket pill'i (`--surface-active`, 14/600) · › buton.
  - Ok tuşları, sürükleme ve yan kartlara tıklama ile döner.
  - Liste sırası JSON'daki gibi; Auto'nun etiketi "General".
- **Era** ("Select era" / "The period the film belongs to"):
  - Üstte ortalı 16:9 önizleme (radius 16, video loop).
  - Altında **cetvel slider:** yatay çizgi tikleri, ortada lime dikey gösterge.
  - Altında etiketler: seçili olan büyük lime (24/700), komşular `--text-2`, aralarında ‹ › butonları.
  - Sıra: 2020s · … · Auto · … · 1960s. Auto ortada; sola ve sağa kaydırınca dönemler.
- **Tempo** ("Select tempo" / "Pacing of the montage"):
  - Yatay carousel: ortada büyük kart, yanlarda küçültülmüş ve soluk komşu kartlar.
  - Altta ‹ etiket ›.

### 5.3 Camera

Görseller: `09-camera-setup.jpg`, `10-camera-movement.jpg`, `11-movement-hover.png`.

Nav: Setup · Movement.

- **Setup:**
  - Üç sütun: CAMERA · LENS · APERTURE. Başlıklar 11/600 uppercase, `--text-2`, harf aralıklı. Orta sütunun zemini hafif açık (white/3).
  - Her sütun dikey **tekerlek**: snap-scroll; ortadaki eleman seçili. Üstte ˄, altta ˅ butonları; tekerlek ve klavye ile de döner.
  - **Pill:** dış 156×100 stadyum (radius 9999); iç 144×88, `rgba(0,0,0,.25)`.
    - Seçilide 2px beyaz çerçeve ve opacity 1; diğerleri opacity .6.
    - İçerik: seçeneğin görseli (ürün render'ı, ~64px yükseklik, ortalı) + etiket 12/600.
    - Auto pill'inde görsel yerine basit kamera/lens/diyafram ikonu.
  - Görseller `video.camera_model/camera_lens/camera_aperture[].media.url`.
- **Movement:**
  - Başlık "Direct a camera move". Açıklama Zyns'te: "Adds to the prompt box, or type # there. One per shot."
  - Sağda Sort by + arama.
  - **4 sütun grid:**
    - karo kare (≈134px), radius 12, poster (`media.poster`), altında etiket 12/600 ortalı
    - hover'da videosu oynar (`media.url`, muted loop) ve altta lime **"Put on prompt"** pill butonu çıkar
    - tıklayınca prompt'a hareket chip'i eklenir ve dialog kapanır (§4.3)
  - Görünmeyen karolarda video yüklenmesin; poster yeter (IntersectionObserver).

### 5.4 Color palette (`screens/17-color-palette.jpg`)

- Başlık "Set up color palette" / "Palette the color grade should follow" + Sort by + arama.
- 4 sütun grid. Kart ≈181×100, radius 12:
  - üstte paletin görseli (`image`)
  - görselin alt ~%20'sini kaplayan **renk şeridi**: `hex` dizisindeki 12 renk eşit genişlikte yan yana
  - altında etiket 13/500; seçili beyaz, diğerleri `--text-2`
- Liste 50 öğe, sonsuz kaydırma gerekmez (hepsi JSON'da).
- Higgsfield'daki "New palette" (özel palet) karosu **olmayacak**; API özel palet kabul etmiyor.
- Seçili kartın etrafında 2px beyaz çerçeve. Tekrar tıklayınca seçim kalkar (Auto).

### 5.5 Lighting (`screens/18-lighting.jpg`)

- Başlık "Set up lighting" / "Pick a scheme or place your own lights" + Sort by + arama.
- 3 sütun grid, kart ≈237×133, radius 12: poster, hover'da video, altında etiket 13/600.
- İlk kart Auto. "New lighting preset" karosu **olmayacak**.

### 5.6 References picker

Görseller: `04-references-picker.jpg`, `14-elements-tab.jpg`, `15-new-element.jpg`, `16-element-category.png`.

- Büyük dialog 960×598.
- Üstte sekme pill'leri: **Uploads · Elements · Generations · Liked**.
  - Aktif sekme beyaz zemin + koyu metin; pasifler `--text-dim`, 12/500, radius 9999.
  - "AI Influencer" sekmesi alınmayacak.
- Uploads/Generations/Liked altında filtre satırı: Recent · All · Images · Videos · Audio + sağda Sort by.
- **6 sütun kare grid** (144px, radius 10):
  - medya `object-fit: contain`, koyu zemin
  - ilk karo **Upload media**: 1px kesikli white/10 çerçeve, ortada yuvarlak bulut ikonu
  - hover'da sol üst checkbox, sağ üst büyüt ve sil ikonları
  - çoklu seçim
- Seçim referanslara eklenir. Limitler şemadan (görsel 30, video 10, ses 10); aşılınca karolar pasifleşir ve sayaç gösterilir.
- **Elements sekmesi:**
  - sol kategori listesi: All · Characters · Locations · Props
  - üstte "My Elements ˅" seçici, Filter, arama
  - ilk karo **New element**
- **New element dialog'u:**
  - solda büyük sürükle-bırak alanı ("Drop image or video here to add to element")
  - sağda form:
    - Category: Auto / Character / Location / Prop
    - Name ("The display name, e.g. Cal, Oli, Elena")
    - Version (ör. v1)
    - Element ID ("@" önekli handle, ör. char_oli_v1)
    - Description
    - Status
    - Custom properties (+ Add custom property)
  - Cancel / Create
- **Zyns Element modeline eklenecek alanlar:** `handle` (prompt'taki @adı), `version`, `description`, `status`, `customProps: Record<string,string>`. Kategori eşlemesi: Prop → `product`.

---

## 6. İstek eşlemesi (composer → `higgsfield/cinema-studio/4.0`)

| Composer | API alanı | Not |
|---|---|---|
| prompt metni (chip'ler çıkarılmış) | `prompt` | element notları sona eklenir |
| hareket chip'i | `camera_movement` | tek değer |
| Camera › Setup | `camera_model`, `camera_lens`, `camera_aperture` | Auto → gönderme |
| Film setup | `genre`, `era`, `pacing` | Auto → gönderme |
| Color palette | `color_palette` | |
| Lighting | `light` | |
| References (görsel) + @element görselleri | `image_urls` | sıra korunur, max 30 |
| References (video) | `video_urls` | max 10; fiyatı değiştirir |
| References (ses) | `audio_urls` | max 10 |
| süre | `duration` | 4–30 |
| çözünürlük | `resolution` | şemadaki enum |
| en-boy | `aspect_ratio` | |
| ses On/Off | `generate_audio` | |
| adet 1–4 | — | N ayrı istek, Faz 1 kuyruğundan |

Gönderimden önce gövde şemaya göre doğrulanır (Faz 3 kuralı).

---

## 7. Kabul kriterleri

- Composer video modu ekran görüntüsüyle (`02-composer-zoom.png`) yan yana konduğunda düzen, ölçü ve renkler aynı.
- 5 ayar kartı seçime göre görsel ve değer değiştiriyor; Auto'ya dönünce varsayılan ikon geri geliyor.
- Film setup:
  - Genre yay carousel'i, Era cetvel slider'ı, Tempo carousel'i çalışıyor
  - seçili alt ayar için nav'da lime nokta görünüyor
- Camera Setup tekerlekleri snap ile seçiyor. Movement karoları hover'da video oynatıyor; "Put on prompt" chip ekliyor; ikinci hareket ilkinin yerine geçiyor.
- `#` ve `@` popover'ları klavyeyle kullanılabiliyor; chip'ler atomik siliniyor.
- Color palette kartlarında renk şeridi `hex` verisinden çiziliyor (görsel değil).
- References picker'da limitler uygulanıyor; New element formu Element kaydı oluşturuyor.
- Gönderilen istek gövdesi §6'ya uyuyor; Auto alanlar gövdede yok.
- Composer state'i sayfa değişince ve yenileyince korunuyor.
- Higgsfield'a özgü promosyon/kredi/topluluk öğeleri yok.
