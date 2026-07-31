# Design System

## Tasarım yönü

Premium, sıcak, güvenilir ve editoryal. Sıradan pazar yeri kalabalığı yerine sakin hiyerarşi, güçlü ürün fotoğrafı ve geniş boşluk kullanılır. Başlıklar Georgia tabanlı serif; arayüz metni sistem sans-serif’dir.

## Renk tokenları

| Token | Değer | Kullanım |
| --- | --- | --- |
| Warm ivory | `#F8F4EE` | Ana zemin |
| Deep plum | `#3D2038` | Başlık, güçlü yüzey |
| Terracotta | `#B85C45` | Birincil CTA |
| Sage | `#7F927D` | Başarı, yerellik |
| Muted gold | `#C89A53` | Focus ve küçük vurgu |
| Charcoal | `#242124` | Gövde metni |
| White | `#FFFFFF` | Kart ve kontrast yüzey |

CSS değişkenleri `app/globals.css` içindedir. Yeni renkler anlamsal gereksinim olmadan eklenmez.

## Ölçek

- Radius: 12 / 20 / 32 px.
- Dokunma hedefi: en az 44 px; ana CTA 48 px.
- Container: en çok 1180 px; mobil kenar boşluğu 12–16 px.
- Bölüm ritmi: masaüstü 88 px, mobil 64 px.

## Bileşen ilkeleri

- Birincil CTA terracotta, ikincil CTA beyaz/çizgili, koyu CTA plum.
- Kartlar ince çizgi ve ölçülü gölge kullanır.
- Form alanlarında görünür label veya erişilebilir ad zorunludur.
- Görseller anlamlı `alt` içerir; dekoratif avatarlar boş alt kullanabilir.
- Focus rengi muted gold ve 3 px görünür çerçevedir.
- `prefers-reduced-motion` tüm hareketleri neredeyse sıfırlar.

## Responsive davranış

Mobile-first dokunma alanları; 760 px altında tek kolon içerik, kaydırılabilir üretici kartları ve açılır filtre paneli. 1024 px altında navigasyon mobil menüye döner. İçerik hiçbir genişlikte viewport dışına taşmaz.
