// "Femoria'yı Nasıl Kullanırım?" rehber kitapçığı (taslak Bölüm 2 — kullanıcıya yazılmış metin).
import { h, speak } from "../ui.js";
import { pageTitle } from "../components.js";
import { track } from "../api.js";
import { assistantEvent } from "../assistant.js";

const GUIDE = `
<p class="illus" aria-hidden="true">👩‍🍳📱🫙🧶</p>
<h2>Hoş geldiniz!</h2>
<p>Sevgili komşumuz, ellerinizle yaptığınız her şeyin bir değeri var. Reçeliniz, örgünüz, mantınız, takınız… Femoria, bunları yakınınızdaki insanlarla buluşturmak için var.</p>
<p>Burada her şey telefonunuzdan, birkaç dokunuşla olur. Takıldığınız her an sağ alttaki <strong>Ayşe Abla</strong>'ya dokunun; size adım adım yol gösterir. Yanlış bir şeye basmaktan korkmayın: Her şey geri alınabilir.</p>

<section id="katilmak">
<h2>Bölüm 1: Femoria'ya nasıl katılırım?</h2>
<p>Katılmak için sadece telefon numaranız yeter. E-posta ya da şifre hatırlamanız gerekmez.</p>
<ol>
  <li><strong>Femoria'yı açın.</strong> Bir şey satmak ya da almak istediğinizde turuncu düğme çıkar. <span aria-hidden="true">🟠👆</span></li>
  <li><strong>Telefon numaranızı yazın.</strong> Numaranızı kutuya yazıp <strong>"Kod gönder"</strong>e dokunun. <span aria-hidden="true">📞</span></li>
  <li><strong>Size gelen şifreyi girin.</strong> Telefonunuza bir mesaj gelir. Çoğu telefonda bu rakamlar kendiliğinden yazılır. Gelmezse 1 dakika bekleyip <strong>"Tekrar gönder"</strong>e dokunun. <span aria-hidden="true">✉️ 1 2 3 4</span></li>
  <li><strong>Adınızı ve mahallenizi söyleyin.</strong> Adınızı yazın, sonra mahallenizi listeden seçin. Ev adresinizi kimse görmez; insanlar sadece hangi mahallede olduğunuzu bilir. <span aria-hidden="true">🏠🛡️</span></li>
</ol>
<p>İşte bu kadar! Artık hem satabilir hem alışveriş yapabilirsiniz. Ayrı bir dükkân açmanıza gerek yok.</p>
<div class="tip"><strong>Ayşe Abla'dan ipucu:</strong> İsterseniz önce üye olmadan etrafa bakabilirsiniz. Üyelik ancak bir şey satmak ya da almak istediğinizde sorulur.</div>
</section>

<section id="satmak">
<h2>Bölüm 2: Ürünümün fotoğrafını çekip nasıl satarım?</h2>
<p>Üç kısa adımda ürününüz vitrine çıkar. Ortalama 3 dakika sürer.</p>
<h3>Adım 1: Fotoğrafını çekin</h3>
<p>Alttaki <strong>"Sat"</strong> düğmesine dokunun; kameranız kendiliğinden açılır.</p>
<ul>
  <li>Ürününüzü pencere kenarına, gün ışığına koyun.</li>
  <li>Ekrandaki kesik çizgili kutunun içine sığdırın.</li>
  <li>Yuvarlak düğmeye basın. Femoria fotoğrafınızı kendiliğinden güzelleştirir.</li>
  <li>Beğenmezseniz <strong>"Tekrar çek"</strong>, beğendiyseniz <strong>"Güzel olmuş"</strong> deyin. Dilerseniz 4 fotoğrafa kadar ekleyebilirsiniz.</li>
</ul>
<p class="illus" aria-hidden="true">🌑🫙 ➜ ☀️🫙✅</p>
<h3>Adım 2: Ürününüzü anlatın</h3>
<p>Yazmakla uğraşmayın, konuşun! Büyük mikrofon düğmesine basılı tutun ve ürününüzü bir komşunuza anlatır gibi anlatın:</p>
<p><em>"Bu ev yapımı vişne reçeli. Bahçemizin vişnesinden, şekeri az. Kavanozu 400 gram."</em></p>
<p>Ayşe Abla sözlerinizi yazıya döker, ürününüze bir isim koyar ve hangi türden olduğunu seçer. Siz sadece okuyun; doğruysa <strong>"Tamam"</strong>, değilse <strong>"Düzelteyim"</strong>e dokunup düzeltin.</p>
<p class="illus" aria-hidden="true">🎤 〰️ 💬</p>
<h3>Adım 3: Fiyatını ve teslimatı seçin</h3>
<p>Ayşe Abla, benzer ürünlerin kaça satıldığını size söyler: <em>"Benzer reçeller 120 ile 180 lira arasında satılıyor."</em> Fiyatınızı <strong>+</strong> ve <strong>−</strong> düğmeleriyle ayarlayın. Karar sizin!</p>
<p>Sonra ürünü nasıl teslim edeceğinizi seçin:</p>
<ul>
  <li><strong>Elden teslim:</strong> Alıcıyla mahallede buluşursunuz.</li>
  <li><strong>Kargo:</strong> Ürünü kargoyla gönderirsiniz.</li>
  <li><strong>İkisi de:</strong> Alıcı hangisini isterse.</li>
</ul>
<p>Son olarak büyük yeşil <strong>"Satışa çıkar"</strong> düğmesine dokunun. Tebrikler, ürününüz artık vitrinde!</p>
<p class="illus" aria-hidden="true">🎉✨🫙✨</p>
<div class="tip"><strong>Ayşe Abla'dan ipucu:</strong> İlk ürününüzü yükledikten sonra yarım kalan bir şey olursa merak etmeyin. Femoria her adımı saklar; kaldığınız yerden devam edersiniz.</div>
</section>

<section id="bulmak">
<h2>Bölüm 3: Yakınımdaki ürünleri nasıl bulurum?</h2>
<p>Mahallenizdeki el emeği ürünler bir dokunuş uzağınızda.</p>
<ol>
  <li>Alttaki <strong>"Yakınımda"</strong> düğmesine dokunun. <span aria-hidden="true">📍🏘️</span></li>
  <li>Femoria size "Nerede olduğunuzu öğrenebilir miyim?" diye sorar. <strong>"Evet"</strong> derseniz size en yakın ürünler sıralanır. İstemezseniz <strong>"Kendim seçeceğim"</strong> deyip ilçenizi listeden seçin.</li>
  <li>Ürünler en yakından en uzağa sıralanır. Her ürünün altında ne kadar uzakta olduğu yazar: "800 metre", "2 kilometre" gibi.</li>
  <li>Ne aradığınızı daraltmak isterseniz üstteki resimli kutulardan birine dokunun: <strong>Yemek, Örgü, Takı, Ev süsü…</strong> <span aria-hidden="true">🍲🧶📿🏺</span></li>
  <li>Ne kadar uzağa bakmak istediğinizi seçin: <strong>"Mahallem"</strong>, <strong>"İlçem"</strong> ya da <strong>"Şehrim"</strong>.</li>
  <li>Haritada görmek isterseniz <strong>"Haritada gör"</strong>e dokunun. Satıcıların yerleri tam adres olarak değil, mahalle büyüklüğünde yuvarlak bir alan olarak görünür.</li>
</ol>
<div class="tip"><strong>Ayşe Abla'dan ipucu:</strong> Aradığınızı bulamadıysanız bana söyleyin: "Yakınımda ev mantısı var mı?" Ben sizin için bakarım.</div>
</section>

<section id="mesajlasmak">
<h2>Bölüm 4: Alıcıyla ya da satıcıyla nasıl konuşurum?</h2>
<p>Femoria'da mesajlaşmak, telefonunuzdaki mesajlaşma uygulamaları kadar kolaydır.</p>
<h3>Bir ürünü beğendiyseniz (alıcı olarak):</h3>
<ol>
  <li>Ürünün sayfasında büyük <strong>"Satıcıya yaz"</strong> düğmesine dokunun. <span aria-hidden="true">💬</span></li>
  <li>Ne yazacağınızı düşünmenize gerek yok. Ekranın altında hazır cümleler çıkar: <strong>"Hâlâ satışta mı?"</strong>, <strong>"Kargo ücreti ne kadar?"</strong>, <strong>"Elden alabilir miyim?"</strong> Birine dokunmanız yeterli.</li>
  <li>Yazmak yerine konuşmak isterseniz mikrofon düğmesine dokunup sesinizi gönderin.</li>
</ol>
<h3>Size mesaj geldiyse (satıcı olarak):</h3>
<ol>
  <li>Alttaki <strong>"Mesajlar"</strong> düğmesinin üstünde kırmızı bir nokta belirir. Dokunun. <span aria-hidden="true">✉️🔴</span></li>
  <li>Konuşmanın en üstünde hangi ürün için yazıldığı her zaman görünür.</li>
  <li>Hazır cevaplardan birini seçebilirsiniz: <strong>"Evet, hazır"</strong>, <strong>"2 günde hazırlarım"</strong>, <strong>"Kargoya verdim"</strong>.</li>
  <li>Alıcıyla anlaştığınızda <strong>"Anlaştık"</strong> düğmesine dokunun. Adet, fiyat ve teslim günü tek bir kartta yazılır; ikiniz de unutmazsınız. <span aria-hidden="true">🤝🧾</span></li>
</ol>
<h3>Güvenliğiniz için:</h3>
<ul>
  <li>Ev adresinizi, banka bilgilerinizi ya da şifrelerinizi mesajda yazmayın. Yazarsanız Femoria size nazikçe hatırlatır.</li>
  <li>Elden teslimde kalabalık bir yerde buluşun: market önü, muhtarlık, cami avlusu gibi.</li>
  <li>Sizi rahatsız eden biri olursa sağ üstteki <strong>kalkan</strong> işaretine dokunun. <strong>"Engelle"</strong> derseniz bu kişi size bir daha yazamaz. Açıklama yapmak zorunda değilsiniz. <span aria-hidden="true">🛡️✅</span></li>
</ul>
</section>

<h2>Unutmayın</h2>
<p>Her büyük iş küçük bir adımla başlar. İlk ürününüzü bugün çekin; gerisini birlikte hallederiz. Takıldığınız her an Ayşe Abla burada.</p>
<p class="illus" aria-hidden="true">🤝👵👩👧</p>
`;

export default async function render(root) {
  track("guide_opened");
  const article = h("article", { class: "guide", html: GUIDE });
  root.append(
    pageTitle("Femoria'yı Nasıl Kullanırım?", { back: true }),
    h("button", { class: "btn btn-secondary", onclick: () => speak(article.innerText) }, h("span", { class: "ico", "aria-hidden": "true" }, "🔊"), "Bana sesli oku"),
    article,
    h("a", { class: "btn btn-primary btn-xl", href: "#/sat" }, h("span", { class: "ico", "aria-hidden": "true" }, "📸"), "İlk ürünümü koyayım"),
  );

  const anchor = location.hash.split("#")[2];
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }), 100);

  const openedAt = Date.now();
  return () => {
    window.speechSynthesis?.cancel();
    if (Date.now() - openedAt > 20000) assistantEvent("guide_read");
  };
}
