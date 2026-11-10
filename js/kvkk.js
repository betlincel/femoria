// Kişisel Verilerin Korunması Kanunu (KVKK) aydınlatma metni — tek kaynak.
// Metinde değişiklik yaptığınızda KVKK_VERSION'ı güncelleyin: kullanıcının hangi sürümü
// onayladığı kayıt altına alınır. Bir kez onaylayan kullanıcıya yeniden sorulmaz (bkz. js/consent.js);
// güncel metin her zaman "Aydınlatma metni" sayfasındadır.
//
// ⚠️ Yayına çıkmadan önce bir hukukçuya kontrol ettirin ve iletişim adresini doldurun.

export const KVKK_VERSION = "2026-11-19";

// Başvuru ve sorular için iletişim adresi (yayından önce doldurun).
export const KVKK_CONTACT = "[iletişim e-posta adresi]";

/** Konum izni ekranında gösterilen kısa özet (aydınlatma metninin "Konum" bölümüyle aynı içerik). */
export const LOCATION_SUMMARY = [
  ["Neden?", "Satarken ürününüzün nerede olduğunu göstermek; ürünlere bakarken de isterseniz bulunduğunuz il ve ilçedeki ürünleri göstermek."],
  ["Nasıl?", "Konumunuz telefonunuzun ya da bilgisayarınızın konum özelliğiyle, yalnızca siz izin verince alınır."],
  ["Ne saklanır?", "Konumunuz profilinize ya da cihazınıza kaydedilmez. Bir ürün satarken seçtiğiniz konum o ürünle birlikte, yaklaşık 500 metre rastgele kaydırılarak saklanır; başkaları yalnızca mahallenin adını görür."],
  ["Kimle paylaşılır?", "Mahalle adını bulmak için yaklaşık (yuvarlanmış) konum OpenStreetMap'in adres servisine gönderilir. Başka kimseyle paylaşılmaz."],
  ["Paylaşmak istemezsem?", "Femoria'yı yine kullanabilirsiniz: ilinizi, ilçenizi ve mahallenizi listeden seçersiniz."],
  ["Geri alabilir miyim?", "Evet. Tarayıcınızın ayarlarından Femoria'nın konum iznini istediğiniz an kapatabilirsiniz. Ürünün konumu, ürünü vitrinden kaldırınca silinir."],
];

export const KVKK_SECTIONS = [
  {
    title: "Bu metin ne anlatıyor?",
    body: [
      "Femoria'yı kullanırken hangi bilgilerinizi, neden ve nasıl işlediğimizi; bu bilgilerin kimlerle paylaşıldığını ve sizin haklarınızı 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında anlatır.",
      "Veri sorumlusu: Femoria proje ekibi (TÜBİTAK 2209-B Üniversite Öğrencileri Araştırma Projeleri, Karadeniz Teknik Üniversitesi).",
    ],
  },
  {
    title: "Hangi bilgilerinizi işliyoruz?",
    list: [
      "Hesap bilgileri: adınız, e-posta adresiniz ve şifreniz. Şifreniz şifrelenmiş olarak saklanır; biz de göremeyiz.",
      "Cinsiyet: yalnızca size nasıl hitap edeceğimizi (Hanım / Bey) belirlemek için. Başkalarına gösterilmez. \"Belirtmek istemiyorum\" seçebilirsiniz.",
      "Konum: yalnızca sattığınız ürünlerin yaklaşık konumu ve mahalle, ilçe, il adı (ayrıntısı aşağıda).",
      "Ürün bilgileri: ürün fotoğrafları, ad, açıklama, fiyat ve sesle anlattığınızın yazıya dökülmüş hali.",
      "Mesajlar: alıcı ve satıcıların birbirine yazdığı mesajlar, sesli mesajlar ve sipariş kartları.",
      "Favoriler: kalple işaretlediğiniz ürünler. Yalnızca siz görürsünüz; satıcıya ya da başkalarına gösterilmez.",
      "Sepet: sepete eklediğiniz ürünler yalnızca cihazınızda tutulur, bize gönderilmez. Sipariş verdiğinizde her ürün için satıcıyla sohbet açılır ve sipariş kartı oluşur (Mesajlar maddesi).",
      "Online ödeme ve sipariş: ödemede girdiğiniz ad, soyad, cep telefonu ve adres; sipariş tutarı, kargo firması ve takip numarası. Kargo ile gönderilecek ürünlerde adresiniz ve telefonunuz yalnızca o ürünün satıcısına gösterilir. Kart bilgileriniz Femoria'ya gelmez; iyzico'nun sayfasında girilir. Son girdiğiniz adres, bir dahaki ödemede tekrar yazmamanız için yalnızca cihazınızda hatırlanır.",
      "Satıcı ödeme hesabı: online ödeme almak isteyen satıcının adı, soyadı, telefonu, adresi, IBAN'ı ve T.C. kimlik numarası yalnızca iyzico'ya iletilir. Femoria T.C. kimlik numarasını ve IBAN'ı saklamaz; yalnızca iyzico'nun verdiği hesap anahtarını ve IBAN'ın son 4 hanesini saklar.",
      "Teklifler, puanlar ve takip: verdiğiniz ve aldığınız fiyat teklifleri (yalnızca alıcı ve satıcı görür); satıcıya verdiğiniz puan ve yorum (adınızla birlikte mağaza sayfasında herkese görünür); takip ettiğiniz satıcılar (yalnızca siz görürsünüz; satıcı yalnızca toplam takipçi sayısını görür). Mağaza tanıtımı yazarsanız mağaza sayfanızda herkese görünür.",
      "Güvenlik bilgileri: engellediğiniz kişiler ve şikayetler.",
      "Kullanım bilgileri: hangi ekranların ne sıklıkla kullanıldığı (ör. \"ürün yükleme tamamlandı\"). Bunlar uygulamayı geliştirmek için sayılır.",
    ],
  },
  {
    id: "konum",
    title: "Konum bilginiz",
    body: [
      "Neden: Satarken ürününüzün nerede olduğunu göstermek için; alıcılar ürünleri il ve ilçeye göre süzebilir. Ürünlere bakarken \"Mevcut konumumu kullan\" derseniz, bulunduğunuz il ve ilçedeki ürünleri göstermek için.",
      "Nasıl alınır: Konumunuz yalnızca siz \"Konumumu paylaş\" düğmesine bastıktan ve tarayıcınızın sorduğu izne \"İzin ver\" dedikten sonra, cihazınızın konum özelliğiyle alınır. İzin vermezseniz Femoria'yı yine kullanabilirsiniz; ilinizi, ilçenizi ve mahallenizi listeden seçersiniz.",
      "Ne saklanır: Konumunuz profilinize ya da cihazınıza kaydedilmez. Ürünlere bakarken \"Mevcut konumumu kullan\" derseniz konumunuzdan yalnızca il ve ilçe adı bulunur; bu ad, tekrar sormamak için cihazınızda hatırlanır, konumun kendisi saklanmaz ve bize gönderilmez. Bir ürünü satışa çıkarırken o ürün için seçtiğiniz konum ürünle birlikte saklanır; kaydedilirken yaklaşık 500 metre rastgele kaydırılır. Tam konumunuz ve ev adresiniz hiçbir zaman saklanmaz. Başka kullanıcılar yalnızca mahallenin adını görür. Ürünü vitrinden kaldırdığınızda konumu da ürünle birlikte silinir.",
      "Kime gönderilir: Mahallenizin adını bulmak için konumunuz yaklaşık 100 metreye yuvarlanarak OpenStreetMap Vakfı'nın adres servisine (Nominatim) gönderilir. Listeden seçtiğinizde ise mahallenizin konumunu bulmak için yalnızca seçtiğiniz il, ilçe ve mahalle adı bu servise gönderilir. Bu servis yurt dışındadır.",
      "Hukuki sebep: Konumunuz açık rızanıza dayanarak işlenir (KVKK m. 5/1).",
      "Rızanızı geri alma: Tarayıcınızın ayarlarından Femoria'nın konum iznini istediğiniz an kapatabilirsiniz; o andan sonra konumunuz alınamaz (ürün satarken mahalleyi listeden seçebilirsiniz). Satıştaki ürünlerinizin konumu, ürünü vitrinden kaldırdığınızda silinir.",
    ],
  },
  {
    title: "Bilgilerinizi neden işliyoruz?",
    list: [
      "Hesabınızı açmak ve güvenle giriş yapmanızı sağlamak (sözleşmenin kurulması ve ifası, KVKK m. 5/2-c).",
      "Ürünlerinizi satışa çıkarmak, alıcılarla mesajlaşmanızı, sipariş kartlarını, online ödemeyi, kargo takibini, teklifleri ve puanlamayı sağlamak (sözleşmenin ifası).",
      "Ödeme ve faturalandırmaya ilişkin yasal yükümlülükler (ödeme hizmetleri ve vergi mevzuatı, KVKK m. 5/2-ç).",
      "Dolandırıcılığa ve rahatsız edici davranışlara karşı sizi korumak: mesaj kalkanı, engelleme, şikayet (meşru menfaat, KVKK m. 5/2-f).",
      "Ayşe Abla'nın size yardım edebilmesi ve ürününüzü sesle anlatabilmeniz.",
      "Uygulamayı geliştirmek ve proje başarı ölçütlerini raporlamak (isimsiz, toplu sayılar).",
      "Konum: açık rızanız (yukarıdaki bölüm).",
    ],
  },
  {
    title: "Bilgileriniz kimlerle paylaşılır?",
    list: [
      "Diğer kullanıcılar: adınız, ürünleriniz ve ürünlerinizin mahallesi, doğrulama rozetleriniz. E-postanız ve cinsiyetiniz gösterilmez.",
      "Supabase (veritabanı ve dosya barındırma): bilgileriniz Avrupa Birliği'ndeki (Frankfurt) sunucularda saklanır.",
      "Google (Gemini API — Ayşe Abla): Ayşe Abla'ya yazdıklarınız ve sesle anlattığınız ürün tarifi cevap üretmek için gönderilir. Sesli okumayı kullandığınızda okunacak metin (Ayşe Abla'nın cevapları, rehber, bu metin) ses üretmek için gönderilir. Bir sesli mesajı \"yazıya çevir\" dediğinizde o ses kaydı yazıya dökülmek için gönderilir. E-posta adresiniz ve konumunuz gönderilmez. Google'a ulaşılamadığında aynı bilgiler yedek olarak OpenAI'a gönderilebilir.",
      "iyzico (İyzi Ödeme ve Elektronik Para Hizmetleri A.Ş., lisanslı ödeme kuruluşu): online ödemede ad, soyad, e-posta, cep telefonu, adres ve sepet tutarı; satıcılar için ödeme hesabı bilgileri (T.C. kimlik no, IBAN dahil). Kart bilgilerini doğrudan iyzico alır. iyzico bu bilgileri kendi aydınlatma metni ve yasal saklama süreleri kapsamında işler.",
      "Satıcı ve alıcı: siparişin karşı tarafı, sipariş için gereken bilgileri görür (satıcı: kargo adresi ve telefon; alıcı: kargo takip numarası).",
      "OpenStreetMap Vakfı (Nominatim): yalnızca yuvarlanmış konum (mahalle adını bulmak için) ya da listeden seçtiğiniz il, ilçe, mahalle adı (konumunu bulmak için).",
      "Yurt dışına aktarım: Yukarıdaki hizmet sağlayıcıların sunucuları Türkiye dışındadır; aktarım KVKK m. 9 kapsamında yapılır.",
      "Kanunen yetkili kurumlar: yalnızca yasal bir talep olduğunda.",
    ],
  },
  {
    title: "Ne kadar süre saklanır?",
    list: [
      "Hesabınız açık olduğu sürece. Hesabınızı sildiğinizde ürünleriniz, fotoğraflarınız, mesajlarınız, sesli mesajlarınız, konumunuz ve tüm bilgileriniz kalıcı olarak silinir.",
      "Vitrinden kaldırdığınız ürün: ürün, fotoğrafları ve konumu hemen kalıcı olarak silinir. Ürünle ilgili sohbetleriniz silinmez; sohbette yalnızca ürünün adı ve fiyatı görünmeye devam eder.",
      "Sohbetin karşı tarafı hesabını silerse, o sohbete ait sesli mesajlar da en geç bir gün içinde silinir.",
      "Online ödemelerin kayıtları, mevzuatın öngördüğü süre boyunca iyzico tarafından saklanır.",
      "Kullanım sayıları isimsiz olarak proje süresince saklanabilir.",
    ],
  },
  {
    title: "Haklarınız (KVKK m. 11)",
    list: [
      "Bilgilerinizin işlenip işlenmediğini öğrenme ve işlendiyse bilgi isteme.",
      "İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme.",
      "Yurt içinde veya yurt dışında kimlere aktarıldığını bilme.",
      "Eksik veya yanlış bilgilerin düzeltilmesini, silinmesini isteme.",
      "Açık rızanızı (ör. konum) istediğiniz an geri alma.",
      "Zarara uğramanız hâlinde zararın giderilmesini talep etme.",
      "Hesabınızı ve tüm bilgilerinizi Ayarlar → \"Hesabımı ve verilerimi sil\" ile tek düğmeyle silebilirsiniz.",
    ],
  },
  {
    title: "Bize ulaşın",
    body: [`Sorularınız ve başvurularınız için: ${KVKK_CONTACT}`],
  },
];

/** Düz metin (sesli okuma için) */
export function kvkkPlainText() {
  return KVKK_SECTIONS.map((s) => [s.title, ...(s.body || []), ...(s.list || [])].join(". ")).join(". ");
}
