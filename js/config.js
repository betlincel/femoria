// Supabase bağlantı ayarları.
// Supabase Dashboard > Project Settings > API sayfasından kopyalayın.
// "anon" anahtarı tarayıcıda kullanılmak üzere tasarlanmıştır; veriyi RLS kuralları korur.
// service_role anahtarını ASLA buraya yazmayın.
//
// Yerel geliştirme (`supabase start`) için:
//   SUPABASE_URL      = "http://127.0.0.1:54321"
//   SUPABASE_ANON_KEY = `supabase status` çıktısındaki "anon key"

// Publishable key (sb_publishable_...) eski "anon" anahtarının yerini alır.
// Secret key (sb_secret_...) ASLA buraya yazılmaz.
export const SUPABASE_URL = "https://hxikkkdimeykmwzhrvjt.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_KdeZVXQMZAmgrOrOIvzpKA_4aPnrdaq";

// Yasal metinlerde görünen işletme bilgileri (boş bırakılanlar köşeli parantezle görünür; yayından önce doldurun).
export const LEGAL = { company: "", address: "", email: "", taxNo: "" };
