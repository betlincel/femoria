import type { InfoPageContent, StepContent } from "./types";
import { editorialVisuals } from "./visuals";

export const homeEditorial = {
  hero: {
    image: {
      src: editorialVisuals.homeHero,
      alt: {
        tr: "Ev mutfağında birlikte hazırlık yapan kadınlar",
        en: "Women preparing food together in a home kitchen",
      },
    },
  },
  purpose: {
    eyebrow: { tr: "FEMORIA nedir?", en: "What is FEMORIA?" },
    title: { tr: "Ürünün arkasındaki emeği görünür kılan bir keşif alanı", en: "A discovery space that makes the work behind each item visible" },
    text: {
      tr: "FEMORIA; kadın üreticilerin mutfak ve atölye ürünlerini açık ürün bilgileri, yaklaşık konum ve editoryal rehberlerle bir araya getiren geliştirme aşamasındaki bir pazar yeri deneyimidir.",
      en: "FEMORIA is a marketplace experience in development, bringing together kitchen and workshop goods from women makers with clear product information, approximate location, and editorial guides.",
    },
  },
  principles: [
    {
      title: { tr: "Emeğe saygı", en: "Respect for craft" },
      text: { tr: "Küçük üretimin hazırlık süresini ve doğal farklılıklarını açıkça anlatır.", en: "Explains the lead time and natural variation of small-batch making." },
    },
    {
      title: { tr: "Yaklaşık konum", en: "Approximate location" },
      text: { tr: "Keşif için il ve ilçe düzeyini kullanır; kesin ev adresi göstermez.", en: "Uses city and district for discovery without displaying exact home addresses." },
    },
    {
      title: { tr: "Şeffaf sınırlar", en: "Transparent limits" },
      text: { tr: "Mevcut olmayan ödeme, sipariş ve garanti özelliklerini varmış gibi anlatmaz.", en: "Does not present unavailable payment, order, or guarantee features as active." },
    },
  ],
  steps: [
    { title: { tr: "Dünyanı seç", en: "Choose your world" }, text: { tr: "Mutfak veya Atölye seçkisine göz at.", en: "Browse the Kitchen or Workshop selection." }, status: "available" },
    { title: { tr: "Bilgileri karşılaştır", en: "Compare details" }, text: { tr: "Malzeme, hazırlık ve yaklaşık bölgeyi incele.", en: "Review materials, preparation, and approximate area." }, status: "available" },
    { title: { tr: "Sorunu netleştir", en: "Clarify your question" }, text: { tr: "Ürün açıklamasında eksik kalan ayrıntıları belirle.", en: "Identify details missing from the product description." }, status: "available" },
    { title: { tr: "Talep sürecini takip et", en: "Follow the request flow" }, text: { tr: "Tam sipariş ve ödeme akışı etkinleştiğinde koşulları ayrıca doğrula.", en: "When full ordering and payment become available, verify the terms separately." }, status: "planned" },
  ] satisfies StepContent[],
  trust: {
    image: { src: editorialVisuals.community, alt: { tr: "Ortak üretim masasında çalışan eller", en: "Hands working around a shared making table" } },
    title: { tr: "Doğrulama bir garanti değil, şeffaflık adımıdır", en: "Verification is a transparency step, not a guarantee" },
    text: { tr: "Doğrulanmış profil rozeti mevcut inceleme sürecini gösterir. Ürün içeriği, alerjen, malzeme ve teslim koşulları yine ürün özelinde değerlendirilmelidir.", en: "A verified-profile badge reflects the current review process. Ingredients, allergens, materials, and delivery terms still need item-specific review." },
  },
  faqTitle: { tr: "Karar vermeden önce merak edilenler", en: "Common questions before deciding" },
  faqText: { tr: "Hesap, konum gizliliği, ürünler ve asistan hakkında kısa yanıtlar.", en: "Concise answers about accounts, location privacy, products, and the assistant." },
} as const;

export const worldEditorial = {
  kitchen: {
    hero: { src: editorialVisuals.kitchen, alt: { tr: "Ev yapımı ürünlerin hazırlandığı düzenli mutfak", en: "A tidy kitchen where homemade goods are prepared" } },
    introTitle: { tr: "Ev yapımı ürünlerde açık bilgi önemlidir", en: "Clear information matters for homemade food" },
    introText: { tr: "İçerik, alerjen, saklama önerisi, hazırlık süresi ve teslim biçimi kararın parçasıdır. FEMORIA bu bilgileri görünür kılmayı amaçlar; tıbbi veya beslenme garantisi vermez.", en: "Ingredients, allergens, storage guidance, lead time, and handover method all matter. FEMORIA aims to make them visible without offering medical or nutritional guarantees." },
    topics: [
      { title: { tr: "Reçel ve kahvaltılıklar", en: "Preserves and breakfast goods" }, text: { tr: "İçerik, şeker oranı ifadesi, kavanoz durumu ve açıldıktan sonraki saklama önerisini sorun.", en: "Ask about ingredients, stated sugar content, jar condition, and storage after opening." } },
      { title: { tr: "Erişte ve kuru ürünler", en: "Noodles and dried goods" }, text: { tr: "Alerjenleri, net miktarı ve serin-kuru saklama önerisini karşılaştırın.", en: "Compare allergens, net quantity, and cool-dry storage guidance." } },
      { title: { tr: "Tarhana ve karışımlar", en: "Tarhana and blends" }, text: { tr: "Tam içerik listesini, üretim tarihini değil güncel ürün bilgisini ve porsiyon önerisini inceleyin.", en: "Review the complete ingredient list, current item information, and serving guidance." } },
      { title: { tr: "Sipariş üzerine hazırlananlar", en: "Made-to-order foods" }, text: { tr: "Hazırlık süresi, teslim aralığı ve soğuk zincir gereksinimini üreticiyle netleştirin.", en: "Clarify lead time, handover window, and any cold-chain needs with the maker." } },
    ],
    questions: { tr: ["Tam içerik listesi nedir?", "Bilinen alerjen veya çapraz temas ihtimali var mı?", "Teslimden sonra nasıl saklanmalı?", "Hazırlık ve teslim aralığı nedir?"], en: ["What is the full ingredient list?", "Are there known allergens or cross-contact risks?", "How should it be stored after handover?", "What are the preparation and handover windows?"] },
    note: { tr: "Alerji veya özel beslenme ihtiyacında yalnız platform içeriğine dayanmayın; uygun bir sağlık profesyoneline danışın.", en: "For allergies or specific dietary needs, do not rely only on platform content; consult a qualified health professional." },
    relatedGuides: ["ev-yapimi-gida-sorulari", "guvenli-teslim-alma"],
  },
  workshop: {
    hero: { src: editorialVisuals.workshop, alt: { tr: "Seramik ve el aletleri bulunan küçük atölye", en: "A small studio with ceramics and hand tools" } },
    introTitle: { tr: "El yapımı üretim, süreç ve malzeme bilgisidir", en: "Handmade production is about process and materials" },
    introText: { tr: "Küçük üretimde doku, desen ve ton farklılıkları görülebilir. Malzeme, ölçü, bakım ve sipariş üzerine üretim süresi açıkça karşılaştırılmalıdır.", en: "Small-batch items may vary in texture, pattern, or tone. Materials, dimensions, care, and made-to-order lead time should be compared clearly." },
    topics: [
      { title: { tr: "Seramik", en: "Ceramics" }, text: { tr: "Sır, pişirim, gıda teması ve bulaşık makinesi uygunluğunu ürün özelinde sorun.", en: "Ask about glaze, firing, food contact, and dishwasher suitability for the specific piece." } },
      { title: { tr: "Tekstil", en: "Textiles" }, text: { tr: "Lif içeriği, astar, ölçü ve yıkama önerisini birlikte değerlendirin.", en: "Review fiber content, lining, dimensions, and washing guidance together." } },
      { title: { tr: "Ahşap", en: "Wood" }, text: { tr: "Ağaç türü, yüzey işlemi, gıda teması ve kurutma önerisini öğrenin.", en: "Learn the wood species, finish, food-contact guidance, and drying method." } },
      { title: { tr: "Takı ve aksesuar", en: "Jewelry and accessories" }, text: { tr: "Ana malzeme, kaplama, ölçü ve cilt hassasiyeti açısından eksik bilgileri sorun.", en: "Ask about the base material, plating, measurements, and any skin-sensitivity considerations." } },
    ],
    questions: { tr: ["Ana malzeme ve yüzey işlemi nedir?", "Ölçü veya renk değiştirilebilir mi?", "Bakım ve saklama önerisi nedir?", "Hazırlık süresi hangi aşamada başlar?"], en: ["What are the base material and finish?", "Can size or color be changed?", "What care and storage are recommended?", "When does the lead time begin?"] },
    note: { tr: "El yapımındaki doğal farklılıklar kusur veya kalite garantisi değildir; ürün açıklaması kabul edilebilir değişimi netleştirmelidir.", en: "Natural handmade variation is neither a defect nor a quality guarantee; the product description should clarify acceptable differences." },
    relatedGuides: ["seramik-urun-bakimi", "malzeme-bilgisi-okuma", "siparis-uzerine-uretim"],
  },
} as const;

export const producerEditorial = {
  emptyTitle: { tr: "Henüz listelenecek doğrulanmış üretici yok", en: "No verified makers are available to list yet" },
  emptyText: { tr: "Gerçek üretici verisi oluştuğunda bu dizin otomatik olarak ürün kataloğundan beslenecek. Demo üretici profili gösterilmiyor.", en: "When real maker data is available, this directory will be derived from the product catalog. Demo maker profiles are not shown." },
  verificationTitle: { tr: "Doğrulama yaklaşımı", en: "Verification approach" },
  verificationText: { tr: "Uygun üretici profili ve onaylı ürün ilişkisi public dizinde görünmenin temelidir. Rozet, sertifika veya işlem garantisi değildir.", en: "An eligible maker profile linked to approved products is the basis for appearing publicly. The badge is not a certification or transaction guarantee." },
  ethicsTitle: { tr: "Etik ve şeffaf sunum", en: "Ethical and transparent presentation" },
  ethicsText: { tr: "Üretim alanı, malzeme ve yaklaşık bölge bilgileri açık yazılmalı; kesin adres ve doğrulanmamış başarı iddiaları kullanılmamalıdır.", en: "Craft area, materials, and approximate location should be clear, while exact addresses and unverified success claims should be avoided." },
} as const;

export const nearbyEditorial = {
  privacyTitle: { tr: "Konum, keşif için yaklaşık tutulur", en: "Location stays approximate for discovery" },
  privacyText: { tr: "İl ve ilçe seçimi yakın çevredeki katalog ürünlerini filtrelemek için kullanılır. Kesin koordinat, ev adresi veya gerçek mesafe gösterilmez.", en: "City and district choices filter catalog items in an approximate area. Exact coordinates, home addresses, and invented distances are not shown." },
  browserLimitTitle: { tr: "Tarayıcı konumu tek başına yeterli değil", en: "Browser location alone is not enough" },
  browserLimitText: { tr: "Mevcut demo, koordinatı sunucuya göndermeden şehir eşleştirmesi yapmaz. Sonuç görmek için il ve ilçeyi manuel seçin.", en: "The current demo does not map coordinates to a city or send them to the server. Choose a city and district manually to see results." },
  emptyTitle: { tr: "Bu yaklaşık bölgede katalog ürünü bulunamadı", en: "No catalog items were found in this approximate area" },
  emptyText: { tr: "Başka bir il seçebilir veya tüm onaylı ürünlere göz atabilirsiniz. Gerçek mesafe ya da adres uydurulmaz.", en: "Choose another city or browse all approved products. No distance or address is invented." },
} as const;

export const howItWorksContent = {
  buyerTitle: { tr: "Alıcı için mevcut akış", en: "Current buyer flow" },
  buyerText: { tr: "Keşif ve bilgi karşılaştırma aktif; tam sipariş, ödeme ve otomatik takip özellikleri henüz tamamlanmış değildir.", en: "Discovery and comparison are available; complete ordering, payment, and automated tracking are not yet finished." },
  buyerSteps: [
    { title: { tr: "Ürünleri keşfet", en: "Discover products" }, text: { tr: "Kategori, şehir ve anahtar kelimeyle onaylı kataloğu incele.", en: "Browse the approved catalog by category, city, and keyword." }, status: "available" },
    { title: { tr: "Ürün detayını incele", en: "Review product details" }, text: { tr: "Üretici, yaklaşık bölge, hazırlık ve malzeme bilgilerini karşılaştır.", en: "Compare maker, approximate area, preparation, and material information." }, status: "available" },
    { title: { tr: "Koşulları netleştir", en: "Clarify terms" }, text: { tr: "Eksik içerik, alerjen, bakım veya teslim ayrıntısını belirle.", en: "Identify missing ingredient, allergen, care, or delivery details." }, status: "available" },
    { title: { tr: "Sipariş talebi", en: "Order request" }, text: { tr: "Tam talep yönetimi, ödeme ve takip deneyimi planlanan kapsamdır.", en: "Complete request management, payment, and tracking are planned." }, status: "planned" },
  ] satisfies StepContent[],
  producerTitle: { tr: "Üretici için yol haritası", en: "Maker roadmap" },
  producerText: { tr: "Hesap oluşturma ve güvenli üretici başvurusu aktiftir; ürün yönetimi ve sipariş paneli aşamalı geliştirme kapsamındadır.", en: "Account creation and secure maker applications are active; product management and order tools are being developed in stages." },
  producerSteps: [
    { title: { tr: "Hesap oluştur", en: "Create an account" }, text: { tr: "Üretici rolüyle güvenli auth akışını tamamla.", en: "Complete the secure auth flow with the maker role." }, status: "available" },
    { title: { tr: "Başvuru bilgilerini hazırla", en: "Prepare application details" }, text: { tr: "Üretim alanı, yaklaşık bölge ve ürün örneklerini düzenle.", en: "Organize craft area, approximate location, and product examples." }, status: "available" },
    { title: { tr: "Doğrulama değerlendirmesi", en: "Verification review" }, text: { tr: "Başvuru gönderimi ve kullanıcı durum ekranı aktiftir; idari değerlendirme paneli ayrı geliştirme kapsamındadır.", en: "Application submission and the user status view are active; the administrative review dashboard is a separate development phase." }, status: "available" },
    { title: { tr: "Ürün ve talepleri yönet", en: "Manage products and requests" }, text: { tr: "Üretici yönetim paneli henüz public deneyimde aktif değildir.", en: "The maker dashboard is not yet active in the public experience." }, status: "planned" },
  ] satisfies StepContent[],
} as const;

export const accountEditorial = {
  sections: [
    { title: { tr: "Profil ve yaklaşık konum", en: "Profile and approximate location" }, text: { tr: "Ad, şehir, ilçe ve dil tercihi mevcut profil formundan yönetilir. Public deneyim kesin adres göstermez.", en: "Name, city, district, and language are managed through the current profile form. The public experience does not show exact addresses." } },
    { title: { tr: "Tema ve dil", en: "Theme and language" }, text: { tr: "Tema tarayıcıda saklanır; profil dili hesabınızda, aktif rota dili ise URL üzerinde korunur.", en: "Theme is stored in the browser; profile language is stored in your account, while the active route locale remains in the URL." } },
    { title: { tr: "Favoriler", en: "Favorites" }, text: { tr: "Favori senkronizasyonu feature flag ile kontrollüdür. Kapalıyken yeni sunucu davranışı zorla etkinleştirilmez.", en: "Favorite synchronization is controlled by a feature flag and is not force-enabled when disabled." } },
    { title: { tr: "Üretici durumu", en: "Maker status" }, text: { tr: "Üretici rolü başvurunun veya doğrulamanın otomatik tamamlandığı anlamına gelmez. Ayrıntılı yönetim paneli planlanan kapsamdır.", en: "A maker role does not mean application or verification completed automatically. A detailed dashboard is planned." } },
    { title: { tr: "Hesap güvenliği", en: "Account security" }, text: { tr: "Şifrenizi paylaşmayın ve yalnız FEMORIA'nın doğrulanmış giriş rotalarını kullanın. Şifre sıfırlama arayüzü tamamlandığında açıkça belirtilecektir.", en: "Do not share your password and use only verified FEMORIA sign-in routes. The interface will state clearly when password reset is complete." } },
  ],
} as const;

export const infoPages = {
  about: {
    slug: "about",
    status: "editorial",
    eyebrow: { tr: "FEMORIA hakkında", en: "About FEMORIA" },
    title: { tr: "Emeği, ürünü ve yerel bağı aynı hikâyede buluşturmak", en: "Bringing craft, product, and local connection into one story" },
    description: { tr: "FEMORIA'nın amacı, yaklaşımı ve mevcut geliştirme aşaması.", en: "FEMORIA's purpose, approach, and current development stage." },
    intro: { tr: "FEMORIA, kadınların mutfak ve atölye üretimlerini görünür, anlaşılır ve güvenli sınırlar içinde keşfetmeye yardımcı olan bir ürün deneyimidir.", en: "FEMORIA is a product experience designed to make women's kitchen and workshop goods easier to discover within clear and safer boundaries." },
    image: { src: editorialVisuals.community, alt: { tr: "Birlikte çalışan üreticilerin elleri", en: "Makers' hands working together" } },
    sections: [
      { id: "purpose", title: { tr: "Amacımız", en: "Our purpose" }, paragraphs: { tr: ["Ürünün yalnız sonucunu değil, malzemesini, hazırlık biçimini ve arkasındaki emeği de görünür kılmak."], en: ["To make not only the finished item visible, but also its materials, preparation, and the work behind it."] } },
      { id: "worlds", title: { tr: "Mutfak ve Atölye", en: "Kitchen and Workshop" }, paragraphs: { tr: ["Mutfak dünyası ev yapımı gıdayı; Atölye dünyası seramik, tekstil, ahşap ve takı gibi el emeği kategorilerini düzenler."], en: ["Kitchen organizes homemade food; Workshop brings together handmade categories such as ceramics, textiles, wood, and jewelry."] } },
      { id: "stage", title: { tr: "Mevcut geliştirme aşaması", en: "Current development stage" }, paragraphs: { tr: ["Katalog, locale, auth ve üretici başvuru temelleri çalışmaktadır. Tam ödeme, sipariş yönetimi, idari başvuru değerlendirmesi ve teslim takip özellikleri henüz tamamlanmış değildir."], en: ["Catalog, locale, auth, and maker application foundations are active. Full payment, order management, administrative application review, and delivery tracking are not yet complete."] }, callout: { tr: "Bu sayfa doğrulanmamış ekip, kuruluş tarihi veya başarı rakamı içermez.", en: "This page does not invent team members, founding dates, or achievement figures." } },
    ],
    links: [{ href: "/how-it-works", label: { tr: "Nasıl çalıştığını incele", en: "See how it works" } }],
  },
  safety: {
    slug: "safety",
    status: "editorial",
    eyebrow: { tr: "Güvenlik ve şeffaflık", en: "Safety and transparency" },
    title: { tr: "Güven, sınırların açıkça anlatılmasıyla başlar", en: "Trust begins with clearly stated boundaries" },
    description: { tr: "Doğrulama, adres gizliliği, iletişim, gıda bilgisi ve platform sınırları.", en: "Verification, address privacy, communication, food information, and platform limits." },
    intro: { tr: "FEMORIA, kullanıcıların ürün ve üretici bilgilerini daha bilinçli değerlendirmesine yardımcı olur; hukuki, tıbbi, ödeme veya teslimat garantisi vermez.", en: "FEMORIA helps users evaluate product and maker information more thoughtfully; it does not provide legal, medical, payment, or delivery guarantees." },
    sections: [
      { id: "verification", title: { tr: "Üretici doğrulama yaklaşımı", en: "Maker verification approach" }, paragraphs: { tr: ["Doğrulama, mevcut profil inceleme adımlarını ifade eder. Sertifika, ürün garantisi veya her beyanın bağımsız denetimi değildir."], en: ["Verification reflects current profile-review steps. It is not a certification, product guarantee, or independent audit of every claim."] } },
      { id: "location", title: { tr: "Kişisel adres ve yaklaşık konum", en: "Personal address and approximate location" }, paragraphs: { tr: ["Public keşif şehir, ilçe veya yaklaşık alanla sınırlıdır. Kesin koordinat ve ev adresi gösterilmemelidir."], en: ["Public discovery is limited to city, district, or approximate area. Exact coordinates and home addresses should not be displayed."] } },
      { id: "communication", title: { tr: "Güvenli iletişim ve bildirim", en: "Safer communication and reporting" }, paragraphs: { tr: ["Şifre, kimlik belgesi veya gereksiz kişisel adres paylaşmayın. Baskı kuran, tutarsız veya platform dışına zorlayan talepleri iletişim alanından bildirin."], en: ["Do not share passwords, identity documents, or unnecessary personal addresses. Report coercive, inconsistent, or suspicious off-platform requests through the contact area."] } },
      { id: "food", title: { tr: "Gıda ve alerjen sorumluluğu", en: "Food and allergen responsibility" }, paragraphs: { tr: ["Üretici içerik ve bilinen alerjenleri açıkça belirtmelidir. Alerji veya sağlık ihtiyacında profesyonel görüş alın; platform içeriği sağlık garantisi değildir."], en: ["Makers should state ingredients and known allergens clearly. Seek professional guidance for allergies or health needs; platform content is not a health guarantee."] } },
      { id: "payments", title: { tr: "Ödeme ve aracılık kapsamı", en: "Payment and intermediary scope" }, paragraphs: { tr: ["Bağlı ve doğrulanmış bir ödeme sistemi şu anda yoktur. FEMORIA ödeme alınmış, korunmuş veya sipariş kesinleşmiş gibi davranmaz."], en: ["There is currently no connected and verified payment system. FEMORIA does not imply that payment was collected, protected, or that an order is confirmed."] }, callout: { tr: "Bu içerik hukuki sözleşme veya hukuki tavsiye değildir.", en: "This content is not a legal contract or legal advice." } },
    ],
    links: [{ href: "/guide/guvenli-teslim-alma", label: { tr: "Güvenli teslim rehberini oku", en: "Read the safer handover guide" } }],
  },
  help: {
    slug: "help",
    status: "available",
    eyebrow: { tr: "Yardım merkezi", en: "Help center" },
    title: { tr: "Doğru yanıtı konuya veya aramaya göre bulun", en: "Find the right answer by topic or search" },
    description: { tr: "Hesap, ürün, teslimat, gizlilik ve asistan hakkında aranabilir yardım.", en: "Searchable help for accounts, products, delivery, privacy, and the assistant." },
    intro: { tr: "Aşağıdaki yanıtlar FEMORIA'nın mevcut işlevlerini ve henüz tamamlanmamış alanlarını açıkça ayırır.", en: "The answers below distinguish clearly between current FEMORIA features and areas that are not yet complete." },
    sections: [],
    links: [{ href: "/info/contact", label: { tr: "Yanıt bulamadım", en: "I could not find an answer" } }],
  },
  contact: {
    slug: "contact",
    status: "planned",
    eyebrow: { tr: "İletişim", en: "Contact" },
    title: { tr: "Sorunuzu doğru destek alanına yönlendirin", en: "Route your question to the right support area" },
    description: { tr: "Genel yardım, güvenlik bildirimi ve üretici başvurusu için demo iletişim arayüzü.", en: "A demo contact interface for general help, safety reports, and maker applications." },
    intro: { tr: "Gerçek e-posta veya destek backend'i henüz bağlı değildir. Form bilgileri gönderilmez; arayüz yalnız geliştirme ve test amacıyla hazırlanmıştır.", en: "No email or support backend is currently connected. Form data is not sent; the interface is prepared for development and testing only." },
    sections: [
      { id: "categories", title: { tr: "Destek kategorileri", en: "Support categories" }, paragraphs: { tr: ["Genel yardım, hesap erişimi, şüpheli içerik, üretici başvurusu ve teknik geri bildirim seçenekleri formda sunulur."], en: ["The form offers general help, account access, suspicious-content reports, maker applications, and technical feedback."] } },
      { id: "privacy", title: { tr: "Gizlilik notu", en: "Privacy note" }, paragraphs: { tr: ["Mesaj alanına şifre, kimlik belgesi, ödeme bilgisi veya kesin ev adresi yazmayın."], en: ["Do not include passwords, identity documents, payment details, or exact home addresses in the message."] } },
    ],
  },
  "producer-application": {
    slug: "producer-application",
    status: "available",
    eyebrow: { tr: "Üretici başvurusu", en: "Maker application" },
    title: { tr: "Üretiminizi güvenli bir başvuruyla anlatın", en: "Share your work through a secure application" },
    description: { tr: "Uygunluk, gerekli bilgiler, ürün fotoğrafları, gizlilik ve değerlendirme süreci.", en: "Eligibility, required information, product photos, privacy, and review." },
    intro: { tr: "Giriş yaptıktan sonra üretim bilgilerinizi güvenli biçimde gönderebilir ve mevcut başvurunuzun durumunu bu sayfadan görebilirsiniz.", en: "After signing in, you can securely submit production details and review the current status of your application on this page." },
    image: { src: editorialVisuals.workshop, alt: { tr: "Ürün örneklerini hazırlayan el emeği üreticisi", en: "A craft maker preparing product samples" } },
    sections: [
      { id: "eligibility", title: { tr: "Kimler başvurabilir?", en: "Who can apply?" }, paragraphs: { tr: ["Mutfak veya Atölye kategorilerinde kendi üretimini yapan ve ürün bilgisini şeffaf paylaşmaya hazır kişiler değerlendirilebilir."], en: ["People making their own Kitchen or Workshop goods and ready to share product information transparently may be considered."] } },
      { id: "information", title: { tr: "Hazırlanacak bilgiler", en: "Information to prepare" }, paragraphs: { tr: ["Profil adı, yaklaşık bölge, üretim alanı, kısa üretim hikâyesi, ürün örnekleri ve açık ürün açıklamaları."], en: ["Profile name, approximate area, craft category, a short making story, product examples, and clear product descriptions."] }, bullets: { tr: ["Kesin ev adresi yerine yaklaşık bölge", "Doğal ve yanıltıcı olmayan ürün fotoğrafları", "Malzeme veya içerik bilgisi", "Hazırlık ve bakım notları"], en: ["Approximate area instead of exact home address", "Natural, non-misleading product photos", "Material or ingredient information", "Lead-time and care notes"] } },
      { id: "review", title: { tr: "Değerlendirme durumu", en: "Review status" }, paragraphs: { tr: ["Her yeni başvuru beklemede durumuyla başlar. Başvuru göndermek profil rolünü otomatik değiştirmez; onay ve rol yönetimi ayrı bir idari süreçtir."], en: ["Every new application starts as pending. Submitting an application does not automatically change the profile role; approval and role management are separate administrative steps."] }, callout: { tr: "Aynı hesap ikinci bir başvuru gönderemez; güncelleme ve yeniden başvuru henüz desteklenmiyor.", en: "The same account cannot submit a second application; updates and reapplication are not yet supported." } },
    ],
  },
  privacy: {
    slug: "privacy",
    status: "editorial",
    eyebrow: { tr: "Gizlilik yaklaşımı", en: "Privacy approach" },
    title: { tr: "Kişisel bilgiyi yalnız gerekli olduğu ölçüde kullanmak", en: "Use personal information only when needed" },
    description: { tr: "FEMORIA prototipinin gizlilik yaklaşımı ve mevcut sınırları.", en: "The FEMORIA prototype's privacy approach and current limits." },
    intro: { tr: "Bu sayfa yürürlükteki bir gizlilik sözleşmesi değildir. Ürün geliştirme sırasında uygulanan veri minimizasyonu yaklaşımını açıklar.", en: "This page is not a binding privacy agreement. It explains the data-minimization approach used during product development." },
    sections: [
      { id: "location", title: { tr: "Konum", en: "Location" }, paragraphs: { tr: ["Public profillerde kesin adres gösterilmez. Manuel şehir/ilçe tercihi tarayıcıda saklanabilir; mevcut demo tarayıcı koordinatını sunucuya kaydetmez."], en: ["Exact addresses are not shown on public profiles. Manual city/district choices may be stored in the browser; the current demo does not save browser coordinates to the server."] } },
      { id: "assistant", title: { tr: "Asistan mesajları", en: "Assistant messages" }, paragraphs: { tr: ["Sohbet geçmişi Supabase'e yazılmaz ve kalıcı tarayıcı kaydı oluşturulmaz. OpenAI servisi etkinleştirildiğinde sağlayıcı veri koşulları ayrıca değerlendirilmelidir."], en: ["Chat history is not written to Supabase or stored persistently in the browser. Provider data terms must be evaluated separately when the OpenAI service is enabled."] } },
    ],
  },
  terms: {
    slug: "terms",
    status: "planned",
    eyebrow: { tr: "Kullanım sınırları", en: "Usage boundaries" },
    title: { tr: "Geliştirme aşamasındaki deneyimin kapsamı", en: "Scope of the experience in development" },
    description: { tr: "Mevcut prototip kullanım sınırları hakkında editoryal açıklama.", en: "An editorial explanation of current prototype usage boundaries." },
    intro: { tr: "Bu içerik hukukçu tarafından hazırlanmış kullanım şartları değildir ve sözleşme yerine geçmez.", en: "This content is not lawyer-drafted terms of use and does not replace a contract." },
    sections: [
      { id: "current", title: { tr: "Mevcut kapsam", en: "Current scope" }, paragraphs: { tr: ["Katalog keşfi, locale, auth ve profil temelleri kullanılabilir. Tam ödeme, sipariş ve teslimat yönetimi tamamlanmış değildir."], en: ["Catalog discovery, locale, auth, and profile foundations are available. Full payment, ordering, and delivery management are not complete."] } },
      { id: "responsibility", title: { tr: "Kullanıcı sorumluluğu", en: "User responsibility" }, paragraphs: { tr: ["Ürün bilgilerini değerlendirin, gereksiz kişisel veri paylaşmayın ve mevcut olmayan bir özelliği çalışıyor varsaymayın."], en: ["Review product information, avoid unnecessary personal-data sharing, and do not assume an unavailable feature is active."] } },
    ],
  },
  cookies: {
    slug: "cookies",
    status: "editorial",
    eyebrow: { tr: "Tarayıcı tercihleri", en: "Browser preferences" },
    title: { tr: "Tema, konum ve yerel tercihlerin saklanması", en: "Storing theme, location, and local preferences" },
    description: { tr: "Mevcut prototipte tarayıcıda saklanan tercihlerin özeti.", en: "A summary of preferences stored in the browser by the current prototype." },
    intro: { tr: "Bu sayfa kapsamlı bir çerez politikası değildir. Mevcut arayüzün localStorage kullanımını anlaşılır biçimde açıklar.", en: "This page is not a comprehensive cookie policy. It explains the current interface's localStorage use in plain language." },
    sections: [
      { id: "theme", title: { tr: "Tema tercihi", en: "Theme preference" }, paragraphs: { tr: ["Aydınlık veya karanlık tema seçimi aynı tarayıcıda hatırlanır."], en: ["Your light or dark theme choice is remembered in the same browser."] } },
      { id: "location", title: { tr: "Yaklaşık konum tercihi", en: "Approximate location preference" }, paragraphs: { tr: ["Manuel şehir ve ilçe seçimi yakındaki keşfi kolaylaştırmak için yerel olarak saklanabilir. Kesin koordinat saklanmaz."], en: ["A manual city and district choice may be stored locally to support nearby discovery. Exact coordinates are not stored."] } },
    ],
  },
  "password-reset": {
    slug: "password-reset",
    status: "planned",
    eyebrow: { tr: "Hesap erişimi", en: "Account access" },
    title: { tr: "Şifre sıfırlama henüz etkin değil", en: "Password reset is not yet enabled" },
    description: { tr: "Şifre sıfırlama akışının mevcut geliştirme durumu.", en: "Current development status of password reset." },
    intro: { tr: "Bu arayüz henüz gerçek bir sıfırlama e-postası göndermez. Auth akışı tamamlandığında yalnız sunucu tarafındaki güvenli Supabase yöntemi kullanılmalıdır.", en: "This interface does not yet send a real reset email. When completed, it must use only the secure server-side Supabase flow." },
    sections: [],
    links: [{ href: "/login", label: { tr: "Giriş sayfasına dön", en: "Return to sign in" } }],
  },
  community: {
    slug: "community",
    status: "planned",
    eyebrow: { tr: "Topluluk", en: "Community" },
    title: { tr: "Doğrulanmış topluluk kanalları yakında", en: "Verified community channels are coming later" },
    description: { tr: "FEMORIA topluluk kanallarının mevcut durumu.", en: "Current status of FEMORIA community channels." },
    intro: { tr: "Sosyal medya bağlantıları doğrulanmadan gerçek hesap izlenimi verilmez. Şimdilik rehberleri ve public ürün seçkisini keşfedebilirsiniz.", en: "FEMORIA does not imply official social accounts before links are verified. For now, explore the guides and public product selection." },
    sections: [],
    links: [{ href: "/guide", label: { tr: "Rehberleri keşfet", en: "Explore guides" } }],
  },
  "guide-articles": {
    slug: "guide-articles",
    status: "available",
    eyebrow: { tr: "Rehber merkezi", en: "Guide center" },
    title: { tr: "Rehber içerikleri artık ayrıntılı olarak yayında", en: "Detailed guide content is now available" },
    description: { tr: "FEMORIA editoryal rehberlerine yönlendirme.", en: "A route to FEMORIA editorial guides." },
    intro: { tr: "Mutfak, bakım, teslimat, malzeme ve yerel üretim konularındaki özgün rehberlere Rehber sayfasından ulaşabilirsiniz.", en: "Find original guides about kitchen goods, care, handover, materials, and local making in the Guide center." },
    sections: [],
    links: [{ href: "/guide", label: { tr: "Tüm rehberleri aç", en: "Open all guides" } }],
  },
} as const satisfies Record<string, InfoPageContent>;

export type InfoPageSlug = keyof typeof infoPages;

export function getInfoPage(slug: string): InfoPageContent | null {
  return slug in infoPages ? infoPages[slug as InfoPageSlug] : null;
}
