import type { FaqCategory, FaqItem } from "./types";

export const faqCategoryLabels: Record<FaqCategory, { tr: string; en: string }> = {
  account: { tr: "Hesap", en: "Account" },
  producer: { tr: "Üretici başvurusu", en: "Maker application" },
  catalog: { tr: "Ürünler ve favoriler", en: "Products and favorites" },
  delivery: { tr: "Talep ve teslimat", en: "Requests and delivery" },
  privacy: { tr: "Gizlilik ve güvenlik", en: "Privacy and safety" },
  assistant: { tr: "FEMORIA Asistanı", en: "FEMORIA Assistant" },
};

export const faqItems = [
  {
    id: "create-account",
    category: "account",
    question: { tr: "Nasıl hesap oluşturabilirim?", en: "How do I create an account?" },
    answer: { tr: "Kayıt sayfasında ad, e-posta ve şifrenizi girerek tek bir standart FEMORIA hesabı oluşturabilirsiniz. Aynı hesapla alışveriş yapabilir ve dilediğiniz zaman üretici başvurusu gönderebilirsiniz.", en: "Enter your name, email, and password to create one standard FEMORIA account. You can shop and apply to become a maker later with the same account." },
  },
  {
    id: "email-verification",
    category: "account",
    question: { tr: "E-posta doğrulaması neden gerekli?", en: "Why is email verification needed?" },
    answer: { tr: "E-posta doğrulaması hesabın size ait olduğunu kontrol etmeye yardımcı olur. Doğrulama mesajının ulaşması e-posta sağlayıcınıza bağlı olabilir.", en: "Email verification helps confirm that the account belongs to you. Delivery of the message may depend on your email provider." },
  },
  {
    id: "forgot-password",
    category: "account",
    question: { tr: "Şifremi unuttum, ne yapmalıyım?", en: "What should I do if I forgot my password?" },
    answer: { tr: "Şifre sıfırlama akışı henüz arayüzde tamamlanmadı. Bu özellik etkinleşene kadar yeni bir şifre gönderildiği izlenimi verilmez.", en: "The password-reset flow is not yet complete in the interface. Until it is enabled, FEMORIA does not claim that a reset email has been sent." },
  },
  {
    id: "profile-language",
    category: "account",
    question: { tr: "Tercih ettiğim dili değiştirebilir miyim?", en: "Can I change my preferred language?" },
    answer: { tr: "TR/EN geçişini header veya footer üzerinden yapabilirsiniz. Giriş yaptıysanız profil dil tercihinizi hesap sayfasından da kaydedebilirsiniz.", en: "Use the TR/EN control in the header or footer. When signed in, you can also save a profile language preference on the account page." },
  },
  {
    id: "dark-mode",
    category: "account",
    question: { tr: "Karanlık modu nasıl açarım?", en: "How do I enable dark mode?" },
    answer: { tr: "Header içindeki tema düğmesini kullanın. Seçiminiz bu tarayıcıda saklanır; ilk ziyarette sistem tercihiniz dikkate alınır.", en: "Use the theme button in the header. Your choice is saved in this browser, while the first visit follows your system preference." },
  },
  {
    id: "who-can-apply",
    category: "producer",
    question: { tr: "Kimler üretici olmak için başvurabilir?", en: "Who can apply to become a maker?" },
    answer: { tr: "Mutfak veya atölye kategorilerinde kendi üretimini yapan kişiler başvuru süreci için değerlendirilebilir. Güncel uygunluk ölçütleri başvuru sayfasında açıklanır.", en: "People making their own kitchen or workshop products may be considered through the application process. Current eligibility criteria are described on the application page." },
  },
  {
    id: "application-status",
    category: "producer",
    question: { tr: "Başvurum otomatik onaylanır mı?", en: "Is my application approved automatically?" },
    answer: { tr: "Hayır. Başvuru ve doğrulama süreci değerlendirme gerektirir. Onay satış yetkisi kazandırır ancak temel FEMORIA hesabınızın türünü değiştirmez; otomatik onay veya süre garantisi sunulmaz.", en: "No. Application and verification require review. Approval grants selling access without changing your base FEMORIA account type; no automatic approval or fixed review time is promised." },
  },
  {
    id: "application-information",
    category: "producer",
    question: { tr: "Başvuruda hangi bilgiler istenir?", en: "What information is requested in an application?" },
    answer: { tr: "Profil bilgileri, yaklaşık üretim bölgesi, üretim alanı ve ürünleri açıklayan örnekler istenebilir. Kesin ev adresi public profilde gösterilmez.", en: "Profile information, an approximate production area, craft category, and examples describing the products may be requested. An exact home address is not shown publicly." },
  },
  {
    id: "product-photos",
    category: "producer",
    question: { tr: "Ürün fotoğrafları nasıl olmalı?", en: "What should product photos look like?" },
    answer: { tr: "Ürünü açıkça gösteren, doğal renkleri koruyan ve yanıltıcı düzenleme içermeyen fotoğraflar tercih edilir. Fotoğraf rehberindeki öneriler editoryal destek niteliğindedir.", en: "Prefer images that show the item clearly, preserve natural colors, and avoid misleading edits. The photography guide offers editorial support." },
  },
  {
    id: "approved-products",
    category: "catalog",
    question: { tr: "Hangi ürünler katalogda görünür?", en: "Which products appear in the catalog?" },
    answer: { tr: "Mevcut katalog sorgusu yalnız aktif kategoriye bağlı, onaylı statüdeki ürünleri ve uygun üretici profilini gösterir.", en: "The current catalog query shows approved products linked to active categories and eligible maker profiles." },
  },
  {
    id: "missing-image",
    category: "catalog",
    question: { tr: "Ürün görseli neden placeholder olarak görünüyor?", en: "Why does a product show a placeholder image?" },
    answer: { tr: "Görsel kaydı eksikse veya yükleme başarısızsa arayüz güvenli bir placeholder gösterir. Bu durum ürün verisi uydurularak tamamlanmaz.", en: "If an image record is missing or fails to load, the interface shows a safe placeholder rather than inventing product data." },
  },
  {
    id: "favorites-disabled",
    category: "catalog",
    question: { tr: "Favoriler nasıl çalışıyor?", en: "How do favorites work?" },
    answer: { tr: "Favoriler özelliği kontrollü bir feature flag ile yönetilir. Sunucu senkronizasyonu kapalı olduğunda arayüz mevcut sınırlamayı korur ve özellik zorla etkinleştirilmez.", en: "Favorites are controlled by a feature flag. When server synchronization is disabled, the interface preserves that limitation and does not force-enable the feature." },
  },
  {
    id: "product-variation",
    category: "catalog",
    question: { tr: "El yapımı ürün neden fotoğraftan biraz farklı olabilir?", en: "Why might a handmade item vary slightly from its photo?" },
    answer: { tr: "El işçiliğinde doku, desen ve ton gibi ayrıntılarda küçük farklılıklar olabilir. Kararınız için kritik bir özelliği sipariş talebinden önce üreticiye sorun.", en: "Handwork may produce small differences in texture, pattern, or tone. Ask the maker about any feature critical to your decision before requesting an order." },
  },
  {
    id: "order-request",
    category: "delivery",
    question: { tr: "Sipariş talebi oluşturmak siparişin kesinleştiği anlamına gelir mi?", en: "Does an order request mean an order is confirmed?" },
    answer: { tr: "Hayır. Mevcut arayüz talep ve bilgilendirme aşamasındadır; üretici onayı, ödeme ve teslim koşulları ayrıca netleşmeden kesin sipariş iddiasında bulunmaz.", en: "No. The current interface supports requests and information; it does not claim a confirmed order before maker approval, payment, and delivery terms are established." },
  },
  {
    id: "payment",
    category: "delivery",
    question: { tr: "FEMORIA üzerinden ödeme yapabilir miyim?", en: "Can I pay through FEMORIA?" },
    answer: { tr: "Şu an bağlı ve doğrulanmış bir platform ödeme akışı bulunmuyor. Ödeme alındığı veya güvence altına alındığı izlenimi verilmez.", en: "There is currently no connected and verified platform payment flow. FEMORIA does not imply that a payment has been collected or protected." },
  },
  {
    id: "delivery-time",
    category: "delivery",
    question: { tr: "Teslimat süresi garanti edilir mi?", en: "Is delivery time guaranteed?" },
    answer: { tr: "Hayır. Ürün sayfasındaki hazırlık bilgisi karar desteğidir. Kesin zaman ve yöntem, mevcut iletişim veya teslim altyapısı üzerinden ayrıca netleştirilmelidir.", en: "No. Preparation information on a product page supports decision-making. Exact timing and method must be clarified through the available communication or delivery process." },
  },
  {
    id: "cancellation",
    category: "delivery",
    question: { tr: "Talebi iptal edebilir miyim?", en: "Can I cancel a request?" },
    answer: { tr: "Tam bir sipariş yönetimi ve iptal backend'i henüz sunulmuyor. Sipariş sistemi etkinleştiğinde iptal koşulları açıkça yayınlanmalıdır.", en: "A complete order-management and cancellation backend is not yet available. Cancellation terms must be published clearly when ordering is enabled." },
  },
  {
    id: "notifications",
    category: "delivery",
    question: { tr: "Sipariş bildirimleri gönderiliyor mu?", en: "Are order notifications sent?" },
    answer: { tr: "Otomatik sipariş bildirimi özelliği mevcut kapsamda doğrulanmış değildir. Arayüz gönderilmemiş bir bildirimi gönderilmiş gibi göstermez.", en: "Automated order notifications are not verified in the current scope. The interface does not claim that an unsent notification was delivered." },
  },
  {
    id: "exact-address",
    category: "privacy",
    question: { tr: "Kesin adresim public olarak gösterilir mi?", en: "Is my exact address shown publicly?" },
    answer: { tr: "Hayır. Public keşif yaklaşımı şehir, ilçe veya yaklaşık alan bilgisiyle sınırlıdır. Kesin koordinat ve ev adresi gösterilmez.", en: "No. Public discovery is limited to city, district, or approximate area. Exact coordinates and home addresses are not displayed." },
  },
  {
    id: "location-permission",
    category: "privacy",
    question: { tr: "Konum izni vermek zorunda mıyım?", en: "Do I have to grant location permission?" },
    answer: { tr: "Hayır. İl ve ilçe seçerek manuel keşif yapabilirsiniz. Konum izni reddedildiğinde manuel seçim seçeneği sunulur.", en: "No. You can browse by selecting a city and district manually. If permission is denied, a manual option remains available." },
  },
  {
    id: "report-content",
    category: "privacy",
    question: { tr: "Şüpheli içeriği nasıl bildirebilirim?", en: "How can I report suspicious content?" },
    answer: { tr: "İletişim sayfasındaki bildirim kategorisini kullanabilirsiniz. Gerçek gönderim servisi bağlanana kadar form bunun bir demo arayüz olduğunu açıkça belirtir.", en: "Use the reporting category on the contact page. Until a delivery service is connected, the form clearly states that it is a demo interface." },
  },
  {
    id: "assistant-purpose",
    category: "assistant",
    question: { tr: "FEMORIA Asistanı ne yapar?", en: "What does FEMORIA Assistant do?" },
    answer: { tr: "Asistan site kullanımı, kategori bulma, rehberler, üretici başvurusu ve platformun mevcut sınırları hakkında kısa yönlendirmeler verir.", en: "The assistant gives concise guidance about site navigation, categories, guides, maker applications, and current platform limitations." },
  },
  {
    id: "assistant-limits",
    category: "assistant",
    question: { tr: "Asistan sağlık, hukuk veya ödeme tavsiyesi verir mi?", en: "Does the assistant give health, legal, or payment advice?" },
    answer: { tr: "Hayır. Tıbbi teşhis, alerjen garantisi, hukuki tavsiye ve ödeme garantisi vermez; bu konularda güvenli sınırları açıklar.", en: "No. It does not provide medical diagnosis, allergen guarantees, legal advice, or payment guarantees; it explains safe boundaries instead." },
  },
  {
    id: "assistant-data",
    category: "assistant",
    question: { tr: "Asistan mesajlarımı saklar mı?", en: "Does the assistant store my messages?" },
    answer: { tr: "FEMORIA sohbet geçmişini Supabase'e yazmaz ve tarayıcıda kalıcı sohbet kaydı oluşturmaz. API sağlayıcısının veri işleme koşulları ayrıca değerlendirilmelidir.", en: "FEMORIA does not write chat history to Supabase or create a persistent browser transcript. The API provider's data-handling terms should be evaluated separately." },
  },
  {
    id: "assistant-unavailable",
    category: "assistant",
    question: { tr: "Asistan neden kullanılamıyor görünebilir?", en: "Why might the assistant be unavailable?" },
    answer: { tr: "Asistan, yanıtlayabildiği konularda mevcut FEMORIA rehberleri ve SSS içeriklerinden yararlanır. Geçici bir yoğunluk veya servis sorunu olursa kısa süre sonra yeniden deneyebilirsin.", en: "The assistant uses current FEMORIA guides and FAQs for supported questions. If it is temporarily busy or unavailable, try again shortly." },
  },
] satisfies FaqItem[];
