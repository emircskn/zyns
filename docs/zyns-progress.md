# Zyns ilerleme

Spec: `docs/zyns-spec.md`. Yeni bir oturumda önce bu dosyaya bak.

| Faz | Tarih | Durum | Notlar |
|---|---|---|---|
| Faz 0 — Keşif | 2026-09-30 | ☑ Bitti, **onaylandı** (2026-09-30) | `docs/architecture-notes.md` ve `docs/capabilities-draft.md` yazıldı. Proxy zaten var (Vercel route'ları); eksikler: `status_url`/`cancel_url`, Idempotency-Key, eşzamanlılık kuyruğu, `api/hf-catalog`, kalıcı depolama, wav dönüşümü. Katalog uçları 200 dönüyor. `marketing-studio/image/presets` API ucu key olmadığı için çağrılmadı; preset tipleri connector üzerinden okundu. Capability tablosunda 6 model boş (belirsiz), onaylı. Kararlar: depolama Cloudflare R2; standalone'da sunucu isteyen özellikler gizli; Zorvyn kapsam dışı; `text-to-video` capability'si yok (spec'teki liste aynen); capability mod bazında. |
| Faz 1 — Altyapı | 2026-10-01 | ☑ Bitti, **onay bekliyor** | 7 görev ayrı commit'lerle `zyns-main`'e gitti (canlı site). Kabul kriterleri sahte (mock) cevaplarla tarayıcıda test edildi; R2 kopyalama/okuma/KIE'ye verme canlıda gerçek dosyayla test edildi. Gerçek bir Higgsfield üretimi Emir'in key'i olmadan denenemedi. Sapmalar: preview deploy yerine canlı site (tek dal); test recipe'i `/lab` sayfasında; Gemini TTS ses seçimi istediği için recipe adımında ayarlardan doldurulmalı; Higgsfield'ın `ui:widget: hidden` alanları gizlenmedi (Zyns'in Kling Elements'i bozulmasın diye). Ayrıntı: `docs/architecture-notes.md` → "Faz 1 sonrası". |
| Faz 2 — Remix | | ☐ | |
| Faz 3 — Studio | | ☐ | |
| Faz 4 — Marketing | | ☐ | |
| Faz 5 — Effects | | ☐ | |
