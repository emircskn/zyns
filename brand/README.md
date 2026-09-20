# ZYNS · marka

Logo ve wordmark, verilen Canva dosyalarından **vektör olarak** yeniden
kuruldu: yazı tipi League Spartan Bold, ama harfler metin değil, path.
Böylece webfont gerekmiyor ve hiçbir yerde kayma/yeniden akış olmuyor.

Yeniden kurulan çizim referans render ile karşılaştırıldı; fark **%0.39**
(yalnızca kenar yumuşatma).

## Dosyalar

| Dosya | Nerede |
| --- | --- |
| `zyns-mark-dark.svg` | İşaret, koyu zeminler |
| `zyns-mark-light.svg` | İşaret, açık zeminler |
| `zyns-wordmark-dark.svg` | Wordmark, koyu zeminler |
| `zyns-wordmark-light.svg` | Wordmark, açık zeminler |
| `zyns-icon.svg` | Favicon / uygulama ikonu |

Uygulamanın içinde ikisi de bu dosyalardan değil,
`src/components/Logo.tsx` üzerinden çiziliyor.

## Renk

Çizim tek renk. Uygulamada sabit renk yerine token kullanılıyor: karo
`var(--t1)`, harf `var(--canvas)`. Koyu temada bu krem karo + siyah Z
demek — orijinalin siyah karosu neredeyse siyah olan zeminde kaybolurdu —
açık temada ise doğrudan orijinaline, siyah karo + krem harfe dönüyor.

| Token | Koyu | Açık |
| --- | --- | --- |
| `--t1` | `#f5efe6` | `#1a1613` |
| `--canvas` | `#0a0908` | `#f7f3ec` |

## Oranlar

İşaret 100×100 kutuda: köşe yarıçapı `7.5`, harf kutusu `%11.47 / %15.18`
konumunda, nokta `%76.89 / %70.94` konumunda `13.13 × 14`.

Wordmark ink kutusu `1801.94 × 788` (oran **2.2867**), y'nin alt uzantısı
dahil; harflerin kendisi bunun %67'si. Harfler üst üste binecek kadar
sıkıştırılmış — bu yüzden metin değil, path: hiçbir `letter-spacing`
değeri bu örtüşmeyi vermiyor.

Kilitli düzen: işaret ve wordmark yan yana, wordmark yüksekliği işaretin
`0.84` katı, aradaki boşluk `8px` (24px işaret için).
