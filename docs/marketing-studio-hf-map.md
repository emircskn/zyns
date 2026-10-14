# Higgsfield Marketing Studio → ZYNS (API ile ne mümkün)

İnceleme 2026-10-14. Kaynaklar: Emir'in hesabına bağlı Higgsfield bağlantısı (sadece okuma: model şemaları, şablon kataloğu) ve Higgsfield'in herkese açık API kataloğu (`dash.higgsfield.ai/api/v2/app-models`, `catalog-models`).

## Web'de olan

- **Image modeli:** "Marketing Studio Product Shot" (`marketing_studio_2_image`). Tür: product_shots, product_shots_people, poster, ads, marketplace. Stil (`style_id`, v2 kataloğu) ya da şablon (`preset_id`). Notlar, "kişi ekle", brand kit, ürün/avatar kayıtları.
- **Video modeli:** "Marketing Studio Video" (`marketing_studio_v2_video`). Türler: ugc, ugc_v2/video_mode, hypermotion, 2d_motion, mixed_media, saas_motion, product_link, ad_reference, app_video. Süre 4–30 sn, 480p/720p/1080p, ses, hook ve setting listeleri, avatar ve ürün kimlikleri.
- **Şablon akışı (Explore templates):** v2 kataloğu, 649 şablon (product_shots, product_shots_people, hypermotion, mixed_media, 2d_motion, saas_motion…), görsel ve video önizlemeli.
- **Araçlar:** Product Link (sayfadan ürün çıkarır), Ad Reference (reklamı analiz edip yeniden kurar), brand kit, App video.

## Bizim API anahtarıyla olan

- `marketing-studio/image` (2.0 Alpha), `/flare` (2.5), `/sunburst` (2.5). Alanlar: prompt, image_urls (en çok 16), preset_id + enhance_prompt (1–2 görsel: önce ürün, sonra kişi), quality, resolution (1k/2k/4k), aspect_ratio, moderation.
- Preset listesi: `GET /marketing-studio/image/presets` (anahtarla; ZYNS şu an bunu gösteriyor). Web v2 şablon kimlikleriyle aynı değil.
- Higgsfield'in kendi API iş akışları: **Product shots**, **Graphic ads**, **Marketplace design**. Üçü de `marketing-studio/image` + bir preset + enhance_prompt=true. Yani web'deki Product shot / Ads / Marketplace kategorileri API'de presetlerle var.
- `higgsfield/ads-studio/v1.0` (Ads Studio): niche, prompt, language, target_audience, image_urls, aspect_ratio, batch_size. ZYNS kataloğunda var.
- **Yok:** v2 stilleri (`style_id`), v2 şablon akışı, Marketing Studio Video, hook/setting, brand kit, Product Link ve Ad Reference uç noktaları, avatar/ürün kayıtları.

## Eşleme

| Web | ZYNS'te |
|---|---|
| Image + Choose style | marketing-studio/image + bizim prompt stillerimiz (yapıldı) |
| Explore templates (görsel) | API presetleri; türlerine göre kategoriler (yapıldı) |
| Product shot / Ads / Marketplace | API presetlerinin türleri; Higgsfield'in kendi iş akışlarıyla aynı yol |
| Avatar / Product | Elements'teki karakter ve ürün görselleri → image_urls (1. ürün, 2. kişi) |
| Brand kit | Yok; istenirse bizde marka bilgisi prompt'a eklenebilir |
| Product Link | Bizim sunucumuz sayfayı okur → ürün (yapıldı) |
| Ad Reference (görsel) | Reklam + ürün görseli + prompt (yapıldı) |
| Video (UGC, Hypermotion, Motion…) | API'de yok. Tariflerle başka video modelleri (Kling, Seedance, Veo…); stiller prompt + gerektiğinde referans video olarak |
| Ads Studio | API'de var, eklenebilir |

## Image templates (checked on Higgsfield)
- A template's `type` decides its inputs: `product_shots` = product only; `product_shots_people` = product + avatar. Product is required, prompt ("Describe your result") is optional.
- With a template, extra reference pictures are not sent, so the bar hides "+"; on `product_shots` it also hides the Avatar tile.
