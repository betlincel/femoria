/*
  FEMORIA geliştirme/test katalog seed'i
  ======================================

  Bu dosya:
  - 6 aktif kategori ekler veya aynı anlamdaki seed kategorilerini güvenli biçimde etkinleştirir.
  - Seçtiğiniz mevcut Authentication kullanıcısını producer foreign key'i olarak kullanır.
  - 8 adet approved demo ürün ekler.
  - Mevcut gerçek kullanıcıları, ürünleri veya görselleri silmez.
  - TRUNCATE, DROP veya DELETE çalıştırmaz.

  ÇALIŞTIRMADAN ÖNCE
  1. Supabase Dashboard > Authentication > Users bölümünden geliştirme/test amacıyla
     kullanacağınız gerçek kullanıcının UID değerini kopyalayın.
  2. Bu dosyadaki her 63434023-ed88-44ef-8d28-87233ce4afeb ifadesini aynı gerçek UID ile değiştirin.
  3. Kullanıcının public.profiles kaydı role='producer' ve status='active' olmalıdır.
     Seed mevcut profiles kaydını değiştirmez. Uygun değilse işlem güvenli biçimde durur.
  4. producer_profiles kaydı yoksa seed approved olarak oluşturur. Kayıt zaten varsa
     hiçbir alanını değiştirmez ve verification_status='approved' değilse işlemi durdurur.
  5. Dosyayı Supabase SQL Editor'a yapıştırıp Run ile çalıştırın. Ana seed tek transaction'dır;
     herhangi bir doğrulama başarısız olursa tamamı geri alınır.

  PUBLIC KATALOG KOŞULLARI
  - profiles.role = 'producer'
  - profiles.status = 'active'
  - producer_profiles.verification_status = 'approved'
  - categories.active = true
  - products.status = 'approved'

  GÖRSELLER
  product_images.storage_path yalnız Supabase Storage içindeki göreli yolu kabul eder;
  HTTPS URL kabul etmez. Önce gerçek dosyaları Storage'a yükleyin, aşağıdaki yorumlu
  görsel bölümündeki STORAGE_PATH_BURAYA_* değerlerini gerçek yollarla değiştirin,
  ardından yalnız o bölümü yorumdan çıkarıp ayrıca çalıştırın.

  Bu seed production verisi değildir; yalnız geliştirme ve arayüz doğrulaması içindir.
*/

begin;

do $catalog_seed$
declare
  producer_user_id_text constant text := '63434023-ed88-44ef-8d28-87233ce4afeb';
  producer_user_id uuid;
  producer_role text;
  producer_status text;
  producer_verification text;
  valid_category_count integer;
  valid_product_count integer;
  seed_product_slugs constant text[] := array[
    'demo-ev-yapimi-cilek-receli',
    'demo-el-yapimi-seramik-kupa',
    'demo-ahsap-sunum-tahtasi',
    'demo-el-orgusu-canta',
    'demo-geleneksel-tarhana',
    'demo-minimal-seramik-vazo',
    'demo-gumus-renkli-bileklik',
    'demo-ev-yapimi-eriste'
  ];
begin
  if producer_user_id_text = concat('PRODUCER_USER_ID_', 'BURAYA') then
    raise exception using
      message = '63434023-ed88-44ef-8d28-87233ce4afeb gerçek bir Authentication Users UID değeriyle değiştirilmelidir.';
  end if;

  begin
    producer_user_id := producer_user_id_text::uuid;
  exception
    when invalid_text_representation then
      raise exception using
        message = 'Producer UID geçerli bir UUID biçiminde değildir.';
  end;

  if not exists (select 1 from auth.users where id = producer_user_id) then
    raise exception using
      message = 'Verilen producer UID auth.users tablosunda bulunamadı.';
  end if;

  insert into public.profiles (
    id,
    role,
    status,
    display_name,
    locale,
    city,
    district
  )
  values (
    producer_user_id,
    'producer'::public.profile_role,
    'active'::public.profile_status,
    'FEMORIA Demo Üreticisi',
    'tr'::public.locale_code,
    'İstanbul',
    'Kadıköy'
  )
  on conflict (id) do nothing;

  select role::text, status::text
  into producer_role, producer_status
  from public.profiles
  where id = producer_user_id;

  if producer_role is distinct from 'producer' or producer_status is distinct from 'active' then
    raise exception using
      message = 'Mevcut profile değiştirilmedi: seçilen kullanıcı role=producer ve status=active olmalıdır.';
  end if;

  insert into public.producer_profiles (
    profile_id,
    story_tr,
    story_en,
    verification_status,
    delivery_regions,
    approximate_area,
    approved_at
  )
  values (
    producer_user_id,
    'Yerel malzemelerle küçük ölçekte üretim yapan FEMORIA demo üreticisi.',
    'A FEMORIA demo maker producing in small batches with local materials.',
    'approved'::public.verification_status,
    '["İstanbul"]'::jsonb,
    'Kadıköy, İstanbul çevresi',
    now()
  )
  on conflict (profile_id) do nothing;

  select verification_status::text
  into producer_verification
  from public.producer_profiles
  where profile_id = producer_user_id;

  if producer_verification is distinct from 'approved' then
    raise exception using
      message = 'Mevcut producer_profiles kaydı değiştirilmedi: verification_status approved olmalıdır.';
  end if;

  insert into public.categories as current_category (
    slug,
    name_tr,
    name_en,
    kind,
    active,
    sort_order
  )
  values
    ('mutfak', 'Mutfak', 'Kitchen', 'food'::public.category_kind, true, 10),
    ('ev-yapimi-gida', 'Ev Yapımı Gıda', 'Homemade Food', 'food'::public.category_kind, true, 20),
    ('seramik', 'Seramik', 'Ceramics', 'craft'::public.category_kind, true, 30),
    ('tekstil', 'Tekstil', 'Textiles', 'craft'::public.category_kind, true, 40),
    ('ahsap-urunler', 'Ahşap Ürünler', 'Wooden Goods', 'craft'::public.category_kind, true, 50),
    ('taki-ve-aksesuar', 'Takı ve Aksesuar', 'Jewelry and Accessories', 'craft'::public.category_kind, true, 60)
  on conflict (slug) do update
  set
    active = excluded.active,
    sort_order = excluded.sort_order
  where current_category.name_tr = excluded.name_tr
    and current_category.name_en = excluded.name_en
    and current_category.kind = excluded.kind;

  select count(*)
  into valid_category_count
  from public.categories
  where active
    and (
      (slug = 'mutfak' and name_tr = 'Mutfak' and name_en = 'Kitchen' and kind = 'food')
      or (slug = 'ev-yapimi-gida' and name_tr = 'Ev Yapımı Gıda' and name_en = 'Homemade Food' and kind = 'food')
      or (slug = 'seramik' and name_tr = 'Seramik' and name_en = 'Ceramics' and kind = 'craft')
      or (slug = 'tekstil' and name_tr = 'Tekstil' and name_en = 'Textiles' and kind = 'craft')
      or (slug = 'ahsap-urunler' and name_tr = 'Ahşap Ürünler' and name_en = 'Wooden Goods' and kind = 'craft')
      or (slug = 'taki-ve-aksesuar' and name_tr = 'Takı ve Aksesuar' and name_en = 'Jewelry and Accessories' and kind = 'craft')
    );

  if valid_category_count <> 6 then
    raise exception using
      message = 'Bir veya daha fazla kategori slugı farklı bir mevcut kayıtla çakışıyor; mevcut kayıtlar değiştirilmedi.';
  end if;

  if exists (
    select 1
    from public.products
    where slug = any(seed_product_slugs)
      and producer_id <> producer_user_id
  ) then
    raise exception using
      message = 'Demo ürün sluglarından biri başka bir üreticiye ait; mevcut ürün değiştirilmedi.';
  end if;

  insert into public.products (
    producer_id,
    category_id,
    slug,
    title_tr,
    title_en,
    description_tr,
    description_en,
    price_minor,
    currency,
    status,
    stock_mode,
    stock_quantity,
    preparation_days,
    city,
    district
  )
  select
    producer_user_id,
    category.id,
    seed.slug,
    seed.title_tr,
    seed.title_en,
    seed.description_tr,
    seed.description_en,
    seed.price_minor,
    'TRY',
    'approved'::public.product_status,
    seed.stock_mode::public.stock_mode,
    seed.stock_quantity,
    seed.preparation_days,
    seed.city,
    seed.district
  from (
    values
      (
        'ev-yapimi-gida',
        'demo-ev-yapimi-cilek-receli',
        'Ev Yapımı Çilek Reçeli',
        'Homemade Strawberry Jam',
        'Mevsiminde toplanan çileklerle küçük partiler halinde hazırlanmış ev yapımı reçel.',
        'Homemade jam prepared in small batches with strawberries picked in season.',
        18900,
        'in_stock',
        24,
        1,
        'İstanbul',
        'Kadıköy'
      ),
      (
        'seramik',
        'demo-el-yapimi-seramik-kupa',
        'El Yapımı Seramik Kupa',
        'Handmade Ceramic Mug',
        'Elde şekillendirilmiş, benekli sırla tamamlanmış küçük seri seramik kupa.',
        'A small-batch ceramic mug shaped by hand and finished with a speckled glaze.',
        46500,
        'made_to_order',
        null,
        4,
        'İzmir',
        'Urla'
      ),
      (
        'ahsap-urunler',
        'demo-ahsap-sunum-tahtasi',
        'Ahşap Sunum Tahtası',
        'Wooden Serving Board',
        'Doğal ahşabın dokusu korunarak elde zımparalanmış çok amaçlı sunum tahtası.',
        'A versatile serving board hand-sanded while preserving the natural wood grain.',
        72000,
        'in_stock',
        8,
        2,
        'Bursa',
        'Nilüfer'
      ),
      (
        'tekstil',
        'demo-el-orgusu-canta',
        'El Örgüsü Çanta',
        'Hand-Knitted Bag',
        'Pamuk kordonla elde örülmüş, astarlı ve günlük kullanıma uygun omuz çantası.',
        'A lined shoulder bag hand-knitted with cotton cord for everyday use.',
        89500,
        'made_to_order',
        null,
        5,
        'Ankara',
        'Çankaya'
      ),
      (
        'ev-yapimi-gida',
        'demo-geleneksel-tarhana',
        'Geleneksel Tarhana',
        'Traditional Tarhana',
        'Mevsim sebzeleri ve yoğurtla hazırlanıp doğal yöntemlerle kurutulmuş tarhana.',
        'Tarhana prepared with seasonal vegetables and yogurt, then naturally dried.',
        24500,
        'in_stock',
        18,
        1,
        'Muğla',
        'Bodrum'
      ),
      (
        'seramik',
        'demo-minimal-seramik-vazo',
        'Minimal Seramik Vazo',
        'Minimal Ceramic Vase',
        'Sade formu ve mat yüzeyiyle her biri elde şekillendirilmiş seramik vazo.',
        'A hand-shaped ceramic vase with a simple form and a matte finish.',
        64000,
        'made_to_order',
        null,
        6,
        'İzmir',
        'Urla'
      ),
      (
        'taki-ve-aksesuar',
        'demo-gumus-renkli-bileklik',
        'El Yapımı Gümüş Renkli Bileklik',
        'Handmade Silver-Tone Bracelet',
        'Ayarlanabilir ölçülü, sade ve zamansız tasarıma sahip el yapımı bileklik.',
        'A handmade adjustable bracelet with a simple and timeless design.',
        53000,
        'in_stock',
        12,
        2,
        'İstanbul',
        'Beşiktaş'
      ),
      (
        'mutfak',
        'demo-ev-yapimi-eriste',
        'Ev Yapımı Yumurtalı Erişte',
        'Homemade Egg Noodles',
        'Yumurta ve unla hazırlanıp doğal olarak kurutulmuş geleneksel ev eriştesi.',
        'Traditional homemade egg noodles prepared with flour and naturally dried.',
        21500,
        'in_stock',
        20,
        1,
        'Ankara',
        'Çankaya'
      )
  ) as seed (
    category_slug,
    slug,
    title_tr,
    title_en,
    description_tr,
    description_en,
    price_minor,
    stock_mode,
    stock_quantity,
    preparation_days,
    city,
    district
  )
  join public.categories as category
    on category.slug = seed.category_slug
   and category.active
  on conflict (slug) do nothing;

  select count(*)
  into valid_product_count
  from public.products as product
  join public.categories as category on category.id = product.category_id
  where product.slug = any(seed_product_slugs)
    and product.producer_id = producer_user_id
    and product.status = 'approved'
    and category.active
    and category.kind in ('food', 'craft');

  if valid_product_count <> 8 then
    raise exception using
      message = 'Sekiz demo ürünün tamamı güvenli biçimde doğrulanamadı; transaction geri alındı.';
  end if;
end
$catalog_seed$;

commit;

/*
  OPSİYONEL PRODUCT_IMAGES SEED BÖLÜMÜ
  ====================================
  Önce gerçek görselleri Supabase Storage içindeki product-images bucket'ına yükleyin.
  Aşağıdaki dokuz STORAGE_PATH_BURAYA_* değerini bucket içindeki göreli yollarla
  değiştirin. HTTPS URL veya bucket URL'si yazmayın. Tüm yollar değiştirildikten
  sonra bu yorum bloğunun dışındaki işaretleri kaldırıp bölümü ayrıca çalıştırın.

begin;

do $image_seed$
declare
  seed_image record;
  seed_product_id uuid;
begin
  for seed_image in
    select *
    from (
      values
        ('demo-ev-yapimi-cilek-receli', 'STORAGE_PATH_BURAYA_01', 'Kavanozda ev yapımı çilek reçeli', 'Homemade strawberry jam in a jar', 0),
        ('demo-el-yapimi-seramik-kupa', 'STORAGE_PATH_BURAYA_02', 'El yapımı benekli seramik kupa', 'Handmade speckled ceramic mug', 0),
        ('demo-el-yapimi-seramik-kupa', 'STORAGE_PATH_BURAYA_03', 'Seramik kupanın yandan görünümü', 'Side view of the ceramic mug', 1),
        ('demo-ahsap-sunum-tahtasi', 'STORAGE_PATH_BURAYA_04', 'Doğal ahşap sunum tahtası', 'Natural wooden serving board', 0),
        ('demo-el-orgusu-canta', 'STORAGE_PATH_BURAYA_05', 'Pamuk kordon el örgüsü çanta', 'Hand-knitted cotton cord bag', 0),
        ('demo-geleneksel-tarhana', 'STORAGE_PATH_BURAYA_06', 'Kasede geleneksel tarhana', 'Traditional tarhana in a bowl', 0),
        ('demo-minimal-seramik-vazo', 'STORAGE_PATH_BURAYA_07', 'Mat yüzeyli minimal seramik vazo', 'Minimal ceramic vase with a matte finish', 0),
        ('demo-gumus-renkli-bileklik', 'STORAGE_PATH_BURAYA_08', 'El yapımı gümüş renkli bileklik', 'Handmade silver-tone bracelet', 0),
        ('demo-ev-yapimi-eriste', 'STORAGE_PATH_BURAYA_09', 'Doğal kurutulmuş ev eriştesi', 'Naturally dried homemade noodles', 0)
    ) as image (product_slug, storage_path, alt_tr, alt_en, sort_order)
  loop
    if seed_image.storage_path like 'STORAGE_PATH_BURAYA_%' then
      raise exception using
        message = 'Tüm STORAGE_PATH_BURAYA_* değerleri gerçek Storage yollarıyla değiştirilmelidir.';
    end if;

    select id
    into seed_product_id
    from public.products
    where slug = seed_image.product_slug;

    if seed_product_id is null then
      raise exception using
        message = format('Görsel ürünü bulunamadı: %s', seed_image.product_slug);
    end if;

    insert into public.product_images as current_image (
      product_id,
      storage_path,
      alt_tr,
      alt_en,
      sort_order
    )
    values (
      seed_product_id,
      seed_image.storage_path,
      seed_image.alt_tr,
      seed_image.alt_en,
      seed_image.sort_order
    )
    on conflict (product_id, storage_path) do update
    set
      alt_tr = excluded.alt_tr,
      alt_en = excluded.alt_en,
      sort_order = excluded.sort_order;
  end loop;
end
$image_seed$;

commit;
*/

-- DOĞRULAMA 1: Seed kategorileri
select
  id,
  slug,
  name_tr,
  name_en,
  kind,
  active,
  sort_order
from public.categories
where slug in (
  'mutfak',
  'ev-yapimi-gida',
  'seramik',
  'tekstil',
  'ahsap-urunler',
  'taki-ve-aksesuar'
)
order by sort_order, slug;

-- DOĞRULAMA 2: Seçilen producer profili
select
  profile.id,
  profile.role,
  profile.status,
  profile.display_name,
  producer.verification_status,
  producer.approximate_area,
  producer.approved_at
from public.profiles as profile
left join public.producer_profiles as producer on producer.profile_id = profile.id
where profile.id::text = '63434023-ed88-44ef-8d28-87233ce4afeb';

-- DOĞRULAMA 3: Approved ürünler ve kategorileri
select
  product.id,
  product.slug,
  product.title_tr,
  product.title_en,
  product.price_minor,
  product.currency,
  product.status,
  product.stock_mode,
  category.slug as category_slug,
  category.kind as category_kind,
  product.city,
  product.district
from public.products as product
join public.categories as category on category.id = product.category_id
where product.slug like 'demo-%'
order by category.kind, category.sort_order, product.slug;

-- DOĞRULAMA 4: product_images sıralaması
select
  product.slug as product_slug,
  image.storage_path,
  image.alt_tr,
  image.alt_en,
  image.sort_order
from public.products as product
left join public.product_images as image on image.product_id = product.id
where product.slug like 'demo-%'
order by product.slug, image.sort_order nulls last, image.storage_path;

-- DOĞRULAMA 5: Demo ürün sluglarının benzersizliği
-- Bu sorgu sıfır satır döndürmelidir.
select
  slug,
  count(*) as duplicate_count
from public.products
where slug like 'demo-%'
group by slug
having count(*) > 1
order by slug;
