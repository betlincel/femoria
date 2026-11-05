-- =====================================================================
-- Femoria — ürün çeşitliliğini artıran yeni kategoriler.
-- Seramik, ahşap, bez çanta, kişiye özel, kavanoz ürünler ve dondurulmuş
-- gıdayı sözlüğe ekler. Var olan kategoriler korunur.
-- =====================================================================

insert into public.categories (slug, name, icon, sort) values
  ('yemek',       'Yemek',          '🍲',  1),
  ('kavanoz',     'Kavanoz ürünler', '🍯',  2),
  ('kurutmalik',  'Kurutmalık',     '🌶️',  3),
  ('dondurulmus', 'Dondurulmuş',    '❄️',  4),
  ('orgu',        'Örgü',           '🧶',  5),
  ('seramik',     'Seramik',        '🏺',  6),
  ('ahsap',       'Ahşap',          '🪵',  7),
  ('bez-canta',   'Bez çanta',      '🛍️',  8),
  ('taki',        'Takı',           '📿',  9),
  ('kisiye-ozel', 'Kişiye özel',    '✨', 10),
  ('ev-susu',     'Ev süsü',        '🎀', 11),
  ('diger',       'Diğer',          '🎁', 12)
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      sort = excluded.sort;
