// ===== SUPABASE CONFIG =====
const SUPABASE_URL = 'https://httrzeeiwfnuqooxnkwu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dHJ6ZWVpd2ZudXFvb3hua3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTY2NjcsImV4cCI6MjA5NzEzMjY2N30.SWaLZNZYOTaFh8Gr00rPjXa8yYJUHkDEPqlHyjatWdY';
// مخزن جلسة مستقلّ للأدمن فقط (storageKey مختلف) — والباقي افتراضي يعمل على http
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: 'tt-admin-auth' }
});

// ===== وضع التشغيل =====
const USE_FIREBASE = true;

// ===== طبقة التحويل بين أسماء حقول الواجهة (camelCase) وأعمدة قاعدة البيانات (snake_case) =====
function mapAdRow(d) {
  return { id: d.id, ref: d.ref || '', catId: d.category || d.catId || '', title: d.title || '', price: d.price || 0, location: d.location || '', city: d.city || '', neighborhood: d.neighborhood || '', desc: d.description || d.desc || '', phone: d.phone || '', images: d.images || [], image_ids: d.image_ids || [], featured: d.featured || false, negotiable: d.negotiable || false, rooms: d.rooms, baths: d.baths, area: d.area, kitchens: d.kitchens, balconies: d.balconies, living: d.living, storage: d.storage, carType: d.car_type, carModel: d.car_model, carYear: d.car_year, carKm: d.car_km, carColor: d.car_color, carClass: d.car_class, profession: d.profession, createdAt: d.created_at };
}
function toRow(ad) {
  const catId = ad.catId || '';
  const prefix = catId.split('-')[0];
  const type = prefix === 'apt' ? 'apartment' : prefix === 'car' ? 'car' : prefix === 'equip' ? 'equipment' : prefix === 'free' ? 'free' : null;
  const action = catId.includes('rent') ? 'rent' : catId.includes('sale') ? 'sale' : null;
  const row = {
    category: ad.catId, type, action,
    title: ad.title, description: ad.desc ?? null, price: ad.price ?? 0,
    negotiable: !!ad.negotiable, featured: !!ad.featured,
    city: ad.city ?? null, neighborhood: ad.neighborhood ?? null, location: ad.location ?? null, phone: ad.phone ?? null,
    images: ad.images || [], image_ids: ad.image_ids || [],
    rooms: ad.rooms ?? null, baths: ad.baths ?? null, area: ad.area ?? null, kitchens: ad.kitchens ?? null,
    balconies: ad.balconies ?? null, living: ad.living ?? null, storage: ad.storage ?? null,
    car_type: ad.carType ?? null, car_model: ad.carModel ?? null, car_year: ad.carYear ?? null,
    car_km: ad.carKm ?? null, car_color: ad.carColor ?? null, car_class: ad.carClass ?? null,
    profession: ad.profession ?? null
  };
  if (ad.ref !== undefined) row.ref = ad.ref;
  return row;
}

// ===== AUTH =====
// أضف مؤشر تحميل على شاشة اللوغين ريثما يتحقق Firebase
let authResolved = false;
document.getElementById('loginBtn').insertAdjacentHTML('afterend', 
  '<div id="authLoader" style="margin-top:16px;font-size:13px;color:#a3a3a3;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px"><svg style="animation:spin 1s linear infinite;width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0"/></svg>جارٍ التحقق...</div><style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>'
);

async function doLogin() {
  if (!USE_FIREBASE) { document.getElementById('loginScreen').style.display = 'none'; return; }
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  
  if (!email || !pass) { 
    errEl.textContent = 'يرجى إدخال البريد وكلمة السر'; 
    errEl.style.display = 'block'; 
    return; 
  }
  
  btn.disabled = true; 
  btn.textContent = 'جارٍ الدخول...';
  errEl.style.display = 'none';
  
  try {
    // تسجيل دخول مباشر (نفس أسلوب الموقع العام الذي يعمل)
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;

    // عند النجاح، سيقوم onAuthStateChange بإخفاء الشاشة، ولكن سنقوم بذلك هنا أيضاً للتأكيد
    document.getElementById('loginScreen').style.display = 'none';
    console.log("Login successful");
  } catch(e) {
    console.error("Login error details:", e);
    btn.disabled = false;
    btn.textContent = 'تسجيل الدخول';

    const msg = (e && e.message) || '';
    if (msg === 'timeout') {
      errEl.textContent = 'استغرق الاتصال وقتاً طويلاً، يرجى المحاولة مرة أخرى';
    } else if (/network|fetch/i.test(msg)) {
      errEl.textContent = 'خطأ في الاتصال، يرجى التحقق من الإنترنت';
    } else if (/invalid login|invalid credentials|credentials/i.test(msg)) {
      errEl.textContent = 'بيانات الدخول غير صحيحة';
    } else if (/rate limit|too many/i.test(msg)) {
      errEl.textContent = 'محاولات كثيرة خاطئة، يرجى الانتظار قليلاً';
    } else {
      errEl.textContent = 'خطأ: ' + (msg || 'حاول مرة أخرى');
    }
    errEl.style.display = 'block';
  }
}
function handleAuthState(user) {
  authResolved = true;
  const loader = document.getElementById('authLoader');
  if (loader) loader.style.display = 'none';
  // إظهار/إخفاء شاشة الدخول حسب وجود جلسة فقط (بلا قراءة قاعدة بيانات تكسر الريفريش).
  // الحماية الحقيقية عبر RLS: غير الكادر لا يقرأ/يعدّل أي بيانات إدارية.
  document.getElementById('loginScreen').style.display = user ? 'none' : 'flex';
}
supabaseClient.auth.onAuthStateChange((event, session) => handleAuthState(session && session.user));
supabaseClient.auth.getSession().then(({ data }) => handleAuthState(data.session && data.session.user));
// Fallback: إذا لم يستجب Firebase بعد 8 ثوانٍ (الموبايل أبطأ)، أظهر شاشة اللوغين
setTimeout(() => {
  if (!authResolved) {
    const ls = document.getElementById('loginScreen');
    const loader = document.getElementById('authLoader');
    if (loader) loader.style.display = 'none';
    if (ls) ls.style.display = 'flex';
    authResolved = true;
  }
}, 8000);
function doLogout() {
  if (USE_FIREBASE) {
    supabaseClient.auth.signOut().then(() => {
      document.getElementById('loginScreen').style.display = 'flex';
      location.reload();
    });
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
  }
}

// ===== SUPABASE CRUD =====
async function fbSaveAd(ad) {
  if (ad.id) {
    await supabaseClient.from('ads').update(toRow(ad)).eq('id', ad.id);
  } else {
    const row = toRow(ad); row.status = 'active'; row.views = 0;
    const { data } = await supabaseClient.from('ads').insert(row).select('id').single();
    if (data) ad.id = data.id;
  }
  return ad;
}
async function fbDeleteAd(adId, imageIds) {
  // حذف الصور من Supabase Storage
  const paths = (imageIds || []).filter(Boolean);
  if (paths.length) { try { await supabaseClient.storage.from('ads').remove(paths); } catch(e) {} }
  await supabaseClient.from('ads').delete().eq('id', adId);
}
async function fbLoadAds() {
  const { data } = await supabaseClient.from('ads').select('*').eq('status', 'active');
  return (data || []).map(mapAdRow);
}


/* ===== DATA ===== */
const CATS = [
  { id: 'apt-rent', label: 'شقق للإيجار', type: 'apartment', action: 'rent' },
  { id: 'apt-sale', label: 'شقق للبيع', type: 'apartment', action: 'sale' },
  { id: 'car-rent', label: 'سيارات للإيجار', type: 'car', action: 'rent' },
  { id: 'car-sale', label: 'سيارات للبيع', type: 'car', action: 'sale' },
  { id: 'equip-rent', label: 'معدات للإيجار', type: 'equipment', action: 'rent' },
  { id: 'equip-sale', label: 'معدات للبيع', type: 'equipment', action: 'sale' },
  { id: 'free-ad', label: 'إعلانات مجانية', type: 'freead', action: 'free' },
];

const CITIES = ['جبلة', 'اللاذقية', 'أخرى'];

const NEIGHBORHOODS = {
  'جبلة': ['حي العمارة','حي العزي','حي الدريبة','حي القلعة',
    'حي السوق (المدينة القديمة)','حي الفيض','حي الجبيبات','حي النقعة',
    'حي الميناء','حي الكورنيش','حي التغرة','حي الجركس',
    'حي جب جويخة','المتحلق','حي الصليبة','حي المهجع',
    'حي المفيض','ضاحية المجد'],
  'اللاذقية': ['حي العمارة','حي العزي','حي الدريبة','حي القلعة',
    'حي السوق (المدينة القديمة)','حي الفيض','حي الجبيبات','حي النقعة',
    'حي الميناء','حي الكورنيش','حي التغرة','حي الجركس',
    'حي جب جويخة','المتحلق','حي الصليبة','حي المهجع',
    'حي المفيض','ضاحية المجد']
};

// For backward compatibility
const LOCS = NEIGHBORHOODS['جبلة'];

const CAR_BRANDS = ['تويوتا','هيونداي','كيا','نيسان','شيفروليه','سوزوكي','فورد','مرسيدس','بي إم دبليو','هوندا','مازدا','ميتسوبيشي','فولكس واغن','بيجو','رينو','سكودا','أوبل','فيات','MG','شيري','جيلي','BYD'];
const CAR_CLASSES = ['سيدان','هاتشباك','SUV','بيك أب','فان','كوبيه','كروس أوفر'];

const MONTHS = ['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول'];
const DAYS_NAMES = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];

const getCat = id => CATS.find(c => c.id === id);
const isApt = id => getCat(id)?.type === 'apartment';
const isCar = id => getCat(id)?.type === 'car';
const isEquip = id => getCat(id)?.type === 'equipment';
const isFreeAd = id => getCat(id)?.type === 'freead';
const isRent = id => id?.includes('rent');

function fmtPrice(p) {
  if (p === 0) return 'مجاني';
  return Number(p).toLocaleString('en-US') + ' ل.س';
}

/* ===== DATA STORAGE ===== */
const STORAGE_KEY = 'talbaktem_admin_ads';
const BLOCKED_KEY = 'talbaktem_blocked_dates';

function loadAdsLocal() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return JSON.parse(data);
  return [];
}

async function loadAdsFirebase() {
  try {
    const { data, error } = await supabaseClient.from('ads').select('*').eq('status','active').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapAdRow);
  } catch(e) { console.error('Supabase load error:', e); return []; }
}

function loadAds() { return loadAdsLocal(); }
function saveAds(ads) { localStorage.setItem(STORAGE_KEY, JSON.stringify(ads)); }
function loadBlocked() { return JSON.parse(localStorage.getItem(BLOCKED_KEY) || '{}'); }
function saveBlocked(data) {
  localStorage.setItem(BLOCKED_KEY, JSON.stringify(data));
  if (USE_FIREBASE) {
    supabaseClient.from('settings').upsert({ key: 'blocked_dates', data })
      .then(({ error }) => { if (error) console.error('Error saving blocked dates:', error); });
  }
}
async function loadBlockedFromFirebase() {
  if (!USE_FIREBASE) return;
  try {
    const { data } = await supabaseClient.from('settings').select('data').eq('key', 'blocked_dates').maybeSingle();
    if (data && data.data) {
      localStorage.setItem(BLOCKED_KEY, JSON.stringify(data.data));
    }
  } catch(e) { console.error('Error loading blocked dates:', e); }
}
if (USE_FIREBASE) loadBlockedFromFirebase();

let ads = loadAds();
let currentPage = 1;
const PER_PAGE = 8;
let editingId = null;

/* ===== GENERATE REF ===== */
function genRef() {
  const nums = ads.map(a => {
    const m = a.ref.match(/TT-(\d+)/);
    return m ? parseInt(m[1]) : 0;
  });
  const next = (Math.max(0, ...nums) + 1).toString().padStart(4, '0');
  return 'TT-' + next;
}

/* ===== SIDEBAR ===== */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
function showSection(section) {
  closeSidebar();
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-section="${section}"]`).classList.add('active');
  document.getElementById('sectionAds').style.display = section === 'ads' ? 'block' : 'none';
  document.getElementById('sectionStats').style.display = section === 'stats' ? 'block' : 'none';
  document.getElementById('sectionDeals').style.display = section === 'deals' ? 'block' : 'none';
  document.getElementById('sectionInbox').style.display = section === 'inbox' ? 'block' : 'none';
  document.getElementById('sectionBookings').style.display = section === 'bookings' ? 'block' : 'none';
  document.getElementById('sectionCustomers').style.display = section === 'customers' ? 'block' : 'none';
  document.getElementById('sectionSettings').style.display = section === 'settings' ? 'block' : 'none';
  if (section === 'stats') renderStats();
  if (section === 'deals') { renderDeals(); setTimeout(() => lucide.createIcons(), 50); }
  if (section === 'inbox' && window._aiLoad) window._aiLoad();
  if (section === 'bookings') loadBookings();
  if (section === 'customers') loadCustomers();
  if (section === 'settings') renderSettings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ===== العملاء + الإعدادات ===== */
function _esc(s){ const d=document.createElement('div'); d.textContent = s==null?'':s; return d.innerHTML; }
let _customers = [];
async function loadCustomers() {
  const grid = document.getElementById('customersGrid');
  grid.innerHTML = '<div style="color:#94a3b8">جارٍ التحميل...</div>';
  const { data, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { grid.innerHTML = 'تعذّر التحميل: ' + _esc(error.message); return; }
  _customers = (data || []).filter(p => !p.role || p.role === 'user');
  renderCustomers();
}
function renderCustomers() {
  const q = (document.getElementById('custSearch').value || '').trim().toLowerCase();
  const grid = document.getElementById('customersGrid');
  const empty = document.getElementById('customersEmpty');
  const list = _customers.filter(c => !q
    || (c.full_name || '').toLowerCase().includes(q)
    || (c.email || '').toLowerCase().includes(q)
    || (c.phone || '').includes(q));
  if (!list.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  grid.innerHTML = list.map(c => {
    const nm = c.full_name || (c.email || '').split('@')[0] || 'عميل';
    const av = (nm.charAt(0) || '؟').toUpperCase();
    return `<div style="background:#fff;border:1px solid #eef2f7;border-radius:16px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:46px;height:46px;border-radius:50%;background:#F6921E;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem">${_esc(av)}</div>
        <div style="flex:1;overflow:hidden"><div style="font-weight:800;color:#0f172a">${_esc(nm)}</div><div style="font-size:12px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis">${_esc(c.email || '')}</div></div>
        ${c.blocked ? '<span style="background:#fee2e2;color:#b91c1c;padding:3px 9px;border-radius:8px;font-size:11px;font-weight:800">محظور</span>' : ''}
      </div>
      <div style="margin-top:12px;font-size:13px;color:#475569;line-height:2">📞 ${_esc(c.phone || '—')}<br>📍 ${_esc(c.address || '—')}</div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button onclick="openCustomerChat('${c.user_id}')" style="flex:1;background:#0f172a;color:#fff;border:none;border-radius:10px;padding:9px;font-weight:700;font-family:inherit;cursor:pointer">المحادثات</button>
        <button onclick="toggleBlock('${c.user_id}',${c.blocked ? 'false' : 'true'})" style="flex:1;background:${c.blocked ? '#dcfce7' : '#fee2e2'};color:${c.blocked ? '#15803d' : '#b91c1c'};border:none;border-radius:10px;padding:9px;font-weight:800;font-family:inherit;cursor:pointer">${c.blocked ? 'فك الحظر' : 'حظر'}</button>
      </div>
    </div>`;
  }).join('');
}
async function toggleBlock(userId, block) {
  block = (block === true || block === 'true');
  if (block && !confirm('حظر هذا العميل؟ لن يستطيع الدخول أو المراسلة.')) return;
  const { error } = await supabaseClient.from('profiles').update({ blocked: block }).eq('user_id', userId);
  if (error) { toast('تعذّر: ' + error.message, 'error'); return; }
  const c = _customers.find(x => x.user_id === userId); if (c) c.blocked = block;
  renderCustomers();
  toast(block ? 'تم حظر العميل' : 'تم فك الحظر', 'success');
}
function openCustomerChat(userId) {
  showSection('inbox');
  if (window._aiOpenUser) window._aiOpenUser(userId);
}
// فتح ملف العميل من المحادثة (يبحث عنه في قسم العملاء)
function openCustomerProfile(email) {
  document.getElementById('custSearch').value = email || '';
  showSection('customers');
}

/* ===== طلبات الحجز ===== */
let _bookings = [];
async function loadBookings() {
  const grid = document.getElementById('bookingsGrid');
  grid.innerHTML = '<div style="color:#94a3b8">جارٍ التحميل...</div>';
  const { data, error } = await supabaseClient.from('bookings').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (error) { grid.innerHTML = 'تعذّر التحميل: ' + _esc(error.message); return; }
  _bookings = data || [];
  renderBookings();
  refreshBookingBadge();
  loadCompletedBookings();
}
function renderBookings() {
  const grid = document.getElementById('bookingsGrid');
  const empty = document.getElementById('bookingsEmpty');
  if (!_bookings.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  grid.innerHTML = _bookings.map(b => {
    let badge, dates;
    if (b.deal_type === 'sale') { badge = 'طلب شراء'; dates = ''; }
    else if (b.deal_type === 'monthly') { badge = 'إيجار شهري'; dates = 'شهري · ' + (b.months ? b.months + ' شهر' : 'مدة مفتوحة'); }
    else { badge = 'حجز يومي'; dates = (b.date_from || '') + ' ← ' + (b.date_to || '') + ' (' + (b.days || 0) + ' يوم)'; }
    return `<div style="background:#fff;border:1px solid #eef2f7;border-radius:16px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
      <div style="display:flex;gap:10px;align-items:center">
        ${b.ad_image ? `<img src="${_esc(b.ad_image)}" style="width:56px;height:56px;border-radius:10px;object-fit:cover">` : ''}
        <div style="flex:1;overflow:hidden"><div style="font-weight:800">${_esc(b.ad_title || 'إعلان')}</div><div style="font-size:12px;color:#94a3b8">${_esc(b.ad_ref || '')}</div></div>
        <span style="background:#fff7ed;color:#F6921E;padding:3px 9px;border-radius:8px;font-size:11px;font-weight:800">${badge}</span>
      </div>
      <div style="margin-top:12px;font-size:13px;color:#475569;line-height:2">
        ${dates ? '📅 ' + _esc(dates) + '<br>' : ''}
        💰 ${b.total_price ? Number(b.total_price).toLocaleString('en-US') + ' ل.س' : 'يُتفق عليه'}<br>
        👤 ${_esc(b.client_name || '')} · ${_esc(b.client_phone || '')}
        ${b.client_address ? '<br>📍 ' + _esc(b.client_address) : ''}
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button onclick="confirmBooking(${b.id})" style="flex:1;background:#16a34a;color:#fff;border:none;border-radius:10px;padding:10px;font-weight:800;font-family:inherit;cursor:pointer">تأكيد</button>
        <button onclick="rejectBooking(${b.id})" style="flex:1;background:#fee2e2;color:#b91c1c;border:none;border-radius:10px;padding:10px;font-weight:800;font-family:inherit;cursor:pointer">رفض</button>
      </div>
    </div>`;
  }).join('');
}
async function refreshBookingBadge() {
  try {
    const { count } = await supabaseClient.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    const b = document.getElementById('navBookingCount');
    if (b) { b.textContent = count || 0; b.style.display = (count > 0) ? 'inline-block' : 'none'; }
  } catch (e) {}
}
// تعطيل نطاق أيام لإعلان في settings.blocked_dates
async function blockDatesForAd(adId, fromISO, toISO) {
  const { data } = await supabaseClient.from('settings').select('data').eq('key', 'blocked_dates').maybeSingle();
  const blocked = (data && data.data) ? data.data : {};
  const key = String(adId);
  const arr = blocked[key] || [];
  let cur = new Date(fromISO), end = new Date(toISO);
  while (cur <= end) {
    const k = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
    if (!arr.includes(k)) arr.push(k);
    cur.setDate(cur.getDate() + 1);
  }
  blocked[key] = arr;
  await supabaseClient.from('settings').upsert({ key: 'blocked_dates', data: blocked });
}
async function confirmBooking(id) {
  const bk = _bookings.find(x => x.id === id);
  if (!bk) return;
  if (!confirm('تأكيد هذا الطلب؟ ستُعطّل الأيام المحجوزة (للحجز اليومي) لمنع الحجز المزدوج.')) return;
  try {
    if (bk.deal_type === 'rent' && bk.date_from && bk.date_to && bk.ad_id != null) {
      await blockDatesForAd(bk.ad_id, bk.date_from, bk.date_to);
    }
    const { error: ue } = await supabaseClient.from('bookings').update({ status: 'confirmed' }).eq('id', id);
    if (ue) throw ue;
    _bookings = _bookings.filter(x => x.id !== id);
    renderBookings(); refreshBookingBadge(); loadCompletedBookings();
    toast('تم تأكيد الطلب ✓', 'success');
  } catch (e) { toast('تعذّر: ' + e.message, 'error'); }
}

/* ===== الحجوزات المؤكّدة (تعديل/حذف) ===== */
let _completed = [];
async function loadCompletedBookings() {
  const grid = document.getElementById('completedGrid');
  if (!grid) return;
  const { data, error } = await supabaseClient.from('bookings').select('*').eq('status', 'confirmed').order('created_at', { ascending: false });
  if (error) { grid.innerHTML = 'تعذّر التحميل'; return; }
  _completed = data || [];
  renderCompletedBookings();
}
function renderCompletedBookings() {
  const grid = document.getElementById('completedGrid');
  const empty = document.getElementById('completedEmpty');
  if (!grid) return;
  if (!_completed.length) { grid.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = _completed.map(b => {
    let badge, dates;
    if (b.deal_type === 'sale') { badge = 'بيع'; dates = ''; }
    else if (b.deal_type === 'monthly') { badge = 'إيجار شهري'; dates = (b.months ? b.months + ' شهر' : 'مدة مفتوحة'); }
    else { badge = 'إيجار يومي'; dates = (b.date_from || '') + ' ← ' + (b.date_to || '') + ' (' + (b.days || 0) + ' يوم)'; }
    return `<div style="background:#fff;border:1px solid #eef2f7;border-radius:16px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
      <div style="display:flex;gap:10px;align-items:center">
        ${b.ad_image ? `<img src="${_esc(b.ad_image)}" style="width:52px;height:52px;border-radius:10px;object-fit:cover">` : ''}
        <div style="flex:1;overflow:hidden"><div style="font-weight:800">${_esc(b.ad_title || 'إعلان')}</div><div style="font-size:12px;color:#94a3b8">${_esc(b.ad_ref || '')}</div></div>
        <span style="background:#dcfce7;color:#15803d;padding:3px 9px;border-radius:8px;font-size:11px;font-weight:800">${badge}</span>
      </div>
      <div style="margin-top:10px;font-size:13px;color:#475569;line-height:2">
        ${dates ? '📅 ' + _esc(dates) + '<br>' : ''}
        💰 ${b.total_price ? Number(b.total_price).toLocaleString('en-US') + ' ل.س' : 'يُتفق عليه'}<br>
        👤 ${_esc(b.client_name || '')} · ${_esc(b.client_phone || '')}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="editBooking(${b.id})" style="flex:1;background:#f1f5f9;border:none;border-radius:10px;padding:9px;font-weight:700;font-family:inherit;cursor:pointer">تعديل</button>
        <button onclick="deleteBooking(${b.id})" style="flex:1;background:#fee2e2;color:#b91c1c;border:none;border-radius:10px;padding:9px;font-weight:800;font-family:inherit;cursor:pointer">حذف</button>
      </div>
    </div>`;
  }).join('');
}
async function editBooking(id) {
  const b = _completed.find(x => x.id === id); if (!b) return;
  const name = prompt('اسم العميل:', b.client_name || ''); if (name === null) return;
  const phone = prompt('الهاتف:', b.client_phone || ''); if (phone === null) return;
  const total = prompt('القيمة الإجمالية (ل.س):', b.total_price != null ? b.total_price : ''); if (total === null) return;
  const upd = { client_name: name.trim(), client_phone: phone.trim(), total_price: total === '' ? null : (Number(total) || b.total_price) };
  const { error } = await supabaseClient.from('bookings').update(upd).eq('id', id);
  if (error) { toast('تعذّر: ' + error.message, 'error'); return; }
  toast('تم التعديل ✓', 'success'); loadCompletedBookings();
}
async function deleteBooking(id) {
  const b = _completed.find(x => x.id === id); if (!b) return;
  if (!confirm('حذف هذا الحجز نهائياً؟ ستُفرَّغ أيامه المحجوزة.')) return;
  try {
    if (b.deal_type === 'rent' && b.date_from && b.date_to && b.ad_id != null) {
      await unblockDatesForAd(b.ad_id, b.date_from, b.date_to);
    }
    const { error } = await supabaseClient.from('bookings').delete().eq('id', id);
    if (error) throw error;
    toast('تم الحذف ✓', 'success'); loadCompletedBookings();
  } catch (e) { toast('تعذّر: ' + e.message, 'error'); }
}
async function unblockDatesForAd(adId, fromISO, toISO) {
  const { data } = await supabaseClient.from('settings').select('data').eq('key', 'blocked_dates').maybeSingle();
  const blocked = (data && data.data) ? data.data : {};
  const key = String(adId);
  if (!blocked[key]) return;
  const remove = new Set();
  let cur = new Date(fromISO), end = new Date(toISO);
  while (cur <= end) { remove.add(cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0')); cur.setDate(cur.getDate() + 1); }
  blocked[key] = blocked[key].filter(d => !remove.has(d));
  await supabaseClient.from('settings').upsert({ key: 'blocked_dates', data: blocked });
}
async function rejectBooking(id) {
  if (!confirm('رفض هذا الطلب؟')) return;
  const { error } = await supabaseClient.from('bookings').update({ status: 'rejected' }).eq('id', id);
  if (error) { toast('تعذّر: ' + error.message, 'error'); return; }
  _bookings = _bookings.filter(x => x.id !== id);
  renderBookings(); refreshBookingBadge();
  toast('تم رفض الطلب', 'success');
}
// تحميل العدّاد + اشتراك لحظي للطلبات الجديدة
supabaseClient.auth.getSession().then(({ data }) => {
  if (!data.session) return;
  refreshBookingBadge();
  supabaseClient.channel('admin-bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
      refreshBookingBadge();
      const sec = document.getElementById('sectionBookings');
      if (sec && sec.style.display !== 'none') loadBookings();
    }).subscribe();
});

async function renderSettings() {
  const grid = document.getElementById('staffGrid');
  grid.innerHTML = '<div style="color:#94a3b8">جارٍ التحميل...</div>';
  const { data, error } = await supabaseClient.from('profiles').select('*').in('role', ['admin', 'manager']).order('created_at');
  if (error) { grid.innerHTML = 'تعذّر التحميل'; return; }
  const me = (await supabaseClient.auth.getUser()).data.user;
  const myRow = (data || []).find(p => p.user_id === (me && me.id));
  const isMgr = myRow && myRow.role === 'manager';
  grid.innerHTML = (data || []).map(s => {
    const nm = s.full_name || (s.email || '').split('@')[0] || 'موظف';
    const roleLabel = s.role === 'manager' ? 'مدير' : 'أدمن';
    const roleColor = s.role === 'manager' ? 'background:#ede9fe;color:#6d28d9' : 'background:#dbeafe;color:#1d4ed8';
    let actions = '';
    if (isMgr && s.user_id !== me.id) {
      const toggleTo = s.role === 'manager' ? 'admin' : 'manager';
      actions = `<button onclick="setRole('${s.user_id}','${toggleTo}')" style="background:#f1f5f9;border:none;border-radius:9px;padding:7px 11px;font-weight:700;font-family:inherit;cursor:pointer;font-size:12px">${s.role === 'manager' ? 'تنزيل لأدمن' : 'ترقية لمدير'}</button>
        <button onclick="setRole('${s.user_id}','user')" style="background:#fee2e2;color:#b91c1c;border:none;border-radius:9px;padding:7px 11px;font-weight:800;font-family:inherit;cursor:pointer;font-size:12px">إزالة</button>`;
    }
    return `<div style="background:#fff;border:1px solid #eef2f7;border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="width:42px;height:42px;border-radius:50%;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">${_esc((nm.charAt(0) || '؟').toUpperCase())}</div>
      <div style="flex:1;min-width:120px"><div style="font-weight:800">${_esc(nm)}</div><div style="font-size:12px;color:#94a3b8">${_esc(s.email || '')}</div></div>
      <span style="${roleColor};padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800">${roleLabel}</span>
      ${actions}
    </div>`;
  }).join('');
  if (isMgr) {
    grid.innerHTML += `<div style="margin-top:8px;background:#fff;border:1px dashed #cbd5e1;border-radius:14px;padding:14px">
      <div style="font-weight:800;margin-bottom:8px">ترقية مستخدم مسجّل إلى أدمن</div>
      <div style="display:flex;gap:8px"><input id="promoteEmail" placeholder="بريد المستخدم" style="flex:1;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-family:inherit"><button onclick="promoteByEmail()" style="background:#F6921E;color:#fff;border:none;border-radius:10px;padding:0 16px;font-weight:800;font-family:inherit;cursor:pointer">ترقية</button></div>
    </div>`;
  } else {
    grid.innerHTML += '<div style="color:#94a3b8;font-size:13px;margin-top:8px">إدارة الصلاحيات متاحة للمدير فقط.</div>';
  }
}
async function setRole(userId, role) {
  const { error } = await supabaseClient.from('profiles').update({ role }).eq('user_id', userId);
  if (error) { toast('تعذّر: ' + error.message, 'error'); return; }
  toast('تم تحديث الصلاحية', 'success'); renderSettings();
}
async function promoteByEmail() {
  const email = (document.getElementById('promoteEmail').value || '').trim().toLowerCase();
  if (!email) return;
  const { data, error } = await supabaseClient.from('profiles').update({ role: 'admin' }).eq('email', email).select();
  if (error) { toast('تعذّر: ' + error.message, 'error'); return; }
  if (!data || !data.length) { toast('لا يوجد مستخدم بهذا البريد (يجب أن يسجّل حساباً أولاً)', 'error'); return; }
  toast('تمت الترقية إلى أدمن', 'success'); renderSettings();
}

/* ===== RENDER ADS ===== */
function renderAds() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const catFilter = document.getElementById('filterCat').value;

  let filtered = ads.filter(a => {
    const matchQ = !query || a.ref.toLowerCase().includes(query) || a.title.toLowerCase().includes(query) || a.title.includes(query);
    const matchC = !catFilter || a.catId === catFilter;
    return matchQ && matchC;
  });

  document.getElementById('navAdCount').textContent = ads.length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PER_PAGE;
  const pageAds = filtered.slice(start, start + PER_PAGE);

  const tbody = document.getElementById('adsTableBody');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = pageAds.map(a => {
      const cat = getCat(a.catId);
      const isRentAd = isRent(a.catId);
      return `<tr>
        <td><span class="ad-ref">${a.ref}</span></td>
        <td>
          <div class="ad-title-cell">
            <img class="ad-thumb" src="${a.images?.[0] || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22/>'}" alt="" onerror="this.style.background='var(--s200)'">
            <div>
	              <div class="ad-title-text">${a.title}</div>
            </div>
          </div>
        </td>
        <td><span class="cat-badge ${a.catId}">${cat?.label || ''}</span></td>
        ${!isFreeAd(a.catId) ? `<td class="price-cell">${fmtPrice(a.price)}</td>` : '<td>—</td>'}
        <td class="loc-cell">${a.city && a.neighborhood ? a.neighborhood + ' / ' + a.city : a.location}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon btn-view" title="عرض التفاصيل" onclick="openViewModal('${a.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn-icon btn-edit" title="تعديل" onclick="openEditModal('${a.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            ${isRentAd ? `<button class="btn-icon btn-calendar" title="قفل أيام" onclick="openCalModal('${a.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </button>` : ''}
            <button class="btn-icon btn-delete" title="حذف" onclick="confirmDelete('${a.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  const mc = document.getElementById('mobileCards');
  if (filtered.length === 0) {
    mc.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><h3>لا توجد نتائج</h3><p>جرب البحث بكلمات مختلفة</p></div>`;
  } else {
      mc.innerHTML = pageAds.map(a => {
      const cat = getCat(a.catId);
      const isRentAd = isRent(a.catId);
      return `<div class="m-card">
        <button class="m-card-eye-btn" onclick="openViewModal('${a.id}')" title="عرض التفاصيل">
          <i data-lucide="eye"></i>
        </button>
        <div class="m-card-header">
          <img class="m-card-img" src="${a.images?.[0] || ''}" alt="" onerror="this.style.background='var(--s200)'">
          <div class="m-card-info">
            <div class="m-card-title">${a.title}</div>
            <span class="m-card-ref">${a.ref}</span>
          </div>
        </div>
        <div class="m-card-body">
          <span class="m-card-tag" style="background:${getCatBg(a.catId)};color:${getCatColor(a.catId)}">${cat?.label}</span>
          ${!isFreeAd(a.catId) ? `<span class="m-card-tag">${fmtPrice(a.price)}</span>` : ''}
          ${isFreeAd(a.catId) && a.profession ? `<span class="m-card-tag" style="background:var(--green-lt);color:var(--green-dk)">${a.profession}</span>` : ''}
          ${a.neighborhood ? `<span class="m-card-tag"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-left:2px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${a.neighborhood}</span>` : ''}
          ${a.city ? `<span class="m-card-tag">${a.city}</span>` : (!a.neighborhood && a.location ? `<span class="m-card-tag">${a.location}</span>` : '')}
        </div>
        <div class="m-card-actions">
          <button class="m-card-btn edit" onclick="openEditModal('${a.id}')">
            <i data-lucide="pencil"></i>
            تعديل
          </button>
          ${isRentAd ? `<button class="m-card-btn cal" onclick="openCalModal('${a.id}')">
            <i data-lucide="calendar"></i>
            أيام
          </button>` : ''}
          <button class="m-card-btn delete" onclick="confirmDelete('${a.id}')">
            <i data-lucide="trash-2"></i>
            حذف
          </button>
        </div>
      </div>`;
    }).join('');
    lucide.createIcons();
  }

  renderPagination(filtered.length, totalPages);
}

function getCatBg(catId) {
  const map = { 'apt-rent': 'rgba(13,148,136,.1)', 'apt-sale': 'rgba(27,75,158,.1)', 'car-rent': 'rgba(124,58,237,.1)', 'car-sale': 'rgba(225,29,72,.1)', 'equip-rent': 'rgba(217,119,6,.1)', 'equip-sale': 'rgba(180,83,9,.1)', 'free-ad': 'rgba(5,150,105,.1)' };
  return map[catId] || 'var(--s100)';
}
function getCatColor(catId) {
  const map = { 'apt-rent': '#0D9488', 'apt-sale': '#F6921E', 'car-rent': '#7C3AED', 'car-sale': '#E11D48', 'equip-rent': '#D97706', 'equip-sale': '#B45309', 'free-ad': '#059669' };
  return map[catId] || 'var(--s600)';
}

function renderPagination(total, totalPages) {
  const pg = document.getElementById('pagination');
  if (totalPages <= 1) { pg.innerHTML = ''; return; }
  let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">›</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">‹</button>`;
  html += `<span class="page-info">${total} إعلان</span>`;
  pg.innerHTML = html;
}

function goPage(p) { currentPage = p; renderAds(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

/* ===== ADD/EDIT MODAL ===== */
function buildFormHTML(catId, data = {}) {
  const cat = getCat(catId);
  let html = '';

  html += `<div class="form-group"><label class="form-label">عنوان الإعلان *</label><input type="text" class="form-input" id="fTitle" value="${data.title || ''}" placeholder="مثال: شقة مفروشة للإيجار في حي القلعة"></div>`;

  html += `<div class="form-row"><div class="form-group"><label class="form-label">الفئة *</label><select class="form-select" id="fCatId" onchange="onCatChange()">`;
  CATS.forEach(c => { html += `<option value="${c.id}" ${c.id === catId ? 'selected' : ''}>${c.label}</option>`; });
  html += `</select></div><div class="form-group"><label class="form-label">المدينة / الموقع *</label><select class="form-select" id="fCity" onchange="onCityChange()">`;
  CITIES.forEach(c => { html += `<option value="${c}" ${c === data.city ? 'selected' : ''}>${c}</option>`; });
  html += `</select><div id="fCityOtherWrap" style="display:${data.city === 'أخرى' ? 'block' : 'none'};margin-top:8px"><input type="text" class="form-input" id="fCityOther" value="${data.city && !CITIES.includes(data.city) ? data.city : ''}" placeholder="أدخل المدينة / الموقع"></div></div></div>`;
  
  html += `<div class="form-group"><label class="form-label">الحي / المنطقة (اختياري)</label><select class="form-select" id="fNeighborhood" onchange="onNeighborhoodChange()">`;
  const currentCity = data.city && CITIES.includes(data.city) ? data.city : 'جبلة';
  const neighborhoods = NEIGHBORHOODS[currentCity] || NEIGHBORHOODS['جبلة'];
  html += `<option value="">-- اترك فارغاً (اختياري) --</option>`;
  neighborhoods.forEach(n => { html += `<option value="${n}" ${n === data.neighborhood ? 'selected' : ''}>${n}</option>`; });
  html += `<option value="أخرى" ${data.neighborhood && !neighborhoods.includes(data.neighborhood) ? 'selected' : ''}>أخرى</option>`;
  html += `</select><div id="fNeighborhoodOtherWrap" style="display:${data.neighborhood && !neighborhoods.includes(data.neighborhood) ? 'block' : 'none'};margin-top:8px"><input type="text" class="form-input" id="fNeighborhoodOther" value="${data.neighborhood && !neighborhoods.includes(data.neighborhood) ? data.neighborhood : ''}" placeholder="أدخل الحي / المنطقة"></div></div>`;

	  if (!isFreeAd(catId)) {
    html += `<div class="form-row"><div class="form-group"><label class="form-label">السعر (ل.س) *</label><input type="number" class="form-input" id="fPrice" value="${data.price || 0}" placeholder="0"></div><div></div></div>`;
  } else {
    html += `<input type="hidden" id="fPrice" value="0">`;
  }

  if (isApt(catId)) {
    html += `<div style="background:var(--teal-lt);border-radius:12px;padding:16px;margin-bottom:18px">
      <div style="font-size:13px;font-weight:800;color:var(--teal);margin-bottom:12px">تفاصيل الشقة</div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">غرف النوم</label><input type="number" class="form-input" id="fRooms" value="${data.rooms || 1}" min="0"></div>
        <div class="form-group"><label class="form-label">الحمامات</label><input type="number" class="form-input" id="fBaths" value="${data.baths || 1}" min="0"></div>
        <div class="form-group"><label class="form-label">المساحة م²</label><input type="number" class="form-input" id="fArea" value="${data.area || ''}" min="0"></div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">المطابخ</label><input type="number" class="form-input" id="fKitchens" value="${data.kitchens || 1}" min="0"></div>
        <div class="form-group"><label class="form-label">الشرفات</label><input type="number" class="form-input" id="fBalconies" value="${data.balconies || 0}" min="0"></div>
        <div class="form-group"><label class="form-label">غرف المعيشة</label><input type="number" class="form-input" id="fLiving" value="${data.living || 1}" min="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">المستودعات</label><input type="number" class="form-input" id="fStorage" value="${data.storage || 0}" min="0"></div>
        <div></div>
      </div>
    </div>`;
  } else if (isCar(catId)) {
    html += `<div style="background:var(--purple-lt);border-radius:12px;padding:16px;margin-bottom:18px">
      <div style="font-size:13px;font-weight:800;color:var(--purple);margin-bottom:12px">تفاصيل السيارة</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">الماركة *</label><select class="form-select" id="fCarType">${CAR_BRANDS.map(b => `<option ${b === data.carType ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">الموديل *</label><input type="text" class="form-input" id="fCarModel" value="${data.carModel || ''}" placeholder="مثال: كامري"></div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">سنة الصنع</label><input type="number" class="form-input" id="fCarYear" value="${data.carYear || 2024}" min="1990" max="2026"></div>
        <div class="form-group"><label class="form-label">المسافة (كم)</label><input type="number" class="form-input" id="fCarKm" value="${data.carKm || ''}" min="0"></div>
        <div class="form-group"><label class="form-label">اللون</label><input type="text" class="form-input" id="fCarColor" value="${data.carColor || ''}" placeholder="أبيض"></div>
      </div>
      <div class="form-group"><label class="form-label">الفئة</label><select class="form-select" id="fCarClass">${CAR_CLASSES.map(c => `<option ${c === data.carClass ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    </div>`;
  } else if (isFreeAd(catId)) {
    html += `<div style="background:var(--green-lt);border-radius:12px;padding:16px;margin-bottom:18px">
      <div style="font-size:13px;font-weight:800;color:var(--green-dk);margin-bottom:12px">بيانات صاحب الإعلان</div>
      <div class="form-group"><label class="form-label">نوع المهنة *</label><select class="form-select" id="fProfession" onchange="onProfessionChange()">
        <option value="">-- اختر المهنة --</option>
        <option value="كهربائي" ${data.profession === 'كهربائي' ? 'selected' : ''}>كهربائي</option>
        <option value="عامل" ${data.profession === 'عامل' ? 'selected' : ''}>عامل</option>
        <option value="دهان" ${data.profession === 'دهان' ? 'selected' : ''}>دهان</option>
        <option value="لحام" ${data.profession === 'لحام' ? 'selected' : ''}>لحام</option>
        <option value="توصيل" ${data.profession === 'توصيل' ? 'selected' : ''}>توصيل</option>
        <option value="سيارة نقل صغيرة" ${data.profession === 'سيارة نقل صغيرة' ? 'selected' : ''}>سيارة نقل صغيرة</option>
        <option value="نجار" ${data.profession === 'نجار' ? 'selected' : ''}>نجار</option>
        <option value="سباك" ${data.profession === 'سباك' ? 'selected' : ''}>سباك</option>
        <option value="ميكانيكي" ${data.profession === 'ميكانيكي' ? 'selected' : ''}>ميكانيكي</option>
        <option value="حلّاق" ${data.profession === 'حلّاق' ? 'selected' : ''}>حلّاق</option>
        <option value="مدرس" ${data.profession === 'مدرس' ? 'selected' : ''}>مدرس</option>
        <option value="أخرى" ${data.profession && !['كهربائي', 'عامل', 'دهان', 'لحام', 'توصيل', 'سيارة نقل صغيرة', 'نجار', 'سباك', 'ميكانيكي', 'حلّاق', 'مدرس'].includes(data.profession) ? 'selected' : ''}>أخرى</option>
      </select></div>
      <div class="form-group" id="fProfessionOtherWrap" style="display: ${data.profession === 'أخرى' || (data.profession && !['كهربائي', 'عامل', 'دهان', 'لحام', 'توصيل', 'سيارة نقل صغيرة', 'نجار', 'سباك', 'ميكانيكي', 'حلّاق', 'مدرس'].includes(data.profession)) ? 'block' : 'none'}">
        <label class="form-label">حدد المهنة</label>
        <input type="text" class="form-input" id="fProfessionOther" value="${data.profession && !['كهربائي', 'عامل', 'دهان', 'لحام', 'توصيل', 'سيارة نقل صغيرة', 'نجار', 'سباك', 'ميكانيكي', 'حلّاق', 'مدرس'].includes(data.profession) ? data.profession : ''}" placeholder="أدخل المهنة">
      </div>
      <div class="form-group"><label class="form-label">رقم التواصل (واتساب) *</label><input type="text" class="form-input" id="fPhone" value="${data.phone || ''}" placeholder="963XXXXXXXXX" dir="ltr"></div>
    </div>`;
  }

  html += `<div class="form-group"><label class="form-label">وصف الإعلان</label><textarea class="form-textarea" id="fDesc" placeholder="أضف تفاصيل إضافية عن الإعلان...">${data.desc || ''}</textarea></div>`;

  // Build image slots (up to 5)
  const existingImgs = data.images || [];
  let imgSlots = '';
  for (let i = 0; i < 5; i++) {
    const img = existingImgs[i] || '';
    imgSlots += `<div class="form-img-slot" id="imgSlot${i}" onclick="document.getElementById('imgInput${i}').click()">
      ${img ? `<img src="${img}" id="imgPreview${i}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
        <button class="form-img-remove" onclick="event.stopPropagation();removeImg(${i})">✕</button>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" id="imgPlus${i}"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`}
      <input type="file" id="imgInput${i}" accept="image/*" style="display:none" onchange="handleImgUpload(${i}, this)">
    </div>`;
  }
  html += `<div class="form-group"><label class="form-label">الصور (حتى 5 صور)</label><div class="form-images" id="imgSlotsWrap">${imgSlots}</div></div>`;

  html += `<div class="form-row">
    <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-top:22px">
      <input type="checkbox" id="fFeatured" ${data.featured ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary)">
      <label for="fFeatured" style="font-size:13px;font-weight:700;color:var(--s700);cursor:pointer">إعلان مميز</label>
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-top:22px">
      <input type="checkbox" id="fNegotiable" ${data.negotiable ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--teal)">
      <label for="fNegotiable" style="font-size:13px;font-weight:700;color:var(--s700);cursor:pointer">قابل للتفاوض</label>
    </div>
  </div>`;

  return html;
}

/* ===== IMAGE UPLOAD HELPERS ===== */
let uploadedImages = [{}, {}, {}, {}, {}]; // stores {url, public_id} for each slot

async function handleImgUpload(idx, input) {
  const file = input.files[0];
  if (!file) return;
  const slot = document.getElementById(`imgSlot${idx}`);
  slot.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:12px;color:var(--s400)">جاري الرفع...</div>`;
  try {
    const ext = ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')) || 'jpg';
    const path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const up = await supabaseClient.storage.from('ads').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
    if (up.error) throw up.error;
    const url = supabaseClient.storage.from('ads').getPublicUrl(path).data.publicUrl;
    uploadedImages[idx] = { url: url, public_id: path }; // public_id = مسار الملف في Storage (للحذف)
    slot.innerHTML = `
      <img src="${url}" id="imgPreview${idx}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
      <button class="form-img-remove" onclick="event.stopPropagation();removeImg(${idx})">✕</button>
      <input type="file" id="imgInput${idx}" accept="image/*" style="display:none" onchange="handleImgUpload(${idx}, this)">`;
    toast('تم رفع الصورة ✓', 'success');
  } catch (e) {
    toast('خطأ برفع الصورة: ' + (e.message || e), 'error');
    removeImg(idx);
  }
}

function removeImg(idx) {
  uploadedImages[idx] = {};
  const slot = document.getElementById(`imgSlot${idx}`);
  slot.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" id="imgPlus${idx}"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    <input type="file" id="imgInput${idx}" accept="image/*" style="display:none" onchange="handleImgUpload(${idx}, this)">`;
}

function openAddModal() {
  editingId = null;
  uploadedImages = [{}, {}, {}, {}, {}];
  document.getElementById('modalTitle').textContent = 'إضافة إعلان جديد';
  document.getElementById('modalBody').innerHTML = buildFormHTML('apt-rent');
  document.getElementById('adModal').classList.add('open');
}

function openEditModal(id) {
  const ad = ads.find(a => String(a.id) === String(id));
  if (!ad) return;
  editingId = id;
  uploadedImages = [{}, {}, {}, {}, {}];
  for (let i = 0; i < 5; i++) {
    if (ad.images && ad.images[i]) {
      uploadedImages[i] = { url: ad.images[i], public_id: (ad.image_ids && ad.image_ids[i]) || '' };
    }
  }
  document.getElementById('modalTitle').textContent = 'تعديل الإعلان — ' + ad.ref;
  document.getElementById('modalBody').innerHTML = buildFormHTML(ad.catId, ad);
  document.getElementById('adModal').classList.add('open');
}

function onCityChange() {
  const city = document.getElementById('fCity').value;
  const otherWrap = document.getElementById('fCityOtherWrap');
  if (city === 'أخرى') {
    otherWrap.style.display = 'block';
    document.getElementById('fCityOther').focus();
  } else {
    otherWrap.style.display = 'none';
    document.getElementById('fCityOther').value = '';
  }
  // Reset neighborhood value when city changes
  document.getElementById('fNeighborhood').value = '';
  // Update neighborhoods
  const neighborhoods = NEIGHBORHOODS[city] || NEIGHBORHOODS['جبلة'];
  const select = document.getElementById('fNeighborhood');
  select.innerHTML = '';
  const optEmpty = document.createElement('option');
  optEmpty.value = '';
  optEmpty.textContent = '-- اترك فارغاً (اختياري) --';
  select.appendChild(optEmpty);
  neighborhoods.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    select.appendChild(opt);
  });
  const optOther = document.createElement('option');
  optOther.value = 'أخرى';
  optOther.textContent = 'أخرى';
  select.appendChild(optOther);
  select.value = '';
  document.getElementById('fNeighborhoodOtherWrap').style.display = 'none';
}

function onNeighborhoodChange() {
  const neighborhood = document.getElementById('fNeighborhood').value;
  const otherWrap = document.getElementById('fNeighborhoodOtherWrap');
  if (neighborhood === 'أخرى') {
    otherWrap.style.display = 'block';
    document.getElementById('fNeighborhoodOther').focus();
  } else {
    otherWrap.style.display = 'none';
    document.getElementById('fNeighborhoodOther').value = '';
  }
}

function onProfessionChange() {
  const profession = document.getElementById('fProfession').value;
  const otherWrap = document.getElementById('fProfessionOtherWrap');
  if (profession === 'أخرى') {
    otherWrap.style.display = 'block';
    document.getElementById('fProfessionOther').focus();
  } else {
    otherWrap.style.display = 'none';
    document.getElementById('fProfessionOther').value = '';
  }
}

function onCatChange() {
  const catId = document.getElementById('fCatId').value;
  const title = document.getElementById('fTitle')?.value || '';
  const city = document.getElementById('fCity')?.value || '';
  const cityOther = document.getElementById('fCityOther')?.value || '';
  const neighborhood = document.getElementById('fNeighborhood')?.value || '';
  const neighborhoodOther = document.getElementById('fNeighborhoodOther')?.value || '';
  const price = document.getElementById('fPrice')?.value || 0;
  const phone = document.getElementById('fPhone')?.value || '';
  const profession = document.getElementById('fProfession')?.value || '';
  const professionOther = document.getElementById('fProfessionOther')?.value || '';
  const desc = document.getElementById('fDesc')?.value || '';
  const images = document.getElementById('fImages')?.value || '';
  const featured = document.getElementById('fFeatured')?.checked || false;
  const negotiable = document.getElementById('fNegotiable')?.checked || false;

  document.getElementById('modalBody').innerHTML = buildFormHTML(catId, {
    title, city: city === 'أخرى' ? cityOther : city, neighborhood: neighborhood === 'أخرى' ? neighborhoodOther : neighborhood, price: Number(price), phone, profession: profession === 'أخرى' ? professionOther : profession, desc,
    images: images.split('\n').filter(Boolean), featured, negotiable
  });
}

function closeModal() { document.getElementById('adModal').classList.remove('open'); editingId = null; }

let viewingAdId = null;
function openViewModal(id) {
  const a = ads.find(x => String(x.id) === String(id));
  if (!a) return;
  viewingAdId = id;
  const cat = getCat(a.catId);
  const isRentAd = isRent(a.catId);

  const imgs = (a.images || []).filter(Boolean);
  const gallery = imgs.length
    ? `<div style="position:relative;border-radius:16px;overflow:hidden;margin-bottom:16px">
        <img src="${imgs[0]}" style="width:100%;height:220px;object-fit:cover;display:block">
        ${imgs.length>1?`<div style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700">${imgs.length} صور</div>`:''}
        ${imgs.length>1?`<div style="display:flex;gap:6px;margin-top:6px">${imgs.slice(1,4).map(s=>`<img src="${s}" style="flex:1;height:70px;object-fit:cover;border-radius:10px">`).join('')}${imgs.length>4?`<div style="flex:1;height:70px;border-radius:10px;background:var(--s100);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--s500)">+${imgs.length-4}</div>`:''}</div>`:''}
       </div>`
    : '';

  let badges = `<span class="cat-badge ${a.catId}">${cat?.label||''}</span>`;
  if (a.featured) badges += `<span style="background:#FEF3C7;color:#D97706;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800">⭐ مميز</span>`;
  if (a.negotiable) badges += `<span style="background:var(--teal-lt);color:var(--teal);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800">قابل للتفاوض</span>`;
  if (isRentAd) badges += `<span style="background:var(--primary-lt);color:var(--primary);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800">إيجار / يوم</span>`;

  let specsHTML = '';
  if (isApt(a.catId)) {
    const specs = [
      {v:a.rooms,l:'غرف نوم',c:'var(--teal)'},{v:a.baths,l:'حمامات',c:'var(--primary)'},{v:a.area,l:'م²',c:'var(--amber)'},
      {v:a.kitchens,l:'مطابخ',c:'var(--s600)'},{v:a.living,l:'معيشة',c:'var(--s600)'},{v:a.balconies,l:'شرفات',c:'var(--s600)'}
    ].filter(s=>s.v);
    specsHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:8px;margin:12px 0">${specs.map(s=>`<div style="text-align:center;background:var(--s50);border-radius:12px;padding:12px 8px"><div style="font-size:20px;font-weight:900;color:${s.c}">${s.v}</div><div style="font-size:11px;color:var(--s500);font-weight:700;margin-top:2px">${s.l}</div></div>`).join('')}</div>`;
  } else if (isCar(a.catId) && a.carType) {
    const carSpecs = [{l:'الماركة',v:a.carType},{l:'الموديل',v:a.carModel},{l:'السنة',v:a.carYear},{l:'المسافة',v:a.carKm?a.carKm.toLocaleString()+' كم':''},{l:'اللون',v:a.carColor},{l:'الفئة',v:a.carClass}].filter(s=>s.v);
    specsHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin:12px 0">${carSpecs.map(s=>`<div style="background:var(--s50);border-radius:12px;padding:10px 12px"><div style="font-size:11px;color:var(--s400);font-weight:700">${s.l}</div><div style="font-size:14px;font-weight:800;color:var(--s800);margin-top:2px">${s.v}</div></div>`).join('')}</div>`;
  }

  document.getElementById('adViewTitle').textContent = a.ref + ' — ' + a.title;
  document.getElementById('adViewBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:4px">
      ${gallery}
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${badges}</div>
      <div style="background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border-radius:14px;padding:16px;margin-bottom:4px">
        <div style="font-size:12px;color:var(--s500);font-weight:700;margin-bottom:4px">السعر</div>
        <div style="font-size:26px;font-weight:900;color:var(--primary)">${fmtPrice(a.price)}${isRentAd?' <span style="font-size:14px;font-weight:600;color:var(--s400)">/ يوم</span>':''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;color:var(--s600);font-size:14px;font-weight:600">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${a.city&&a.neighborhood?a.neighborhood+' / '+a.city:a.location}
      </div>
      ${specsHTML}
      ${a.phone?`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;color:var(--s600);font-size:14px;font-weight:600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.11 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>${a.phone}</div>`:''}
      ${a.desc?`<div style="background:var(--s50);border-radius:14px;padding:16px;font-size:14px;color:var(--s600);line-height:1.8;font-weight:500;white-space:pre-wrap">${a.desc}</div>`:''}
    </div>`;
  document.getElementById('adViewModal').classList.add('open');
}
function openEditFromView() {
  document.getElementById('adViewModal').classList.remove('open');
  if (viewingAdId) openEditModal(viewingAdId);
}

async function saveAd() {
  const catId = document.getElementById('fCatId').value;
  const title = document.getElementById('fTitle').value.trim();
  const city = document.getElementById('fCity').value;
  const cityOther = document.getElementById('fCityOther')?.value.trim() || '';
  const neighborhood = document.getElementById('fNeighborhood').value;
  const neighborhoodOther = document.getElementById('fNeighborhoodOther')?.value.trim() || '';
  const price = Number(document.getElementById('fPrice').value) || 0;
  const phone = document.getElementById('fPhone')?.value.trim() || "";
  const profession = document.getElementById('fProfession')?.value || '';
  const professionOther = document.getElementById('fProfessionOther')?.value.trim() || '';
  const desc = document.getElementById('fDesc').value.trim();
  const images = [];
  const image_ids = [];
  for (let i = 0; i < 5; i++) {
    if (uploadedImages[i] && uploadedImages[i].url) {
      images.push(uploadedImages[i].url);
      if (uploadedImages[i].public_id) image_ids.push(uploadedImages[i].public_id);
    }
  }
  const featured = document.getElementById('fFeatured').checked;
  const negotiable = document.getElementById('fNegotiable').checked;

	  if (!title) { toast('يرجى إدخال عنوان الإعلان', 'error'); return; }

  const finalCity = city === 'أخرى' ? cityOther : city;
  const finalNeighborhood = neighborhood === 'أخرى' ? neighborhoodOther : neighborhood;
  
  const ad = { catId, title, city: finalCity, neighborhood: finalNeighborhood, location: finalNeighborhood + ' ' + finalCity, price, phone, desc, images, image_ids, featured, negotiable };

  // Add profession for free ads
  if (isFreeAd(catId)) {
    ad.profession = profession === 'أخرى' ? professionOther : profession;
  }

  if (isApt(catId)) {
    ad.rooms = Number(document.getElementById('fRooms')?.value) || 0;
    ad.baths = Number(document.getElementById('fBaths')?.value) || 0;
    ad.area = Number(document.getElementById('fArea')?.value) || 0;
    ad.kitchens = Number(document.getElementById('fKitchens')?.value) || 0;
    ad.balconies = Number(document.getElementById('fBalconies')?.value) || 0;
    ad.living = Number(document.getElementById('fLiving')?.value) || 0;
    ad.storage = Number(document.getElementById('fStorage')?.value) || 0;
  } else if (isCar(catId)) {
    ad.carType = document.getElementById('fCarType')?.value || '';
    ad.carModel = document.getElementById('fCarModel')?.value || '';
    ad.carYear = Number(document.getElementById('fCarYear')?.value) || 2024;
    ad.carKm = Number(document.getElementById('fCarKm')?.value) || 0;
    ad.carColor = document.getElementById('fCarColor')?.value || '';
    ad.carClass = document.getElementById('fCarClass')?.value || '';
  }

  if (USE_FIREBASE) {
    try {
      if (editingId) {
        await supabaseClient.from('ads').update(toRow(ad)).eq('id', editingId);
        toast('تم تحديث الإعلان بنجاح ✓', 'success');
      } else {
        ad.ref = genRef();
        const row = toRow(ad); row.status = 'active'; row.views = 0;
        const { error } = await supabaseClient.from('ads').insert(row);
        if (error) throw error;
        toast('تم إضافة الإعلان بنجاح ✓', 'success');
      }
      ads = await loadAdsFirebase();
    } catch(e) { toast('خطأ: ' + e.message, 'error'); return; }
  } else {
    if (editingId) {
      const idx = ads.findIndex(a => a.id === editingId);
      if (idx > -1) { ad.id = ads[idx].id; ad.ref = ads[idx].ref; ads[idx] = ad; toast('تم تحديث الإعلان بنجاح ✓', 'success'); }
    } else {
      ad.id = Date.now(); ad.ref = genRef(); ads.unshift(ad); toast('تم إضافة الإعلان بنجاح ✓', 'success');
    }
    saveAds(ads);
  }

  closeModal();
  currentPage = 1;
  renderAds();
}

/* ===== DELETE ===== */
function confirmDelete(id) {
  const ad = ads.find(a => String(a.id) === String(id));
  if (!ad) return;
  document.getElementById('confirmText').textContent = `هل أنت متأكد من حذف الإعلان "${ad.title}" (${ad.ref})؟ لا يمكن التراجع عن هذا الإجراء.`;
  document.getElementById('btnConfirmDel').onclick = () => { deleteAd(id); closeConfirm(); };
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() { document.getElementById('confirmOverlay').classList.remove('open'); }
async function deleteAd(id) {
  if (USE_FIREBASE) {
    try {
      const ad = ads.find(a => String(a.id) === String(id));
      const paths = (ad && ad.image_ids ? ad.image_ids : []).filter(Boolean);
      if (paths.length) { try { await supabaseClient.storage.from('ads').remove(paths); } catch(e) {} }
      await supabaseClient.from('ads').delete().eq('id', id);
      ads = await loadAdsFirebase();
    } catch(e) { toast('خطأ بالحذف: ' + e.message, 'error'); return; }
  } else {
    ads = ads.filter(a => a.id !== id);
    saveAds(ads);
  }
  renderAds();
  toast('تم حذف الإعلان ✓', 'success');
}

/* ===== CALENDAR (Block Dates) with Range & Month ===== */
let calAdId = null;
let calYear, calMonth;
let tempBlocked = [];
let rangeMode = false;
let rangeStart = null;

function openCalModal(id) {
  calAdId = id;
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  const blocked = loadBlocked();
  tempBlocked = blocked[id] ? [...blocked[id]] : [];
  rangeMode = false;
  rangeStart = null;
  document.getElementById('calModal').classList.add('open');
  renderCalendar();
  const rangeBtn = document.getElementById('rangeModeBtn');
  rangeBtn.classList.remove('active');
  rangeBtn.textContent = 'تحديد نطاق (بداية/نهاية)';
}

function closeCalModal() {
  document.getElementById('calModal').classList.remove('open');
  calAdId = null;
  rangeMode = false;
  rangeStart = null;
}

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }

function toggleRangeMode() {
  rangeMode = !rangeMode;
  rangeStart = null;
  const btn = document.getElementById('rangeModeBtn');
  if (rangeMode) {
    btn.classList.add('active');
    btn.textContent = 'اختر يوم البداية...';
    toast('اختر اليوم الأول (بداية النطاق)', '');
  } else {
    btn.classList.remove('active');
    btn.textContent = 'تحديد نطاق (بداية/نهاية)';
  }
  renderCalendar();
}

function handleDayClick(key, dateObj) {
  const today = new Date(); today.setHours(0,0,0,0);
  if (dateObj < today) return;

  if (rangeMode) {
    if (rangeStart === null) {
      rangeStart = key;
      toast('تم تحديد يوم البداية، اختر يوم النهاية', '');
      renderCalendar();
    } else {
      const startDate = new Date(rangeStart);
      const endDate = new Date(key);
      if (endDate < startDate) {
        toast('يجب أن يكون يوم النهاية بعد يوم البداية', 'error');
        rangeStart = null;
        renderCalendar();
        return;
      }
      const dates = [];
      let current = new Date(startDate);
      while (current <= endDate) {
        const y = current.getFullYear();
        const m = (current.getMonth() + 1).toString().padStart(2,'0');
        const d = current.getDate().toString().padStart(2,'0');
        const dateKey = `${y}-${m}-${d}`;
        if (!tempBlocked.includes(dateKey)) dates.push(dateKey);
        current.setDate(current.getDate() + 1);
      }
      tempBlocked.push(...dates);
      toast(`تم تعطيل ${dates.length} يوم بين النطاق`, 'success');
      rangeMode = false;
      rangeStart = null;
      document.getElementById('rangeModeBtn').classList.remove('active');
      document.getElementById('rangeModeBtn').textContent = 'تحديد نطاق (بداية/نهاية)';
      renderCalendar();
    }
  } else {
    const idx = tempBlocked.indexOf(key);
    if (idx > -1) tempBlocked.splice(idx, 1);
    else tempBlocked.push(key);
    renderCalendar();
  }
}

function toggleFullMonth() {
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  const monthKeys = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(calYear, calMonth, d);
    if (dt >= today) {
      const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      monthKeys.push(key);
    }
  }
  const allBlocked = monthKeys.every(k => tempBlocked.includes(k));
  if (allBlocked) {
    tempBlocked = tempBlocked.filter(k => !monthKeys.includes(k));
    toast('تم إلغاء تعطيل الشهر بالكامل', 'success');
  } else {
    const toAdd = monthKeys.filter(k => !tempBlocked.includes(k));
    tempBlocked.push(...toAdd);
    toast(`تم تعطيل ${toAdd.length} يوم في هذا الشهر`, 'success');
  }
  renderCalendar();
}

function renderCalendar() {
  document.getElementById('calMonthLabel').textContent = MONTHS[calMonth] + ' ' + calYear;
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let html = DAYS_NAMES.map(d => `<div class="cal-day-name">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += '<button class="cal-day empty" disabled></button>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(calYear, calMonth, d);
    const key = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const past = dt < today;
    const blocked = tempBlocked.includes(key);
    let extraClass = '';
    let clickHandler = `onclick="handleDayClick('${key}', new Date(${calYear}, ${calMonth}, ${d}))"`;
    if (past) {
      extraClass = 'past';
      clickHandler = '';
    } else if (rangeMode && rangeStart !== null) {
      if (key === rangeStart) extraClass = 'range-start';
    }
    html += `<button class="cal-day ${blocked ? 'blocked' : ''} ${extraClass}" ${clickHandler} ${past ? 'disabled' : ''}>${d}</button>`;
  }

  document.getElementById('calGrid').innerHTML = html;

  const list = document.getElementById('blockedDatesList');
  if (tempBlocked.length === 0) {
    list.innerHTML = '<p style="font-size:12px;color:var(--s400);text-align:center;margin-top:8px">لا توجد أيام مقفلة</p>';
  } else {
    const sorted = [...tempBlocked].sort();
    list.innerHTML = sorted.map(key => {
      const parts = key.split('-');
      const label = parseInt(parts[2]) + ' ' + MONTHS[parseInt(parts[1]) - 1] + ' ' + parts[0];
      return `<div class="blocked-date-item"><span>${label}</span><button class="blocked-date-remove" onclick="removeSingleBlockedDate('${key}')">✕</button></div>`;
    }).join('');
  }
}

function removeSingleBlockedDate(key) {
  const idx = tempBlocked.indexOf(key);
  if (idx > -1) tempBlocked.splice(idx, 1);
  renderCalendar();
}

function saveBlockedDates() {
  const blocked = loadBlocked();
  blocked[calAdId] = tempBlocked;
  saveBlocked(blocked);
  closeCalModal();
  toast('تم حفظ الأيام المقفلة ✓', 'success');
}

/* ===== DEALS ===== */
const DEALS_KEY = 'talbaktem_deals';
function loadDeals() { try { return JSON.parse(localStorage.getItem(DEALS_KEY) || '[]'); } catch(e) { return []; } }
function saveDeals(d) {
  localStorage.setItem(DEALS_KEY, JSON.stringify(d));
}
async function saveDealsFirebase(deal, isUpdate) {
  if (!USE_FIREBASE) return;
  try {
    await supabaseClient.from('deals').upsert({ id: deal.id, data: deal });
    await loadDealsFirebase();
  } catch(e) { console.error('Error saving deal to Supabase:', e); }
}
async function loadDealsFirebase() {
  if (!USE_FIREBASE) return;
  try {
    const { data, error } = await supabaseClient.from('deals').select('data').order('id', { ascending: false });
    if (error) throw error;
    deals = (data || []).map(r => r.data);
    localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
    renderDeals();
  } catch(e) { console.error('Deals load error:', e); }
}
let deals = loadDeals();
if (USE_FIREBASE) { loadDealsFirebase(); }
let selectedAdForDeal = null;
let editingDealId = null;

function fmtNumber(n) { return n.toLocaleString('en-US'); }

function renderDeals() {
  const q = (document.getElementById('dealSearchInput')?.value || '').trim().toLowerCase();
  const catFilter = document.getElementById('dealFilterCat')?.value || '';
  const filtered = deals.filter(d => {
    const matchQ = !q || d.adRef.toLowerCase().includes(q) || d.adTitle.toLowerCase().includes(q) || d.clientName.toLowerCase().includes(q);
    const matchCat = !catFilter || d.adCatId === catFilter;
    return matchQ && matchCat;
  });
  const grid = document.getElementById('dealsGrid');
  const empty = document.getElementById('dealsEmpty');
  const badge = document.getElementById('navDealCount');
  if (badge) badge.textContent = deals.length;
  const totalRevenue = deals.reduce((sum, d) => sum + (d.finalPrice || 0), 0);
  document.getElementById('dealsRevenueCard').innerHTML = `
    <div class="revenue-card">
      <div>
        <div class="revenue-card-label">Total Revenue</div>
        <div style="display:flex;align-items:baseline;gap:6px">
          <div class="revenue-card-value">${fmtPrice(totalRevenue).replace(' ل.س','')}</div>
          <div class="revenue-card-currency">SP</div>
        </div>
      </div>
      <div class="revenue-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      </div>
    </div>`;
  if (filtered.length === 0) {
    grid.innerHTML = ''; empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = filtered.map(d => {
      const isRentDeal = d.dealType === 'rent';
      const adImg = d.adImage || '';
      return `<div class="deal-card">
        ${adImg ? `<img src="${adImg}" style="width:100%;height:160px;object-fit:cover;border-radius:12px;margin-bottom:4px">` : ''}
        <div class="deal-card-header">
          <div>
            <div class="deal-card-title">${d.adTitle}</div>
            <span class="deal-card-ref">${d.adRef}</span>
          </div>
          <span class="deal-card-type ${d.dealType}">${isRentDeal ? 'إيجار' : 'بيع'}</span>
        </div>
        <div class="deal-card-price">${fmtPrice(d.finalPrice)}</div>
        ${isRentDeal ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--s500);font-weight:600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${d.dateFrom} ← ${d.dateTo} <span style="background:var(--teal-lt);color:var(--teal);padding:1px 7px;border-radius:8px;font-weight:800">${d.days} يوم</span>
        </div>` : ''}
        
        <div class="deal-card-actions">
          <button class="deal-btn details" onclick="showDealDetails('${d.id}')">تفاصيل</button>
          <button class="deal-btn delete" onclick="deleteDeal('${d.id}')">حذف</button>
          <button class="deal-btn edit" onclick="openDealEdit('${d.id}')">تعديل</button>
        </div>
      </div>`;
    }).join('');
    lucide.createIcons();
  }
}

function openAddDealModal() {
  selectedAdForDeal = null;
  document.getElementById('dealModalTitle').textContent = 'إضافة صفقة — اختر الإعلان';
  renderDealStep1();
  document.getElementById('dealModal').classList.add('open');
}
function closeDealModal() {
  document.getElementById('dealModal').classList.remove('open');
  selectedAdForDeal = null;
}
function renderDealStep1() {
  document.getElementById('dealModalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">ابحث بالرقم أو الاسم</label>
      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="search-input" id="dealAdSearch" placeholder="ابحث عن الإعلان..." oninput="searchAdsForDeal()">
      </div>
      <div class="deal-search-results" id="dealSearchResults"></div>
    </div>
    <div id="dealSelectedAdInfo" style="display:none;padding:14px;background:var(--primary-xlt);border-radius:14px;margin-top:8px;font-size:13px;font-weight:700;color:var(--primary)"></div>`;
  document.getElementById('dealModalFooter').innerHTML = `
    <button class="btn-save" onclick="goToDealStep2()" id="btnDealNext" disabled>التالي — بيانات الصفقة</button>
    <button class="btn-cancel" onclick="closeDealModal()">إلغاء</button>`;
}
function searchAdsForDeal() {
  const q = document.getElementById('dealAdSearch').value.trim().toLowerCase();
  const results = document.getElementById('dealSearchResults');
  if (!q) { results.style.display = 'none'; return; }
  const matched = ads.filter(a => !isFreeAd(a.catId) && (a.ref.toLowerCase().includes(q) || a.title.toLowerCase().includes(q))).slice(0, 8);
  if (matched.length === 0) { results.style.display = 'block'; results.innerHTML = '<div style="padding:16px;text-align:center;color:var(--s400);font-size:13px">لا توجد نتائج</div>'; return; }
  results.style.display = 'block';
  results.innerHTML = matched.map(a => `
    <div class="deal-search-item ${selectedAdForDeal?.id === a.id ? 'selected' : ''}" onclick="selectAdForDeal('${a.id}')">
      <img class="deal-search-thumb" src="${a.images?.[0] || ''}" alt="" onerror="this.style.background='var(--s200)'">
      <div class="deal-search-info">
        <div class="deal-search-name">${a.title}</div>
        <div class="deal-search-meta">${a.ref} · ${getCat(a.catId)?.label} · ${fmtPrice(a.price)}</div>
      </div>
    </div>`).join('');
}
function selectAdForDeal(id) {
  selectedAdForDeal = ads.find(a => String(a.id) === String(id));
  if (!selectedAdForDeal) return;
  document.getElementById('dealSearchResults').style.display = 'none';
  document.getElementById('dealAdSearch').value = selectedAdForDeal.title;
  const info = document.getElementById('dealSelectedAdInfo');
  info.style.display = 'block';
  info.textContent = `✓ ${selectedAdForDeal.ref} — ${selectedAdForDeal.title} (${getCat(selectedAdForDeal.catId)?.label}) — ${fmtPrice(selectedAdForDeal.price)}`;
  document.getElementById('btnDealNext').disabled = false;
}
function goToDealStep2() {
  if (!selectedAdForDeal) return;
  const ad = selectedAdForDeal;
  const isRentAd = isRent(ad.catId);
  document.getElementById('dealModalTitle').textContent = 'إضافة صفقة — بيانات الصفقة';
  let priceSection = '';
  if (isRentAd) {
    priceSection = `
      <div class="form-row">
        <div class="form-group"><label class="form-label">من تاريخ *</label><input type="date" class="form-input" id="dDateFrom" onchange="calcDealPrice()"></div>
        <div class="form-group"><label class="form-label">إلى تاريخ *</label><input type="date" class="form-input" id="dDateTo" onchange="calcDealPrice()"></div>
      </div>
      <div class="form-group"><label class="form-label">سعر اليوم (ل.س)</label><input type="number" class="form-input" id="dDayPrice" value="${ad.price}" onchange="calcDealPrice()"></div>
      <div id="dCalcInfo" style="padding:12px;background:var(--teal-lt);border-radius:12px;font-size:13px;font-weight:800;color:var(--teal);display:none;margin-bottom:12px"></div>
      <div class="form-group"><label class="form-label">السعر الإجمالي (ل.س)</label><input type="number" class="form-input" id="dFinalPrice" value="0" readonly style="background:var(--s50)"></div>`;
  } else {
    priceSection = `<div class="form-group"><label class="form-label">سعر البيع (ل.س)</label><input type="number" class="form-input" id="dFinalPrice" value="${ad.price}"></div>`;
  }
  document.getElementById('dealModalBody').innerHTML = `
    <div style="background:var(--primary-xlt);border-radius:12px;padding:12px 16px;margin-bottom:18px;font-size:13px;font-weight:700;color:var(--primary)">${ad.ref} — ${ad.title}</div>
    ${priceSection}
    <hr style="border:none;border-top:1px solid var(--s100);margin:18px 0">
    <div style="font-size:13px;font-weight:800;color:var(--s600);margin-bottom:14px">بيانات العميل</div>
    <div class="form-group"><label class="form-label">اسم العميل *</label><input type="text" class="form-input" id="dClientName" placeholder="اسم العميل"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">رقم الهاتف *</label><input type="text" class="form-input" id="dClientPhone" placeholder="963XXXXXXXXX" dir="ltr"></div>
      <div class="form-group"><label class="form-label">العنوان (اختياري)</label><input type="text" class="form-input" id="dClientAddress" placeholder="العنوان"></div>
    </div>`;
  document.getElementById('dealModalFooter').innerHTML = `
    <button class="btn-save" onclick="completeDeal()">إتمام الصفقة</button>
    <button class="btn-cancel" onclick="renderDealStep1();document.getElementById('dealModalTitle').textContent='إضافة صفقة — اختر الإعلان'">رجوع</button>`;
}
function calcDealPrice() {
  const from = document.getElementById('dDateFrom')?.value;
  const to = document.getElementById('dDateTo')?.value;
  const dayPrice = Number(document.getElementById('dDayPrice')?.value) || 0;
  if (!from || !to) return;
  const days = Math.max(0, Math.round((new Date(to) - new Date(from)) / (1000*60*60*24)));
  const total = days * dayPrice;
  document.getElementById('dFinalPrice').value = total;
  const info = document.getElementById('dCalcInfo');
  if (info) { info.style.display = 'block'; info.textContent = `${days} يوم × ${fmtPrice(dayPrice)} = ${fmtPrice(total)}`; }
}
function completeDeal() {
  const ad = selectedAdForDeal;
  if (!ad) return;
  const isRentAd = isRent(ad.catId);
  const clientName = document.getElementById('dClientName')?.value.trim();
  const clientPhone = document.getElementById('dClientPhone')?.value.trim();
  const clientAddress = document.getElementById('dClientAddress')?.value.trim();
  const finalPrice = Number(document.getElementById('dFinalPrice')?.value) || 0;
  if (!clientName) { toast('يرجى إدخال اسم العميل', 'error'); return; }
  if (!clientPhone) { toast('يرجى إدخال رقم الهاتف', 'error'); return; }
  const deal = { id: Date.now(), adId: ad.id, adRef: ad.ref, adTitle: ad.title, adCatId: ad.catId, adImage: ad.images?.[0] || '', dealType: isRentAd ? 'rent' : 'sale', finalPrice, clientName, clientPhone, clientAddress: clientAddress || '', createdAt: new Date().toLocaleDateString('ar-SY') };
  if (isRentAd) {
    deal.dateFrom = document.getElementById('dDateFrom')?.value || '';
    deal.dateTo = document.getElementById('dDateTo')?.value || '';
    deal.days = deal.dateFrom && deal.dateTo ? Math.round((new Date(deal.dateTo) - new Date(deal.dateFrom)) / (1000*60*60*24)) : 0;
    deal.dayPrice = Number(document.getElementById('dDayPrice')?.value) || 0;
  }
  deals.unshift(deal); saveDeals(deals);
  if (USE_FIREBASE) saveDealsFirebase(deal, false);
  closeDealModal(); renderDeals();
  toast('تمت إضافة الصفقة بنجاح ✓', 'success');
}
function showDealDetails(id) {
  id = Number(id) || id;
  const d = deals.find(x => String(x.id) === String(id));
  if (!d) return;
  const isRentDeal = d.dealType === 'rent';
  document.getElementById('dealDetailsBody').innerHTML = `
    <div style="display:grid;gap:14px">
      ${d.adImage ? `<img src="${d.adImage}" style="width:100%;height:200px;object-fit:cover;border-radius:14px">` : ''}
      <div style="background:var(--primary-xlt);border-radius:12px;padding:14px 16px">
        <div style="font-size:12px;color:var(--s400);font-weight:700;margin-bottom:4px">الإعلان</div>
        <div style="font-size:15px;font-weight:900;color:var(--s800)">${d.adTitle}</div>
        <div style="font-size:12px;color:var(--primary);font-weight:700">${d.adRef} · ${getCat(d.adCatId)?.label || ''}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:var(--s50);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--s400);font-weight:700;margin-bottom:4px">نوع الصفقة</div>
          <div style="font-weight:800">${isRentDeal ? 'إيجار' : 'بيع'}</div>
        </div>
        <div style="background:var(--s50);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--s400);font-weight:700;margin-bottom:4px">السعر الإجمالي</div>
          <div style="font-weight:900;color:var(--primary);font-size:16px">${fmtPrice(d.finalPrice)}</div>
        </div>
        ${isRentDeal ? `
        <div style="background:var(--teal-lt);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--teal);font-weight:700;margin-bottom:4px">من تاريخ</div>
          <div style="font-weight:800">${d.dateFrom}</div>
        </div>
        <div style="background:var(--teal-lt);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--teal);font-weight:700;margin-bottom:4px">إلى تاريخ</div>
          <div style="font-weight:800">${d.dateTo} (${d.days} يوم)</div>
        </div>` : ''}
      </div>
      <div style="background:var(--s50);border-radius:12px;padding:16px">
        <div style="font-size:12px;color:var(--s400);font-weight:700;margin-bottom:12px">بيانات العميل</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <!-- اسم العميل -->
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:10px;background:var(--primary-lt);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style="font-size:15px;font-weight:900;color:var(--s800)">${d.clientName}</div>
          </div>
          <!-- رقم الهاتف قابل للنقر - أزرق -->
          ${d.clientPhone ? `<a href="tel:${d.clientPhone}" style="display:flex;align-items:center;gap:12px;text-decoration:none;padding:12px 14px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border-radius:14px;border:1.5px solid #F6921E;transition:all .25s;box-shadow:0 2px 8px rgba(246,146,30,.1)" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 16px rgba(246,146,30,.2)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(246,146,30,.1)'">
            <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#F6921E,#E07D0A);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(246,146,30,.35)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:#F6921E;margin-bottom:2px">اتصال مباشر</div>
              <div style="font-size:14px;font-weight:800;color:#E07D0A" dir="ltr">${d.clientPhone}</div>
            </div>
          </a>` : ''}
          <!-- واتساب -->
          ${d.clientPhone ? `<a href="https://wa.me/${d.clientPhone.replace(/[^0-9]/g,'')}" target="_blank" style="display:flex;align-items:center;gap:12px;text-decoration:none;padding:12px 14px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:14px;border:1.5px solid #25D366;transition:all .25s;box-shadow:0 2px 8px rgba(37,211,102,.1)" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 16px rgba(37,211,102,.25)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(37,211,102,.1)'">
            <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#25D366,#128C7E);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(37,211,102,.35)">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="#fff"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.833.737 5.489 2.027 7.8L0 32l8.396-2.004A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.771-1.853l-.485-.287-5.023 1.198 1.227-4.899-.317-.503A13.253 13.253 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.986c-.398-.199-2.354-1.162-2.718-1.294-.364-.133-.63-.199-.895.199-.265.398-1.029 1.294-1.261 1.559-.232.265-.464.298-.862.1-.398-.199-1.681-.619-3.202-1.977-1.183-1.056-1.982-2.36-2.214-2.758-.232-.398-.025-.613.174-.811.179-.178.398-.464.597-.696.199-.232.265-.398.398-.664.133-.265.066-.497-.033-.696-.1-.199-.895-2.157-1.227-2.953-.323-.774-.651-.669-.895-.682l-.762-.013c-.265 0-.696.1-1.061.497-.364.398-1.393 1.361-1.393 3.319s1.427 3.85 1.626 4.115c.199.265 2.807 4.285 6.802 6.009.951.411 1.693.656 2.271.839.954.303 1.823.26 2.509.158.765-.114 2.354-.962 2.685-1.892.332-.93.332-1.727.232-1.892-.099-.165-.364-.265-.762-.464z"/></svg>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:#128C7E;margin-bottom:2px">واتساب</div>
              <div style="font-size:14px;font-weight:800;color:#075E54" dir="ltr">${d.clientPhone.replace(/[^0-9]/g,'')}</div>
            </div>
          </a>` : ''}
          <!-- الموقع -->
          ${d.clientAddress ? `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:14px;border:1.5px solid #fcd34d;box-shadow:0 2px 8px rgba(217,119,6,.1)">
            <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#f6921e,#d97706);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(217,119,6,.35)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:#d97706;margin-bottom:2px">الموقع</div>
              <div style="font-size:14px;font-weight:800;color:#b45309">${d.clientAddress}</div>
            </div>
          </div>` : ''}
        </div>
      </div>
      <div style="font-size:12px;color:var(--s400);text-align:center">تاريخ الإضافة: ${d.createdAt}</div>
    </div>`;
  document.getElementById('dealDetailsModal').classList.add('open');
  lucide.createIcons();
}
function openDealEdit(id) {
  id = Number(id) || id;
  const d = deals.find(x => String(x.id) === String(id));
  if (!d) return;
  editingDealId = id;
  const isRentDeal = d.dealType === 'rent';
  document.getElementById('dealEditBody').innerHTML = `
    <div class="form-group"><label class="form-label">اسم العميل</label><input type="text" class="form-input" id="eDClientName" value="${d.clientName}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">رقم الهاتف</label><input type="text" class="form-input" id="eDClientPhone" value="${d.clientPhone}" dir="ltr"></div>
      <div class="form-group"><label class="form-label">العنوان</label><input type="text" class="form-input" id="eDClientAddress" value="${d.clientAddress || ''}"></div>
    </div>
    ${isRentDeal ? `<div class="form-row">
      <div class="form-group"><label class="form-label">من تاريخ</label><input type="date" class="form-input" id="eDDateFrom" value="${d.dateFrom}"></div>
      <div class="form-group"><label class="form-label">إلى تاريخ</label><input type="date" class="form-input" id="eDDateTo" value="${d.dateTo}"></div>
    </div>` : ''}
    <div class="form-group"><label class="form-label">السعر الإجمالي (ل.س)</label><input type="number" class="form-input" id="eDFinalPrice" value="${d.finalPrice}"></div>`;
  document.getElementById('dealEditModal').classList.add('open');
}
function saveDealEdit() {
  const idx = deals.findIndex(x => x.id === editingDealId);
  if (idx === -1) return;
  const d = deals[idx];
  d.clientName = document.getElementById('eDClientName')?.value.trim() || d.clientName;
  d.clientPhone = document.getElementById('eDClientPhone')?.value.trim() || d.clientPhone;
  d.clientAddress = document.getElementById('eDClientAddress')?.value.trim() || '';
  d.finalPrice = Number(document.getElementById('eDFinalPrice')?.value) || d.finalPrice;
  if (d.dealType === 'rent') {
    d.dateFrom = document.getElementById('eDDateFrom')?.value || d.dateFrom;
    d.dateTo = document.getElementById('eDDateTo')?.value || d.dateTo;
    if (d.dateFrom && d.dateTo) d.days = Math.round((new Date(d.dateTo) - new Date(d.dateFrom)) / (1000*60*60*24));
  }
  deals[idx] = d; saveDeals(deals);
  if (USE_FIREBASE) saveDealsFirebase(d, true);
  document.getElementById('dealEditModal').classList.remove('open');
  renderDeals();
  toast('تم تحديث الصفقة ✓', 'success');
}
async function deleteDeal(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الصفقة؟')) return;
  if (USE_FIREBASE) {
    try {
      await supabaseClient.from('deals').delete().eq('id', Number(id) || id);
      toast('تم حذف الصفقة ✓', 'success');
      await loadDealsFirebase();
    } catch(e) {
      console.error('Error deleting deal:', e);
      toast('حدث خطأ أثناء الحذف', 'error');
    }
  } else {
    deals = deals.filter(x => String(x.id) !== String(id));
    saveDeals(deals);
    renderDeals();
    toast('تم حذف الصفقة ✓', 'success');
  }
}

/* ===== STATS ===== */
function renderStats() {
  const aptRent = ads.filter(a => a.catId === 'apt-rent').length;
  const aptSale = ads.filter(a => a.catId === 'apt-sale').length;
  const carRent = ads.filter(a => a.catId === 'car-rent').length;
  const carSale = ads.filter(a => a.catId === 'car-sale').length;
  const equipRent = ads.filter(a => a.catId === 'equip-rent').length;
  const equipSale = ads.filter(a => a.catId === 'equip-sale').length;
  const freeAd = ads.filter(a => a.catId === 'free-ad').length;
  const total = ads.length;

  const statsData = [
    { label: 'إجمالي الإعلانات', value: total, icon: 'grid', color: 'blue' },
    { label: 'شقق للإيجار', value: aptRent, icon: 'home', color: 'teal' },
    { label: 'شقق للبيع', value: aptSale, icon: 'building', color: 'blue' },
    { label: 'سيارات للإيجار', value: carRent, icon: 'car', color: 'purple' },
    { label: 'سيارات للبيع', value: carSale, icon: 'car2', color: 'rose' },
    { label: 'معدات للإيجار', value: equipRent, icon: 'tool', color: 'amber' },
    { label: 'معدات للبيع', value: equipSale, icon: 'tool2', color: 'amber' },
    { label: 'إعلانات مجانية', value: freeAd, icon: 'free', color: 'green' },
  ];

  const icons = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10H8s-2.7.6-4.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
    car2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10H8s-2.7.6-4.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
    tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    tool2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    free: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  };

  document.getElementById('statsGrid').innerHTML = statsData.map(s => `
    <div class="stat-card ${s.color}">
      <div class="stat-icon ${s.color}">${icons[s.icon]}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');

  const chartData = [
    { label: 'شقق إيجار', value: aptRent, color: '#0D9488' },
    { label: 'شقق بيع', value: aptSale, color: '#F6921E' },
    { label: 'سيارات إيجار', value: carRent, color: '#7C3AED' },
    { label: 'سيارات بيع', value: carSale, color: '#E11D48' },
    { label: 'معدات إيجار', value: equipRent, color: '#D97706' },
    { label: 'معدات بيع', value: equipSale, color: '#B45309' },
    { label: 'مجانية', value: freeAd, color: '#059669' },
  ];
  const maxVal = Math.max(1, ...chartData.map(d => d.value));

  document.getElementById('chartBars').innerHTML = chartData.map(d => `
    <div class="chart-bar-row">
      <div class="chart-bar-label">${d.label}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(d.value / maxVal) * 100}%;background:${d.color}">${d.value}</div>
      </div>
    </div>
  `).join('');

  setTimeout(() => {
    document.querySelectorAll('.chart-bar-fill').forEach(el => {
      const w = el.style.width;
      el.style.width = '0';
      requestAnimationFrame(() => { el.style.width = w; });
    });
  }, 50);
}

/* ===== CHANGE PASSWORD ===== */

/* ===== TOAST ===== */
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => el.classList.remove('show'), 2500);
}

/* ===== INIT ===== */
if (USE_FIREBASE) {
  loadAdsFirebase().then(fbAds => {
    ads = fbAds;
    renderAds();
    lucide.createIcons();
  });
} else {
  renderAds();
  lucide.createIcons();
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=2').catch(err => console.error('SW error:', err));
  });
}
