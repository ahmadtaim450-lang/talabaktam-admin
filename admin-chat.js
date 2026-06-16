/* ============================================================
   طلبك تم — صندوق وارد الأدمن (الدردشات اللحظية مع الزوّار)
   مستقلّ: يحقن واجهته بنفسه. يعتمد على supabaseClient من admin-app.js.
   يتطلّب أن يكون المستخدم كادراً (is_staff): admin أو manager.
   ============================================================ */
(function () {
  'use strict';
  if (typeof supabaseClient === 'undefined') { console.error('[admin-chat] supabaseClient غير محمّل'); return; }

  var sb = supabaseClient;
  var _staff = null;       // الأدمن الحالي
  var _convs = [];         // قائمة المحادثات
  var _conv = null;        // المحادثة المفتوحة
  var _msgChannel = null;  // اشتراك رسائل المحادثة المفتوحة
  var _listChannel = null; // اشتراك عام لتحديث القائمة/العدّاد

  /* ---------- 1) الأنماط ---------- */
  var css = ''
    + '.ai-panel{display:flex;flex-direction:row;direction:rtl;font-family:inherit;height:calc(100vh - 160px);min-height:440px;background:#f8fafc;border:1px solid #eef2f7;border-radius:16px;overflow:hidden}'
    + '@media(max-width:700px){.ai-list.hide{display:none}.ai-thread{display:none}.ai-thread.show{display:flex}}'
    + '.ai-list{width:320px;flex-shrink:0;background:#fff;border-left:1px solid #eef2f7;display:flex;flex-direction:column}'
    + '@media(max-width:700px){.ai-list{width:100%}}'
    + '.ai-list-head{padding:16px;border-bottom:1px solid #eef2f7;display:flex;align-items:center;justify-content:space-between}'
    + '.ai-list-head h3{margin:0;font-size:1.05rem;font-weight:800;color:#0f172a}'
    + '.ai-list-head button{background:none;border:none;font-size:1.5rem;color:#94a3b8;cursor:pointer}'
    + '.ai-convs{flex:1;overflow-y:auto}'
    + '.ai-conv{padding:13px 16px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;flex-direction:column;gap:3px;transition:background .12s}'
    + '.ai-conv:hover{background:#f8fafc}.ai-conv.active{background:#fff7ed}'
    + '.ai-conv .nm{font-weight:800;color:#0f172a;font-size:.9rem;display:flex;justify-content:space-between;align-items:center}'
    + '.ai-conv .nm .dot{width:9px;height:9px;border-radius:50%;background:#ef4444;display:none}'
    + '.ai-conv .nm .dot.show{display:inline-block}'
    + '.ai-conv .sub{font-size:.78rem;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.ai-conv .tm{font-size:.68rem;color:#94a3b8}'
    + '.ai-empty{margin:auto;text-align:center;color:#94a3b8;font-size:.85rem;padding:24px}'
    + '.ai-thread{flex:1;display:flex;flex-direction:column;background:#f8fafc}'
    + '.ai-thread-head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#fff;border-bottom:1px solid #eef2f7}'
    + '.ai-thread-head .bk{background:none;border:none;font-size:1.4rem;color:#64748b;cursor:pointer;display:none}'
    + '@media(max-width:700px){.ai-thread-head .bk{display:block}}'
    + '.ai-thread-head .ti{flex:1}.ai-thread-head .ti .t{font-weight:800;color:#0f172a;font-size:.95rem}.ai-thread-head .ti .s{font-size:.74rem;color:#64748b}'
    + '.ai-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px}'
    + '.ai-bubble{max-width:72%;padding:10px 13px;border-radius:14px;font-size:.9rem;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}'
    + '.ai-bubble.me{align-self:flex-start;background:#F6921E;color:#fff;border-bottom-right-radius:4px}'
    + '.ai-bubble.them{align-self:flex-end;background:#fff;color:#0f172a;border:1px solid #eef2f7;border-bottom-left-radius:4px}'
    + '.ai-bubble .time{display:block;font-size:.62rem;opacity:.7;margin-top:3px}'
    + '.ai-foot{display:flex;gap:8px;padding:12px;background:#fff;border-top:1px solid #eef2f7}'
    + '.ai-foot input{flex:1;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:24px;font-size:.92rem;font-family:inherit;outline:none}'
    + '.ai-foot input:focus{border-color:#F6921E}'
    + '.ai-foot button{flex-shrink:0;width:46px;height:46px;border-radius:50%;border:none;background:#F6921E;color:#fff;font-size:1.2rem;cursor:pointer}'
    + '.ai-pick{margin:auto;text-align:center;color:#94a3b8;font-size:.9rem;padding:24px}'
    + '.ai-adcard{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #eef2f7;border-radius:14px;padding:10px;margin-bottom:8px;position:sticky;top:0}'
    + '.ai-adcard img{width:64px;height:64px;border-radius:10px;object-fit:cover;flex-shrink:0}'
    + '.ai-adcard .noimg{width:64px;height:64px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;flex-shrink:0}'
    + '.ai-adcard-info{overflow:hidden}'
    + '.ai-adcard .t{font-weight:800;color:#0f172a;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.ai-adcard .p{color:#F6921E;font-weight:800;font-size:.85rem;margin-top:2px}'
    + '.ai-adcard .r{font-size:.7rem;color:#94a3b8;margin-top:2px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- 2) DOM ---------- */
  var panel = document.createElement('div');
  panel.className = 'ai-panel'; panel.id = 'aiPanel';
  panel.innerHTML = ''
    + '<div class="ai-list" id="aiList">'
    + '  <div class="ai-list-head"><h3>المحادثات</h3></div>'
    + '  <div class="ai-convs" id="aiConvs"></div>'
    + '</div>'
    + '<div class="ai-thread" id="aiThread">'
    + '  <div class="ai-thread-head"><button class="bk" onclick="window._aiBackList()">&#8594;</button>'
    + '    <div class="ti"><div class="t" id="aiThreadTitle">اختر محادثة</div><div class="s" id="aiThreadSub"></div></div>'
    + '    <button id="aiProfBtn" onclick="window._aiOpenProfile()" title="ملف العميل" style="display:none;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;cursor:pointer;font-size:.78rem;font-weight:800;border-radius:10px;padding:7px 11px;margin-left:6px">ملف العميل</button>'
    + '    <button id="aiEndBtn" onclick="window._aiEndSession()" title="إنهاء الجلسة وحذف المحادثة" style="display:none;background:#fef2f2;border:1px solid #fecaca;color:#ef4444;cursor:pointer;font-size:.78rem;font-weight:800;border-radius:10px;padding:7px 11px">إنهاء الجلسة</button></div>'
    + '  <div class="ai-body" id="aiBody"><div class="ai-pick">اختر محادثة من القائمة للردّ</div></div>'
    + '  <div class="ai-foot"><input id="aiInput" placeholder="اكتب ردّك..." onkeydown="if(event.key===\'Enter\')window._aiSend()"><button onclick="window._aiSend()">&#10148;</button></div>'
    + '</div>';
  (document.getElementById('sectionInbox') || document.body).appendChild(panel);

  /* ---------- 3) أدوات ---------- */
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function fmtTime(ts) { try { return new Date(ts).toLocaleString('ar', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' }); } catch (e) { return ''; } }

  /* ---------- 4) العدّاد العام + الاشتراك ---------- */
  async function refreshBadge() {
    try {
      var r = await sb.from('messages').select('id', { count: 'exact', head: true }).eq('sender_role', 'user').eq('read', false);
      var n = r.count || 0;
      var b = document.getElementById('navInboxCount');
      if (b) { b.textContent = n; b.style.display = n > 0 ? 'inline-block' : 'none'; }
    } catch (e) {}
  }
  function subscribeList() {
    if (_listChannel) return;
    _listChannel = sb.channel('ai-all-msgs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, function (payload) {
        var m = payload.new;
        if (m.sender_role === 'user') {
          refreshBadge();
          if (document.getElementById('aiPanel').classList.contains('show')) loadConversations();
        }
      }).subscribe();
  }

  /* ---------- 5) قائمة المحادثات ---------- */
  async function loadConversations() {
    var box = document.getElementById('aiConvs');
    var r = await sb.from('conversations').select('*').order('last_message_at', { ascending: false }).limit(100);
    if (r.error) { box.innerHTML = '<div class="ai-empty">تعذّر التحميل: ' + esc(r.error.message) + '</div>'; return; }
    _convs = r.data || [];
    if (!_convs.length) { box.innerHTML = '<div class="ai-empty">لا توجد محادثات بعد</div>'; return; }
    // عدّ غير المقروء لكل محادثة
    var unread = {};
    try {
      var u = await sb.from('messages').select('conversation_id').eq('sender_role', 'user').eq('read', false);
      (u.data || []).forEach(function (x) { unread[x.conversation_id] = (unread[x.conversation_id] || 0) + 1; });
    } catch (e) {}
    box.innerHTML = _convs.map(function (c) {
      var name = c.user_name || c.user_email || 'زائر';
      var subj = c.subject ? ('بخصوص: ' + c.subject) : (c.user_email || '');
      var hasUnread = unread[c.id] > 0;
      return '<div class="ai-conv' + (_conv && _conv.id === c.id ? ' active' : '') + '" onclick="window._aiOpen(' + c.id + ')">'
        + '<div class="nm">' + esc(name) + '<span class="dot' + (hasUnread ? ' show' : '') + '"></span></div>'
        + '<div class="sub">' + esc(subj) + '</div>'
        + '<div class="tm">' + fmtTime(c.last_message_at || c.created_at) + '</div>'
        + '</div>';
    }).join('');
  }

  /* ---------- 6) المحادثة ---------- */
  function adCardHtml(ad) {
    var img = (ad.images && ad.images.length) ? ad.images[0] : '';
    return '<div class="ai-adcard">'
      + (img ? '<img src="' + esc(img) + '" alt="">' : '<div class="noimg">لا صورة</div>')
      + '<div class="ai-adcard-info">'
      + '<div class="t">' + esc(ad.title || 'إعلان') + '</div>'
      + (ad.price ? '<div class="p">' + Number(ad.price).toLocaleString('en-US') + ' ل.س</div>' : '')
      + (ad.ref ? '<div class="r">رمز: ' + esc(ad.ref) + '</div>' : '')
      + '</div></div>';
  }
  function renderMsg(m) {
    var body = document.getElementById('aiBody');
    var div = document.createElement('div');
    div.className = 'ai-bubble ' + (m.sender_role === 'admin' ? 'me' : 'them');
    div.innerHTML = esc(m.body) + '<span class="time">' + fmtTime(m.created_at) + '</span>';
    body.appendChild(div); body.scrollTop = body.scrollHeight;
  }
  async function markRead(convId) {
    try { await sb.from('messages').update({ read: true }).eq('conversation_id', convId).eq('sender_role', 'user').eq('read', false); } catch (e) {}
    refreshBadge();
  }
  function subscribeThread(convId) {
    if (_msgChannel) { sb.removeChannel(_msgChannel); _msgChannel = null; }
    _msgChannel = sb.channel('ai-thread-' + convId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + convId },
        function (payload) {
          var m = payload.new;
          if (m.sender_role === 'admin') return; // ردّي معروض مسبقاً
          renderMsg(m); markRead(convId);
        }).subscribe();
  }
  window._aiOpen = async function (convId) {
    _conv = _convs.find(function (c) { return c.id === convId; });
    if (!_conv) return;
    document.getElementById('aiThreadTitle').textContent = _conv.user_name || _conv.user_email || 'زائر';
    document.getElementById('aiThreadSub').textContent = (_conv.subject ? 'بخصوص: ' + _conv.subject : '') + (_conv.user_email ? '  •  ' + _conv.user_email : '');
    document.getElementById('aiList').classList.add('hide');
    document.getElementById('aiThread').classList.add('show');
    document.getElementById('aiEndBtn').style.display = 'block';
    document.getElementById('aiProfBtn').style.display = 'block';
    var body = document.getElementById('aiBody'); body.innerHTML = '';
    // بطاقة الإعلان المرتبط بالمحادثة أعلى الرسائل
    if (_conv.ad_id != null) {
      try {
        var ar = await sb.from('ads').select('id,title,price,images,ref').eq('id', _conv.ad_id).maybeSingle();
        if (ar.data) body.innerHTML = adCardHtml(ar.data);
      } catch (e) {}
    }
    var r = await sb.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
    if (r.error) { body.innerHTML += '<div class="ai-pick">تعذّر تحميل الرسائل</div>'; }
    else if (!r.data.length) { body.innerHTML += '<div class="ai-pick" style="margin:14px auto">لا رسائل بعد — اكتب ردّك بالأسفل</div>'; }
    else r.data.forEach(renderMsg);
    subscribeThread(convId);
    markRead(convId);
    loadConversations();
    setTimeout(function () { document.getElementById('aiInput').focus(); }, 100);
  };
  window._aiBackList = function () {
    document.getElementById('aiThread').classList.remove('show');
    document.getElementById('aiList').classList.remove('hide');
    document.getElementById('aiEndBtn').style.display = 'none';
    document.getElementById('aiProfBtn').style.display = 'none';
  };
  window._aiEndSession = async function () {
    if (!_conv) return;
    if (!confirm('إنهاء الجلسة وحذف هذه المحادثة نهائياً؟')) return;
    var id = _conv.id;
    var r = await sb.from('conversations').delete().eq('id', id);
    if (r.error) { alert('تعذّر الحذف: ' + r.error.message); return; }
    if (_msgChannel) { sb.removeChannel(_msgChannel); _msgChannel = null; }
    _conv = null;
    window._aiBackList();
    loadConversations();
    refreshBadge();
  };
  window._aiSend = async function () {
    var inp = document.getElementById('aiInput'); var text = inp.value.trim();
    if (!text || !_conv || !_staff) return;
    inp.value = '';
    renderMsg({ sender_role: 'admin', body: text, created_at: new Date().toISOString() });
    var r = await sb.from('messages').insert({ conversation_id: _conv.id, sender_id: _staff.id, sender_role: 'admin', body: text });
    if (r.error) { alert('تعذّر الإرسال: ' + r.error.message); return; }
    try { await sb.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', _conv.id); } catch (e) {}
  };

  /* ---------- 7) فتح/إغلاق ---------- */
  window._aiLoad = async function () {
    if (!_staff) { var s = await sb.auth.getUser(); _staff = s.data ? s.data.user : null; }
    if (!_staff) return;
    loadConversations();
  };
  window._aiOpenUser = async function (userId) {
    await loadConversations();
    var c = _convs.find(function (x) { return x.user_id === userId; });
    if (c) window._aiOpen(c.id);
    else alert('لا توجد محادثات لهذا العميل بعد');
  };
  window._aiOpenProfile = function () {
    if (_conv && window.openCustomerProfile) window.openCustomerProfile(_conv.user_email || '');
  };

  /* ---------- 8) تشغيل ---------- */
  sb.auth.getUser().then(function (s) {
    _staff = s.data ? s.data.user : null;
    if (_staff) { refreshBadge(); subscribeList(); }
  });
  sb.auth.onAuthStateChange(function (e, session) {
    _staff = session ? session.user : null;
    if (_staff) { refreshBadge(); subscribeList(); }
  });
})();
