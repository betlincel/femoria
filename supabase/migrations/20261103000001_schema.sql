-- =====================================================================
-- Femoria — temel şema
-- Kullanıcı, ürün, konum, sohbet, sipariş, güven ve ölçüm tabloları.
-- Konum gizliliği: tam adres/koordinat hiçbir zaman saklanmaz; gelen
-- koordinatlar tetikleyicide ~500 m rastgele kaydırılır.
-- =====================================================================

-- ---------- Tipler ----------
create type public.delivery_method as enum ('elden', 'kargo', 'ikisi');
create type public.product_status  as enum ('taslak', 'satista', 'satildi', 'kaldirildi');
create type public.message_kind    as enum ('metin', 'hazir', 'ses', 'siparis', 'sistem');
create type public.order_status    as enum ('teklif', 'anlasildi', 'teslim_edildi', 'iptal');

-- ---------- Ortak yardımcılar ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Bir noktayı en fazla `meters` metre rastgele kaydırır (düzgün dağılım, daire içinde).
create or replace function public.jitter_point(
  p_lat double precision, p_lng double precision, meters double precision default 500
) returns double precision[] language plpgsql volatile as $$
declare
  r     double precision := meters * sqrt(random());
  theta double precision := 2 * pi() * random();
begin
  if p_lat is null or p_lng is null then
    return array[null, null]::double precision[];
  end if;
  return array[
    p_lat + (r * cos(theta)) / 111320.0,
    p_lng + (r * sin(theta)) / (111320.0 * cos(radians(p_lat)))
  ];
end $$;

-- İki nokta arası kuş uçuşu mesafe (km).
create or replace function public.distance_km(
  lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision
) returns double precision language sql immutable as $$
  select case when lat1 is null or lat2 is null then null else
    6371 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    )) end
$$;

-- ---------- Sözlük tabloları ----------
create table public.categories (
  slug  text primary key,
  name  text not null,
  icon  text not null,          -- büyük emoji/resim anahtarı (kutucuklar fotoğrafla tanınır)
  sort  int  not null default 0
);

-- Konum izni vermeyen kullanıcı il/ilçe/mahalle listesinden seçer.
create table public.locations (
  id           bigserial primary key,
  city         text not null,
  district     text not null,
  neighborhood text not null,
  lat          double precision not null,  -- mahalle merkezi (kamuya açık bilgi)
  lng          double precision not null,
  unique (city, district, neighborhood)
);

-- ---------- Profil (tek hesap: alıcı + satıcı) ----------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  full_name             text,
  avatar_url            text,
  city                  text,
  district              text,
  neighborhood          text,
  approx_lat            double precision,   -- kaydırılmış (yaklaşık) konum
  approx_lng            double precision,
  phone_verified        boolean not null default false,
  identity_verified     boolean not null default false,
  cooperative_name      text,
  mentor_id             uuid references public.profiles (id) on delete set null, -- Abla–Kardeş
  -- Ayarlar (≤ 5 madde + güvenlik)
  font_scale            numeric(3, 2) not null default 1.0 check (font_scale between 0.8 and 1.6),
  tts_enabled           boolean not null default true,
  notifications_enabled boolean not null default true,
  quiet_hours_enabled   boolean not null default false,  -- 22:00–08:00 gece sessizliği
  only_trusted_messages boolean not null default false,  -- kadın satıcı koruması
  assistant_look        text not null default 'basortulu' check (assistant_look in ('basortulu', 'basi_acik')),
  emergency_name        text,
  emergency_phone       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Konum her kayıtta rastgele kaydırılır; istemci ne gönderirse göndersin tam konum saklanmaz.
create or replace function public.profiles_jitter_location()
returns trigger language plpgsql as $$
declare j double precision[];
begin
  if tg_op = 'INSERT'
     or new.approx_lat is distinct from old.approx_lat
     or new.approx_lng is distinct from old.approx_lng then
    j := public.jitter_point(new.approx_lat, new.approx_lng, 500);
    new.approx_lat := j[1];
    new.approx_lng := j[2];
  end if;
  return new;
end $$;

create trigger profiles_jitter before insert or update on public.profiles
  for each row execute function public.profiles_jitter_location();

-- Kullanıcılar doğrulama/kooperatif alanlarını kendileri değiştiremez.
create or replace function public.profiles_protect_columns()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.phone_verified    := old.phone_verified;
    new.identity_verified := old.identity_verified;
    new.cooperative_name  := old.cooperative_name;
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.profiles_protect_columns();

-- Telefonla kayıt olunca profil otomatik açılır.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone_verified)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_phone_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.phone_confirmed_at is not null and old.phone_confirmed_at is null then
    update public.profiles set phone_verified = true where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_phone_confirmed after update of phone_confirmed_at on auth.users
  for each row execute function public.handle_user_phone_confirmed();

-- ---------- Ürünler ----------
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title            text not null check (char_length(title) between 2 and 120),
  description      text check (char_length(description) <= 2000),
  category         text not null references public.categories (slug),
  price            numeric(10, 2) not null check (price >= 0),
  delivery         public.delivery_method not null default 'elden',
  photos           text[] not null default '{}' check (cardinality(photos) <= 4),
  status           public.product_status not null default 'satista',
  voice_transcript text,          -- "Sesle Vitrin": kullanıcının söylediği ham metin
  approx_lat       double precision,
  approx_lng       double precision,
  city             text,
  district         text,
  neighborhood     text,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index products_status_published_idx on public.products (status, published_at desc);
create index products_seller_idx on public.products (seller_id);
create index products_category_idx on public.products (category) where status = 'satista';
create index products_district_idx on public.products (city, district) where status = 'satista';

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Ürün, satıcının yaklaşık konumunu (bir kez daha kaydırılmış olarak) devralır.
create or replace function public.products_fill_location()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  j double precision[];
begin
  if tg_op = 'INSERT' or new.seller_id is distinct from old.seller_id then
    select * into p from public.profiles where id = new.seller_id;
    j := public.jitter_point(p.approx_lat, p.approx_lng, 200);
    new.approx_lat   := j[1];
    new.approx_lng   := j[2];
    new.city         := p.city;
    new.district     := p.district;
    new.neighborhood := p.neighborhood;
  end if;
  if new.status = 'satista' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger products_location before insert or update on public.products
  for each row execute function public.products_fill_location();

-- ---------- Sohbet ----------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  buyer_id        uuid not null references public.profiles (id) on delete cascade,
  seller_id       uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  buyer_last_read_at  timestamptz,
  seller_last_read_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (product_id, buyer_id),
  check (buyer_id <> seller_id)
);

create index conversations_buyer_idx  on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  product_id      uuid not null references public.products (id) on delete cascade,
  buyer_id        uuid not null references public.profiles (id) on delete cascade,
  seller_id       uuid not null references public.profiles (id) on delete cascade,
  quantity        int not null default 1 check (quantity > 0),
  unit_price      numeric(10, 2) not null check (unit_price >= 0),
  delivery        public.delivery_method not null default 'elden',
  promised_date   date,
  buyer_agreed    boolean not null default false,
  seller_agreed   boolean not null default false,
  status          public.order_status not null default 'teklif',
  agreed_at       timestamptz,
  delivered_at    timestamptz,
  created_by      uuid not null default auth.uid() references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index orders_seller_idx on public.orders (seller_id, status);
create index orders_buyer_idx  on public.orders (buyer_id, status);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid default auth.uid() references public.profiles (id) on delete set null, -- sistem mesajında null
  kind            public.message_kind not null default 'metin',
  body            text check (char_length(body) <= 2000),
  audio_path      text,          -- voice-messages kovasında yol
  transcript      text,          -- sesli mesajın yazıya çevrilmiş hali
  order_id        uuid references public.orders (id) on delete set null,
  flags           text[] not null default '{}',  -- akıllı mesaj kalkanı: telefon, iban, kapora...
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------- Güven ----------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_id     uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  product_id      uuid references public.products (id) on delete set null,
  reason          text not null default 'Rahatsız oldum',
  note            text,  -- açıklama zorunlu değil
  created_at      timestamptz not null default now()
);

-- ---------- Emek Defteri ve Komşu Rozetleri ----------
create table public.badges (
  slug        text primary key,
  name        text not null,
  description text not null,
  icon        text not null
);

create table public.user_badges (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  badge_slug text not null references public.badges (slug) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_slug)
);

-- ---------- Duyurular (kooperatif / el emeği pazarı / buluşma günleri) ----------
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  image_url  text,
  city       text,
  district   text,
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- "Mahallende Aranıyor" talep panosu ----------
create table public.search_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid default auth.uid() references public.profiles (id) on delete set null,
  query        text not null check (char_length(query) between 2 and 200),
  category     text references public.categories (slug),
  city         text,
  district     text,
  neighborhood text,
  created_at   timestamptz not null default now()
);

create index search_requests_district_idx on public.search_requests (city, district, created_at desc);

-- ---------- Ölçüm (formdaki başarı ölçütleri) ----------
create table public.events (
  id         bigserial primary key,
  user_id    uuid default auth.uid() references public.profiles (id) on delete set null,
  session_id text,
  name       text not null check (char_length(name) <= 64),
  props      jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index events_name_idx on public.events (name, created_at);

-- Ayşe Abla geri bildirimleri ("anket hissi vermeden")
create table public.assistant_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid default auth.uid() references public.profiles (id) on delete set null,
  session_id   text,
  question_key text not null,
  answer       text not null,
  created_at   timestamptz not null default now()
);
