// Kişisel Verilerin Korunması Kanunu (KVKK) aydınlatma metni — tek kaynak.
// Metinde değişiklik yaptığınızda KVKK_VERSION'ı güncelleyin: kullanıcının hangi sürümü
// onayladığı kayıt altına alınır. Bir kez onaylayan kullanıcıya yeniden sorulmaz (bkz. js/consent.js);
// güncel metin her zaman "Aydınlatma metni" sayfasındadır.
//
// ⚠️ Yayına çıkmadan önce bir hukukçuya kontrol ettirin ve iletişim adresini doldurun.

export const KVKK_VERSION = "2026-11-12";

// Başvuru ve sorular için iletişim adresi (yayından önce doldurun).
export const KVKK_CONTACT = "[iletişim e-posta adresi]";

/** Konum izni ekranında gösterilen kısa özet (aydınlatma metninin "Konum" bölümüyle aynı içerik). */
export const LOCATION_SUMMARY = [
  ["Neden?", "Satarken ürününüzün nerede olduğunu göstermek; böylece alıcılar ürünleri il, ilçe ve mahalleye göre bulabilir."],
  ["Nasıl?", "Konumunuz telefonunuzun ya da bilgisayarınızın konum özelliğiyle, yalnızca siz izin verince alınır."],
  ["Ne saklanır?", "Konumunuz profilinize kaydedilmez. Son kullandığınız konum, bir sonraki ürünü satarken öneri olarak gelmesi için yalnızca bu cihazda kalır. Bir ürün satarken seçtiğiniz konum o ürünle birlikte, yaklaşık 500 metre rastgele kaydırılarak saklanır; başkaları yalnızca mahallenin adını görür."],
  ["Kimle paylaşılır?", "Mahalle adını bulmak için yaklaşık (yuvarlanmış) konum OpenStreetMap'in adres servisine gönderilir. Başka kimseyle paylaşılmaz."],
  ["Paylaşmak istemezsem?", "Femoria'yı yine kullanabilirsiniz: ilinizi, ilçenizi ve mahallenizi listeden seçersiniz."],
  ["Geri alabilir miyim?", "Evet. Ayarlar → Konum bölümünden konum izninizi istediğiniz an geri alabilirsiniz."],
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
      "Konum: sattığınız ürünlerin yaklaşık konumu ve mahalle, ilçe, il adı; son kullandığınız konum yalnızca cihazınızda (ayrıntısı aşağıda).",
      "Ürün bilgileri: ürün fotoğrafları, ad, açıklama, fiyat ve sesle anlattığınızın yazıya dökülmüş hali.",
      "Mesajlar: alıcı ve satıcıların birbirine yazdığı mesajlar, sesli mesajlar ve sipariş kartları.",
      "Güvenlik bilgileri: engellediğiniz kişiler ve şikayetler.",
      "Kullanım bilgileri: hangi ekranların ne sıklıkla kullanıldığı (ör. \"ürün yükleme tamamlandı\"). Bunlar uygulamayı geliştirmek için sayılır.",
    ],
  },
  {
    id: "konum",
    title: "Konum bilginiz",
    body: [
      "Neden: Satarken ürününüzün nerede olduğunu göstermek için; alıcılar ürünleri il, ilçe ve mahalleye göre süzebilir. Ürünlere bakarken konumunuz sorulmaz.",
      "Nasıl alınır: Konumunuz yalnızca siz \"Konumumu paylaş\" düğmesine bastıktan ve tarayıcınızın sorduğu izne \"İzin ver\" dedikten sonra, cihazınızın konum özelliğiyle alınır. İzin vermezseniz Femoria'yı yine kullanabilirsiniz; ilinizi, ilçenizi ve mahallenizi listeden seçersiniz.",
      "Ne saklanır: Konumunuz profilinize kaydedilmez. Son kullandığınız konum, bir sonraki üründe öneri olarak gelmesi için yalnızca cihazınızda (tarayıcınızda) kalır ve bize gönderilmez. Bir ürünü satışa çıkarırken o ürün için seçtiğiniz konum ürünle birlikte saklanır; kaydedilirken yaklaşık 500 metre rastgele kaydırılır. Tam konumunuz ve ev adresiniz hiçbir zaman saklanmaz. Başka kullanıcılar haritada nokta değil, mahalle büyüklüğünde bir daire ve mahallenin adını görür. Ürünü vitrinden kaldırdığınızda konumu da ürünle birlikte silinir.",
      "Kime gönderilir: Mahallenizin adını bulmak için konumunuz yaklaşık 100 metreye yuvarlanarak OpenStreetMap Vakfı'nın adres servisine (Nominatim) gönderilir. Listeden seçtiğinizde ise mahallenizin konumunu bulmak için yalnızca seçtiğiniz il, ilçe ve mahalle adı bu servise gönderilir. Bu servis yurt dışındadır.",
      "Hukuki sebep: Konumunuz açık rızanıza dayanarak işlenir (KVKK m. 5/1).",
      "Rızanızı geri alma: Ayarlar → Konum → \"Konum iznimi geri al\" ile cihazınızdaki konum silinir. Satıştaki ürünlerinizin konumu, ürünü vitrinden kaldırdığınızda silinir. Tarayıcınızın konum iznini de tarayıcı ayarlarından kapatabilirsiniz.",
    ],
  },
  {
    title: "Bilgilerinizi neden işliyoruz?",
    list: [
      "Hesabınızı açmak ve güvenle giriş yapmanızı sağlamak (sözleşmenin kurulması ve ifası, KVKK m. 5/2-c).",
      "Ürünlerinizi satışa çıkarmak, alıcılarla mesajlaşmanızı ve sipariş kartlarını sağlamak (sözleşmenin ifası).",
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
      "OpenAI (Ayşe Abla): Ayşe Abla'ya yazdıklarınız ve sesle anlattığınız ürün tarifi cevap üretmek için gönderilir. Sesli okumayı kullandığınızda okunacak metin (Ayşe Abla'nın cevapları, rehber, bu metin) ses üretmek için gönderilir. E-posta adresiniz ve konumunuz gönderilmez.",
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
