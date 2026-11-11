// Yasal metin TASLAKLARI. Yayına almadan önce bir avukat gözden geçirmelidir.
// Satıcı/şirket bilgileri ve iletişim adresi config'ten gelir; boşsa köşeli parantezle görünür.
import { LEGAL } from "./config.js";

const C = LEGAL;
const v = (k, d) => C[k] || `[${d}]`;

export const LEGAL_UPDATED = "2026-11-18";
export const LEGAL_PAGES = {
  "kullanim-kosullari": {
    title: "Kullanım koşulları",
    sections: () => [
      ["Hizmetin tanımı", ["Femoria, evde üretim yapan kişilerin ürünlerini alıcılarla buluşturan bir aracı platformdur. Satış sözleşmesi, alıcı ile satıcı arasında kurulur; Femoria ürünün satıcısı değildir. Online ödemelerde ödeme, iyzico altyapısıyla alınır ve alıcı teslimi onaylayana (ya da süre dolana) kadar emanette tutulur."]],
      ["Üyelik", ["Üyelik için 18 yaşını doldurmuş olmak gerekir. Hesap bilgilerinizin doğruluğundan ve hesabınızın güvenliğinden siz sorumlusunuz."]],
      ["Satıcı yükümlülükleri", ["Ürünü doğru anlatmak, gerçek fotoğraf kullanmak, stok ve fiyat bilgisini güncel tutmak ve siparişi söz verilen sürede göndermek ya da teslim etmek zorundasınız.", "Yasaklı ürünler satılamaz: yasal olmayan, sağlığa zarar verebilecek, ruhsat/izin gerektirip izni olmayan (ör. izinsiz ambalajlı gıda satışı yapılacaksa ilgili mevzuata uyum) ürünler. Gıda satan üreticiler ilgili mevzuata uymaktan kendileri sorumludur."]],
      ["Alıcı yükümlülükleri", ["Siparişi verdikten sonra teslimi onaylamak ya da sorun varsa süresi içinde bildirmekle yükümlüsünüz."]],
      ["Yasak davranışlar", ["Dolandırıcılık, hakaret, sahte ürün/yorum, platform dışına ödeme yönlendirme, başkalarının kişisel verilerini toplama yasaktır. Kurallara uymayan hesaplar uyarılmadan kısıtlanabilir."]],
      ["Sorumluluk", ["Femoria, kullanıcıların oluşturduğu içeriklerin ve satıcıların ürünlerinin niteliğinden doğrudan sorumlu değildir; anlaşmazlıklarda arabuluculuk yapmaya çalışır."]],
      ["Değişiklikler", ["Koşullar güncellenebilir; önemli değişiklikler duyurulur."]],
    ],
  },
  "mesafeli-satis": {
    title: "Mesafeli satış sözleşmesi ve ön bilgilendirme",
    sections: () => [
      ["Taraflar", [`Satıcı: Femoria üzerinde ürünü listeleyen kullanıcıdır (adı ve mağaza bilgileri sipariş özetinde ve mağaza sayfasında yer alır).`, `Aracı hizmet sağlayıcı: ${v("company", "Şirket / işletme unvanı")} · Adres: ${v("address", "adres")} · E-posta: ${v("email", "iletişim e-posta adresi")} · Vergi/Mersis no: ${v("taxNo", "numara")}`, "Alıcı: siparişi veren üyedir."]],
      ["Sözleşmenin konusu", ["Alıcının Femoria üzerinden sipariş ettiği ürünün satışı ve teslimidir. Ürünün temel nitelikleri, adedi, fiyatı ve teslimat biçimi (kargo ya da elden teslim) sipariş özetinde gösterilir."]],
      ["Ödeme", ["Ödeme, iyzico güvenli ödeme sayfasında kartla yapılır. Kart bilgileri Femoria'ya iletilmez. Tutar, alıcı teslimi onaylayana ya da onay süresi dolana kadar emanette tutulur; ardından satıcıya aktarılır."]],
      ["Teslimat", ["Kargo ile gönderilen ürünler, satıcının belirttiği süre içinde ve en geç 30 gün içinde teslim edilir. Elden teslimde yer ve zaman alıcı ile satıcı arasında mesajla kararlaştırılır. Kargo bedeli, aksi belirtilmedikçe fiyata dahildir."]],
      ["Cayma hakkı", ["Alıcı, ürünü teslim aldığı tarihten itibaren 14 gün içinde gerekçe göstermeden cayma hakkını kullanabilir.", "Cayma hakkının istisnaları (Mesafeli Sözleşmeler Yönetmeliği m.15): çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler (ev yapımı yemek, reçel vb. gıdalar), alıcının istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan (kişiye özel) ürünler, ambalajı açılmış hijyen ürünleri. Bu ürünlerde cayma hakkı kullanılamaz; ilan sayfasında belirtilir."]],
      ["Sorun bildirme", ["Ürün kusurlu, eksik ya da tanıma uygun değilse alıcı, ürün detay/sipariş ekranındaki \"Sorun bildir\" düğmesiyle talep açar. Talep incelenene kadar ödeme satıcıya aktarılmaz."]],
      ["Uyuşmazlık", ["Uyuşmazlıklarda, parasal sınırlar dahilinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir."]],
    ],
  },
  "iade-politikasi": {
    title: "İade ve iptal politikası",
    sections: () => [
      ["İptal", ["Satıcı kargoya vermeden önce, alıcı siparişi \"Siparişlerim\"den iptal edebilir; ödeme iade edilir."]],
      ["İade", ["Cayma hakkı kapsamındaki ürünler 14 gün içinde, kullanılmamış ve yeniden satılabilir durumda iade edilebilir. İade kargosu için satıcı ile mesajlaşın. Ürün satıcıya ulaşınca ödeme alıcıya iade edilir (iyzico üzerinden, bankaya bağlı olarak birkaç iş günü sürebilir)."]],
      ["Cayma hakkı olmayan ürünler", ["Ev yapımı gıdalar, kişiye özel üretilenler ve açılmış hijyen ürünleri iade edilemez; ancak kusurlu/yanlış ürün gelirse \"Sorun bildir\" ile talep açılabilir."]],
      ["Otomatik onay", ["Kargoya verilen siparişi alıcı 7 gün içinde onaylamaz ve sorun bildirmezse sipariş otomatik olarak onaylanır ve ödeme satıcıya aktarılır."]],
    ],
  },
  "cerez": {
    title: "Çerez ve yerel depolama bilgisi",
    sections: () => [
      ["Neler saklanır?", ["Femoria, reklam amaçlı çerez kullanmaz. Tarayıcınızda yalnızca sitenin çalışması için gerekenler saklanır: oturum bilgisi, sepetiniz, seçtiğiniz konum, son gezdiğiniz ürünler ve ayarlarınız (yazı boyutu vb.)."]],
      ["Silme", ["Tarayıcı ayarlarından site verilerini silerek bunları temizleyebilirsiniz; oturumunuz kapanır ve sepetiniz boşalır."]],
    ],
  },
};
