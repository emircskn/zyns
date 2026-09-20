# ZYNS · marka

Marka, uygulamanın kendi renk token'larının dışına çıkmıyor — ayrı bir marka
paleti yok, logo temanın renklerini kullanıyor.

## İşaret

Z'nin yatay barları metin rengini, çapraz kolu vurgu rengini taşıyor. Bu
çapraz, prompt kutusunun kenarında dönen amber huzmeyle aynı rengi paylaşıyor.

| Dosya | Nerede |
| --- | --- |
| `zyns-mark-dark.svg` | Koyu zeminler |
| `zyns-mark-light.svg` | Açık zeminler |
| `zyns-icon.svg` | Favicon / uygulama ikonu — çıplak işaret açık sekme şeridinde kaybolduğu için burada amber dolu karo kullanılıyor |

Uygulamanın içinde işaret bu dosyalardan değil, `src/components/Logo.tsx`
üzerinden çiziliyor: barlar `currentColor`, çapraz `var(--accent)`. Böylece
tema değişince ikinci bir dosyaya gerek kalmadan kendiliğinden dönüyor.

## Renkler

| Token | Koyu | Açık |
| --- | --- | --- |
| `--t1` (barlar) | `#f5efe6` | `#1a1613` |
| `--accent` (çapraz) | `#f2a33a` | `#c9821f` |
| `--canvas` (zemin) | `#0a0908` | `#f7f3ec` |

## Yazı

Wordmark Geist, 600 ağırlık, `0.14em` harf aralığı — tamamı büyük harf.
İşaretle arasındaki boşluk işaretin yüksekliğinin yaklaşık onda biri.
