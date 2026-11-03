// "Femoria'yı Nasıl Kullanırım?" rehber kitapçığı (taslak Bölüm 2 — kullanıcıya yazılmış metin).
import { h, speak, withIcon, canSpeak, stopSpeaking } from "../ui.js";
import { iconSVG } from "../icons.js";
import { pageTitle } from "../components.js";
import { track } from "../api.js";
import { assistantEvent } from "../assistant.js";

const GUIDE = `
<h2>Hoş geldiniz!</h2>
<p>Sevgili komşumuz, ellerinizle yaptığınız her şeyin bir değeri var. Reçeliniz, örgünüz, mantınız, takınız… Femoria, bunları yakınınızdaki insanlarla buluşturmak için var.</p>
<p>Burada her şey telefonunuzdan, birkaç dokunuşla olur. Takıldığınız her an sağ alttaki <strong>Ayşe Abla</strong>'ya dokunun; size adım adım yol gösterir. Yanlış bir şeye basmaktan korkmayın: Her şey geri alınabilir.</p>

<section id="katilmak">
<div class="section-head"><div class="feature-ico">${iconSVG("user")}</div><h2>Bölüm 1: Femoria'ya nasıl katılırım?</h2></div>
<p>Katılmak için bir e-posta adresi ve kendinize seçeceğiniz bir şifre yeter.</p>
<ol>
  <li><strong>"Üye ol"a dokunun.</strong> Sağ üstteki <strong>"Giriş yap"</strong> düğmesinden ya da bir şey satmak veya almak istediğinizde karşınıza çıkar.</li>
  <li><strong>Adınızı, e-postanızı ve şifrenizi yazın.</strong> Şifre en az 8 karakter olmalı. <strong>"Göster"</strong>e dokunarak yazdığınızı görebilirsiniz.</li>
  <li><strong>E-postanızı onaylayın.</strong> Gelen kutunuza bir e-posta gelir. İçindeki bağlantıya tıklayın; hesabınız açılır. Gelmezse "Gereksiz" klasörüne bakın ya da <strong>"Tekrar gönder"</strong>e dokunun.</li>
  <li><strong>Adınızı ve mahallenizi söyleyin.</strong> Adınızı yazın, sonra mahallenizi listeden seçin. Ev adresinizi kimse görmez; insanlar sadece hangi mahallede olduğunuzu bilir.</li>
</ol>
<p>İşte bu kadar! Artık hem satabilir hem alışveriş yapabilirsiniz. Ayrı bir dükkân açmanıza gerek yok.</p>
<p>Şifrenizi unutursanız giriş ekranındaki <strong>"Şifremi unuttum"</strong>a dokunun; yenileme bağlantısı e-postanıza gelir.</p>
<div class="tip">${iconSVG("sparkles")}<p><strong>Ayşe Abla'dan ipucu:</strong> İsterseniz önce üye olmadan etrafa bakabilirsiniz. Üyelik ancak bir şey satmak ya da almak istediğinizde sorulur.</p></div>
</section>

<section id="satmak">
<div class="section-head"><div class="feature-ico">${iconSVG("camera")}</div><h2>Bölüm 2: Ürünümün fotoğrafını çekip nasıl satarım?</h2></div>
<p>Üç kısa adımda ürününüz vitrine çıkar. Ortalama 3 dakika sürer.</p>
<h3>Adım 1: Fotoğrafını çekin</h3>
<p>Alttaki <strong>"Sat"</strong> düğmesine dokunun; kameranız kendiliğinden açılır.</p>
<ul>
  <li>Ürününüzü pencere kenarına, gün ışığına koyun.</li>
  <li>Ekrandaki kesik çizgili kutunun içine sığdırın.</li>
  <li>Yuvarlak düğmeye basın. Femoria fotoğrafınızı kendiliğinden güzelleştirir.</li>
  <li>Beğenmezseniz <strong>"Tekrar çek"</strong>, beğendiyseniz <strong>"Güzel olmuş"</strong> deyin. Dilerseniz 4 fotoğrafa kadar ekleyebilirsiniz.</li>
</ul>
<h3>Adım 2: Ürününüzü anlatın</h3>
<p>Yazmakla uğraşmayın, konuşun! Büyük mikrofon düğmesine basılı tutun ve ürününüzü bir komşunuza anlatır gibi anlatın:</p>
<p class="quote">"Bu ev yapımı vişne reçeli. Bahçemizin vişnesinden, şekeri az. Kavanozu 400 gram."</p>
<p>Ayşe Abla sözlerinizi yazıya döker, ürününüze bir isim koyar ve hangi türden olduğunu seçer. Siz sadece okuyun; doğruysa <strong>"Tamam"</strong>, değilse <strong>"Düzelteyim"</strong>e dokunup düzeltin.</p>
<h3>Adım 3: Fiyatını ve teslimatı seçin</h3>
<p>Ayşe Abla, benzer ürünlerin kaça satıldığını size söyler: <em>"Benzer reçeller 120 ile 180 lira arasında satılıyor."</em> Fiyatınızı <strong>+</strong> ve <strong>−</strong> düğmeleriyle ayarlayın. Karar sizin!</p>
<p>Sonra ürünü nasıl teslim edeceğinizi seçin:</p>
<ul>
  <li><strong>Elden teslim:</strong> Alıcıyla mahallede buluşursunuz.</li>
  <li><strong>Kargo:</strong> Ürünü kargoyla gönderirsiniz.</li>
  <li><strong>İkisi de:</strong> Alıcı hangisini isterse.</li>
</ul>
<p>Son olarak büyük yeşil <strong>"Satışa çıkar"</strong> düğmesine dokunun. Tebrikler, ürününüz artık vitrinde!</p>
<div class="tip">${iconSVG("sparkles")}<p><strong>Ayşe Abla'dan ipucu:</strong> İlk ürününüzü yükledikten sonra yarım kalan bir şey olursa merak etmeyin. Femoria her adımı saklar; kaldığınız yerden devam edersiniz.</p></div>
</section>

<section id="bulmak">
<div class="section-head"><div class="feature-ico">${iconSVG("map-pin")}</div><h2>Bölüm 3: Yakınımdaki ürünleri nasıl bulurum?</h2></div>
<p>Mahallenizdeki el emeği ürünler bir dokunuş uzağınızda.</p>
<ol>
  <li>Alttaki <strong>"Yakınımda"</strong> düğmesine dokunun.</li>
  <li>Femoria size "Nerede olduğunuzu öğrenebilir miyim?" diye sorar. <strong>"Evet"</strong> derseniz size en yakın ürünler sıralanır. İstemezseniz <strong>"Kendim seçeceğim"</strong> deyip ilçenizi listeden seçin.</li>
  <li>Ürünler en yakından en uzağa sıralanır. Her ürünün altında ne kadar uzakta olduğu yazar: "800 metre", "2 kilometre" gibi.</li>
  <li>Ne aradığınızı daraltmak isterseniz üstteki resimli kutulardan birine dokunun: <strong>Yemek, Örgü, Takı, Ev süsü…</strong></li>
  <li>Ne kadar uzağa bakmak istediğinizi seçin: <strong>"Mahallem"</strong>, <strong>"İlçem"</strong> ya da <strong>"Şehrim"</strong>.</li>
  <li>Haritada görmek isterseniz <strong>"Haritada gör"</strong>e dokunun. Satıcıların yerleri tam adres olarak değil, mahalle büyüklüğünde yuvarlak bir alan olarak görünür.</li>
</ol>
<div class="tip">${iconSVG("sparkles")}<p><strong>Ayşe Abla'dan ipucu:</strong> Aradığınızı bulamadıysanız bana söyleyin: "Yakınımda ev mantısı var mı?" Ben sizin için bakarım.</p></div>
</section>

<section id="mesajlasmak">
<div class="section-head"><div class="feature-ico">${iconSVG("message")}</div><h2>Bölüm 4: Alıcıyla ya da satıcıyla nasıl konuşurum?</h2></div>
<p>Femoria'da mesajlaşmak, telefonunuzdaki mesajlaşma uygulamaları kadar kolaydır.</p>
<h3>Bir ürünü beğendiyseniz (alıcı olarak):</h3>
<ol>
  <li>Ürünün sayfasında büyük <strong>"Satıcıya yaz"</strong> düğmesine dokunun.</li>
  <li>Ne yazacağınızı düşünmenize gerek yok. Ekranın altında hazır cümleler çıkar: <strong>"Hâlâ satışta mı?"</strong>, <strong>"Kargo ücreti ne kadar?"</strong>, <strong>"Elden alabilir miyim?"</strong> Birine dokunmanız yeterli.</li>
  <li>Yazmak yerine konuşmak isterseniz mikrofon düğmesine dokunup sesinizi gönderin.</li>
</ol>
<h3>Size mesaj geldiyse (satıcı olarak):</h3>
<ol>
  <li>Alttaki <strong>"Mesajlar"</strong> düğmesinin üstünde kırmızı bir nokta belirir. Dokunun.</li>
  <li>Konuşmanın en üstünde hangi ürün için yazıldığı her zaman görünür.</li>
  <li>Hazır cevaplardan birini seçebilirsiniz: <strong>"Evet, hazır"</strong>, <strong>"2 günde hazırlarım"</strong>, <strong>"Kargoya verdim"</strong>.</li>
  <li>Alıcıyla anlaştığınızda <strong>"Anlaştık"</strong> düğmesine dokunun. Adet, fiyat ve teslim günü tek bir kartta yazılır; ikiniz de unutmazsınız.</li>
</ol>
<h3>Güvenliğiniz için:</h3>
<ul>
  <li>Ev adresinizi, banka bilgilerinizi ya da şifrelerinizi mesajda yazmayın. Yazarsanız Femoria size nazikçe hatırlatır.</li>
  <li>Elden teslimde kalabalık bir yerde buluşun: market önü, muhtarlık, cami avlusu gibi.</li>
  <li>Sizi rahatsız eden biri olursa sağ üstteki <strong>kalkan</strong> işaretine dokunun. <strong>"Engelle"</strong> derseniz bu kişi size bir daha yazamaz. Açıklama yapmak zorunda değilsiniz.</li>
</ul>
</section>

<h2>Unutmayın</h2>
<p>Her büyük iş küçük bir adımla başlar. İlk ürününüzü bugün çekin; gerisini birlikte hallederiz. Takıldığınız her an Ayşe Abla burada.</p>
`;

export default async function render(root) {
  track("guide_opened");
  const article = h("article", { class: "guide", html: GUIDE });
  root.append(
    pageTitle("Femoria'yı Nasıl Kullanırım?", { back: true }),
    h("p", { class: "lead" }, "Dört kısa bölümde katılmayı, satmayı, bulmayı ve mesajlaşmayı anlatıyoruz."),
    canSpeak ? h("button", { class: "btn btn-secondary", onclick: () => speak(article.innerText, { force: true }) }, withIcon("volume", "Sesli dinle")) : null,
    article,
    h("a", { class: "btn btn-primary btn-xl section", href: "#/sat" }, withIcon("camera", "İlk ürünümü koyayım")),
  );

  const anchor = location.hash.split("#")[2];
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }), 100);

  const openedAt = Date.now();
  return () => {
    stopSpeaking();
    if (Date.now() - openedAt > 20000) assistantEvent("guide_read");
  };
}
