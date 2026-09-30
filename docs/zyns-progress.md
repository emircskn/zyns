# Zyns ilerleme

Spec: `docs/zyns-spec.md`. Yeni bir oturumda önce bu dosyaya bak.

| Faz | Tarih | Durum | Notlar |
|---|---|---|---|
| Faz 0 — Keşif | 2026-09-30 | ☑ Bitti, **onaylandı** (2026-09-30) | `docs/architecture-notes.md` ve `docs/capabilities-draft.md` yazıldı. Proxy zaten var (Vercel route'ları); eksikler: `status_url`/`cancel_url`, Idempotency-Key, eşzamanlılık kuyruğu, `api/hf-catalog`, kalıcı depolama, wav dönüşümü. Katalog uçları 200 dönüyor. `marketing-studio/image/presets` API ucu key olmadığı için çağrılmadı; preset tipleri connector üzerinden okundu. Capability tablosunda 6 model boş (belirsiz), onaylı. Kararlar: depolama Cloudflare R2; standalone'da sunucu isteyen özellikler gizli; Zorvyn kapsam dışı; `text-to-video` capability'si yok (spec'teki liste aynen); capability mod bazında. |
| Faz 1 — Altyapı | | ☐ | Başlamak için Emir'in "Faz 1'i yap" demesi bekleniyor. |
| Faz 2 — Remix | | ☐ | |
| Faz 3 — Studio | | ☐ | |
| Faz 4 — Marketing | | ☐ | |
| Faz 5 — Effects | | ☐ | |
