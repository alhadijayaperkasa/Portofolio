/**
 * Alhadi Cyber Media — Client Hub & Service Platform
 * Powered by InsForge Backend (Auth, Postgres DB, Realtime)
 */

(function () {
  const INSFORGE_URL = 'https://99gg5hx6.ap-southeast.insforge.app';
  const INSFORGE_ANON = 'anon_402acfeb9cd6440f05576ad1144291add74a4fafbdfa36ffa4634b3b71bc2685';

  let insforge = null;
  let currentUser = null;
  let userProfile = null;
  let activeConsultationId = null;

  // Initialize SDK
  function initSDK() {
    if (typeof InsForgeSDK !== 'undefined' && InsForgeSDK.createClient) {
      insforge = InsForgeSDK.createClient({
        baseUrl: INSFORGE_URL,
        anonKey: INSFORGE_ANON
      });
      window.insforgeClient = insforge;
      checkAuthStatus();
    } else {
      setTimeout(initSDK, 100);
    }
  }

  // ── 1. AUTHENTICATION MANAGEMENT ──────────────────────────────────────
  async function checkAuthStatus() {
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (data && data.user) {
        currentUser = data.user;
        await fetchProfile();
      } else {
        currentUser = null;
        userProfile = null;
      }
    } catch (err) {
      currentUser = null;
    }
    updateUserUI();
  }

  async function fetchProfile() {
    if (!currentUser) return;
    try {
      const { data } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      if (data) {
        userProfile = data;
      } else {
        // Create default profile if missing
        const newProf = {
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.profile?.name || currentUser.email.split('@')[0],
          role: 'client'
        };
        await insforge.database.from('profiles').insert([newProf]);
        userProfile = newProf;
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }
  }

  function updateUserUI() {
    const userNavBtn = document.getElementById('userNavBtn');
    if (!userNavBtn) return;

    if (currentUser) {
      const displayName = userProfile?.full_name || currentUser.email.split('@')[0];
      userNavBtn.innerHTML = `
        <span class="user-badge-avatar"><i class="ph ph-user-circle"></i></span>
        <span class="user-badge-name">${escapeHTML(displayName)}</span>
      `;
      userNavBtn.onclick = openProfileModal;
    } else {
      userNavBtn.innerHTML = `
        <i class="ph ph-sign-in"></i><span>Masuk / Daftar</span>
      `;
      userNavBtn.onclick = () => openAuthModal('login');
    }
  }

  let pendingVerifyEmail = '';

  // Auth Modals & Actions
  window.openAuthModal = function (mode = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    document.getElementById('authTabLogin').classList.toggle('active', mode === 'login');
    document.getElementById('authTabRegister').classList.toggle('active', mode === 'register');
    document.getElementById('authTabVerify').classList.toggle('active', mode === 'verify');

    document.getElementById('authFormLogin').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('authFormRegister').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('authFormVerify').style.display = mode === 'verify' ? 'block' : 'none';
    document.getElementById('authAlert').style.display = 'none';

    if (mode === 'verify' && pendingVerifyEmail) {
      document.getElementById('verifyEmailLabel').textContent = pendingVerifyEmail;
    }

    modal.classList.add('is-open');
  };

  window.openVerifyEmailModal = function (email) {
    pendingVerifyEmail = email || '';
    openAuthModal('verify');
  };

  window.closeAuthModal = function () {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('is-open');
  };

  window.handleAuthLogin = async function (e) {
    e.preventDefault();
    const alertEl = document.getElementById('authAlert');
    alertEl.style.display = 'none';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.error === 'EMAIL_NOT_VERIFIED' || (error.message && error.message.toLowerCase().includes('verify'))) {
          pendingVerifyEmail = email;
          openAuthModal('verify');
          alertEl.className = 'auth-alert auth-alert-error';
          alertEl.textContent = 'Email Anda belum diverifikasi. Silakan masukkan 6 digit kode OTP dari email Anda di bawah.';
          alertEl.style.display = 'block';
          return;
        }
        throw error;
      }

      currentUser = data.user;
      await fetchProfile();
      updateUserUI();
      closeAuthModal();
      showToast('Berhasil masuk! Selamat datang kembali.', 'success');
    } catch (err) {
      alertEl.className = 'auth-alert auth-alert-error';
      alertEl.textContent = err.message || 'Gagal masuk. Periksa email & password Anda.';
      alertEl.style.display = 'block';
    }
  };

  window.handleAuthRegister = async function (e) {
    e.preventDefault();
    const alertEl = document.getElementById('authAlert');
    alertEl.style.display = 'none';

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;

    try {
      const { data, error } = await insforge.auth.signUp({ email, password, name });
      if (error) throw error;

      if (data.user) {
        currentUser = data.user;
        // save profile details
        try {
          await insforge.database.from('profiles').insert([{
            id: data.user.id,
            email: email,
            full_name: name,
            phone: phone,
            role: 'client'
          }]);
        } catch (pe) {}
      }

      pendingVerifyEmail = email;
      openAuthModal('verify');
      showToast('Pendaftaran berhasil! Kode OTP 6 digit telah dikirim ke email Anda.', 'success');
    } catch (err) {
      alertEl.className = 'auth-alert auth-alert-error';
      alertEl.textContent = err.message || 'Gagal mendaftar. Silakan coba lagi.';
      alertEl.style.display = 'block';
    }
  };

  window.handleAuthVerifyOtp = async function (e) {
    e.preventDefault();
    const alertEl = document.getElementById('authAlert');
    alertEl.style.display = 'none';

    const otp = document.getElementById('verifyOtpCode').value.trim();
    const email = pendingVerifyEmail || document.getElementById('loginEmail').value.trim();

    if (!otp || otp.length !== 6) {
      alertEl.className = 'auth-alert auth-alert-error';
      alertEl.textContent = 'Masukkan 6 digit kode OTP secara lengkap.';
      alertEl.style.display = 'block';
      return;
    }

    try {
      const { data, error } = await insforge.auth.verifyEmail({ email, otp });
      if (error) throw error;

      if (data && data.user) {
        currentUser = data.user;
        await fetchProfile();
      }
      updateUserUI();
      closeAuthModal();
      showToast('Email berhasil diverifikasi! Akun Anda kini sudah aktif.', 'success');
    } catch (err) {
      alertEl.className = 'auth-alert auth-alert-error';
      alertEl.textContent = err.message || 'Kode OTP tidak valid atau sudah kedaluwarsa. Silakan periksa kembali.';
      alertEl.style.display = 'block';
    }
  };

  window.handleResendOtp = async function () {
    const email = pendingVerifyEmail || document.getElementById('loginEmail').value.trim();
    if (!email) {
      showToast('Email tidak ditemukan. Silakan masuk terlebih dahulu.', 'error');
      return;
    }

    try {
      const { error } = await insforge.auth.resendVerificationEmail({ email });
      if (error) throw error;
      showToast(`Kode OTP baru telah dikirimkan ke ${email}.`, 'info');
    } catch (err) {
      showToast('Gagal mengirim ulang OTP: ' + err.message, 'error');
    }
  };

  window.handleAuthLogout = async function () {
    try {
      await insforge.auth.signOut();
    } catch (e) {}
    currentUser = null;
    userProfile = null;
    updateUserUI();
    closeProfileModal();
    showToast('Anda telah keluar dari akun.', 'info');
  };

  // ── 2. PROFILE DRAWER & HISTORY ──────────────────────────────────────
  window.openProfileModal = async function () {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    if (currentUser) {
      document.getElementById('profName').value = userProfile?.full_name || '';
      document.getElementById('profEmail').value = currentUser.email || '';
      document.getElementById('profPhone').value = userProfile?.phone || '';
      document.getElementById('profCompany').value = userProfile?.company_name || '';

      await loadUserConsultations();
      await loadUserAppointments();
    }
    modal.classList.add('is-open');
  };

  window.closeProfileModal = function () {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('is-open');
  };

  window.handleUpdateProfile = async function (e) {
    e.preventDefault();
    if (!currentUser) return;

    const full_name = document.getElementById('profName').value.trim();
    const phone = document.getElementById('profPhone').value.trim();
    const company_name = document.getElementById('profCompany').value.trim();

    try {
      const { error } = await insforge.database
        .from('profiles')
        .update({ full_name, phone, company_name, updated_at: new Date() })
        .eq('id', currentUser.id);

      if (error) throw error;

      if (userProfile) {
        userProfile.full_name = full_name;
        userProfile.phone = phone;
        userProfile.company_name = company_name;
      }
      updateUserUI();
      showToast('Profil berhasil diperbarui!', 'success');
    } catch (err) {
      showToast('Gagal memperbarui profil: ' + err.message, 'error');
    }
  };

  async function loadUserConsultations() {
    const listEl = document.getElementById('userConsultationsList');
    if (!listEl) return;

    listEl.innerHTML = '<div class="hub-loading">Memuat riwayat diskusi...</div>';

    try {
      let query = insforge.database.from('consultations').select('*').order('created_at', { ascending: false });
      if (currentUser) {
        query = query.eq('user_id', currentUser.id);
      }
      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        listEl.innerHTML = '<p class="hub-empty">Belum ada diskusi proyek. Mulai konsultasi baru di bawah!</p>';
        return;
      }

      listEl.innerHTML = data.map(item => `
        <div class="hub-item-card">
          <div class="hub-item-header">
            <span class="hub-badge hub-badge-${item.status}">${item.status.toUpperCase()}</span>
            <span class="hub-item-date">${new Date(item.created_at).toLocaleDateString('id-ID')}</span>
          </div>
          <h4 class="hub-item-title">${escapeHTML(item.project_type)}</h4>
          <p class="hub-item-desc">${escapeHTML(item.description || 'Tidak ada deskripsi.')}</p>
          <div class="hub-item-meta">
            <span><i class="ph ph-wallet"></i> ${escapeHTML(item.budget_range || '-')}</span>
            <button type="button" class="btn-hub-sm" onclick="openDiscussionThread('${item.id}', '${escapeHTML(item.project_type)}')">
              <i class="ph ph-chat-circle-dots"></i> Buka Diskusi Chat
            </button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      listEl.innerHTML = '<p class="hub-empty">Gagal memuat daftar diskusi.</p>';
    }
  }

  async function loadUserAppointments() {
    const listEl = document.getElementById('userAppointmentsList');
    if (!listEl) return;

    listEl.innerHTML = '<div class="hub-loading">Memuat jadwal pertemuan...</div>';

    try {
      let query = insforge.database.from('appointments').select('*').order('meeting_date', { ascending: true });
      if (currentUser) {
        query = query.eq('user_id', currentUser.id);
      }
      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        listEl.innerHTML = '<p class="hub-empty">Belum ada jadwal pertemuan yang dipesan.</p>';
        return;
      }

      listEl.innerHTML = data.map(app => `
        <div class="hub-item-card">
          <div class="hub-item-header">
            <span class="hub-badge hub-badge-confirmed">${app.status.toUpperCase()}</span>
            <span class="hub-item-date"><i class="ph ph-calendar"></i> ${app.meeting_date} · ${app.meeting_time}</span>
          </div>
          <h4 class="hub-item-title">${escapeHTML(app.topic)}</h4>
          <p class="hub-item-desc">Media: <b>${app.meeting_type.toUpperCase().replace('_', ' ')}</b></p>
        </div>
      `).join('');
    } catch (e) {
      listEl.innerHTML = '<p class="hub-empty">Gagal memuat jadwal pertemuan.</p>';
    }
  }

  // ── 3. FITUR DISKUSI KEBUTUHAN (CONSULTATIONS & MESSAGING) ─────────────
  window.openNewConsultationModal = function (presetSpec = null) {
    const modal = document.getElementById('consultationModal');
    if (!modal) return;

    // autofill if logged in
    if (currentUser) {
      document.getElementById('consultName').value = userProfile?.full_name || '';
      document.getElementById('consultEmail').value = currentUser.email || '';
      document.getElementById('consultPhone').value = userProfile?.phone || '';
    }

    if (presetSpec) {
      document.getElementById('consultProjectType').value = presetSpec.type || 'WebApp & SaaS';
      document.getElementById('consultBudget').value = presetSpec.budget || '10-25 Juta';
      document.getElementById('consultDesc').value = `[Rekomendasi Spesifikasi]\nTech Stack: ${presetSpec.stack || '-'}\nFitur AI: ${presetSpec.ai || '-'}\nEstimasi Waktu: ${presetSpec.duration || '-'}`;
    }

    modal.classList.add('is-open');
  };

  window.closeConsultationModal = function () {
    const modal = document.getElementById('consultationModal');
    if (modal) modal.classList.remove('is-open');
  };

  window.handleConsultationSubmit = async function (e) {
    e.preventDefault();

    const client_name = document.getElementById('consultName').value.trim();
    const client_email = document.getElementById('consultEmail').value.trim();
    const client_phone = document.getElementById('consultPhone').value.trim();
    const project_type = document.getElementById('consultProjectType').value;
    const budget_range = document.getElementById('consultBudget').value;
    const timeline = document.getElementById('consultTimeline').value;
    const description = document.getElementById('consultDesc').value.trim();

    try {
      const payload = {
        user_id: currentUser ? currentUser.id : null,
        client_name,
        client_email,
        client_phone,
        project_type,
        budget_range,
        timeline,
        description,
        status: 'pending'
      };

      const { data, error } = await insforge.database.from('consultations').insert([payload]).select();
      if (error) throw error;

      closeConsultationModal();
      showToast('Diskusi kebutuhan berhasil terkirim! Tim kami akan meninjau dan merespon.', 'success');

      if (data && data[0]) {
        openDiscussionThread(data[0].id, project_type);
      }
    } catch (err) {
      showToast('Gagal mengirimkan pengajuan: ' + err.message, 'error');
    }
  };

  // Discussion Thread Modal
  window.openDiscussionThread = async function (consultationId, title = 'Diskusi Proyek') {
    activeConsultationId = consultationId;
    const modal = document.getElementById('discussionThreadModal');
    if (!modal) return;

    document.getElementById('threadTitle').textContent = title;
    modal.classList.add('is-open');

    await loadDiscussionMessages();
  };

  window.closeDiscussionThreadModal = function () {
    const modal = document.getElementById('discussionThreadModal');
    if (modal) modal.classList.remove('is-open');
    activeConsultationId = null;
  };

  async function loadDiscussionMessages() {
    if (!activeConsultationId) return;

    const chatBody = document.getElementById('threadChatBody');
    chatBody.innerHTML = '<div class="chat-loading">Memuat pesan diskusi...</div>';

    try {
      const { data, error } = await insforge.database
        .from('discussion_messages')
        .select('*')
        .eq('consultation_id', activeConsultationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        chatBody.innerHTML = `
          <div class="chat-system-msg">
            📌 Diskusi kebutuhan proyek telah dibuka. Kirimkan pesan atau pertanyaan detail Anda di sini untuk respon cepat!
          </div>
        `;
        return;
      }

      chatBody.innerHTML = data.map(m => {
        const isSelf = currentUser ? m.sender_id === currentUser.id : m.sender_role === 'client';
        return `
          <div class="chat-msg-row ${isSelf ? 'chat-self' : 'chat-other'}">
            <div class="chat-bubble">
              <div class="chat-sender">${escapeHTML(m.sender_name)} <span class="chat-role">${m.sender_role.toUpperCase()}</span></div>
              <div class="chat-text">${escapeHTML(m.message)}</div>
              <div class="chat-time">${new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        `;
      }).join('');

      chatBody.scrollTop = chatBody.scrollHeight;
    } catch (err) {
      chatBody.innerHTML = '<div class="chat-system-msg">Gagal memuat pesan.</div>';
    }
  }

  window.handleSendChatMessage = async function (e) {
    e.preventDefault();
    if (!activeConsultationId) return;

    const input = document.getElementById('threadInputMessage');
    const msgText = input.value.trim();
    if (!msgText) return;

    const senderName = currentUser ? (userProfile?.full_name || currentUser.email) : 'Klien';

    try {
      const payload = {
        consultation_id: activeConsultationId,
        sender_id: currentUser ? currentUser.id : null,
        sender_name: senderName,
        sender_role: 'client',
        message: msgText
      };

      input.value = '';
      const { error } = await insforge.database.from('discussion_messages').insert([payload]);
      if (error) throw error;

      await loadDiscussionMessages();
    } catch (err) {
      showToast('Gagal mengirim pesan: ' + err.message, 'error');
    }
  };

  // ── 4. FITUR BOOK JADWAL PERTEMUAN (MEETING SCHEDULER) ────────────────
  window.openBookingModal = function () {
    const modal = document.getElementById('bookingModal');
    if (!modal) return;

    if (currentUser) {
      document.getElementById('bookName').value = userProfile?.full_name || '';
      document.getElementById('bookEmail').value = currentUser.email || '';
      document.getElementById('bookPhone').value = userProfile?.phone || '';
    }

    // set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('bookDate').min = tomorrow.toISOString().split('T')[0];

    modal.classList.add('is-open');
  };

  window.closeBookingModal = function () {
    const modal = document.getElementById('bookingModal');
    if (modal) modal.classList.remove('is-open');
  };

  window.handleBookingSubmit = async function (e) {
    e.preventDefault();

    const client_name = document.getElementById('bookName').value.trim();
    const client_email = document.getElementById('bookEmail').value.trim();
    const client_phone = document.getElementById('bookPhone').value.trim();
    const topic = document.getElementById('bookTopic').value.trim();
    const meeting_date = document.getElementById('bookDate').value;
    const meeting_time = document.getElementById('bookTime').value;
    const meeting_type = document.getElementById('bookType').value;
    const notes = document.getElementById('bookNotes').value.trim();

    try {
      const payload = {
        user_id: currentUser ? currentUser.id : null,
        client_name,
        client_email,
        client_phone,
        topic,
        meeting_date,
        meeting_time,
        meeting_type,
        status: 'confirmed',
        notes
      };

      const { error } = await insforge.database.from('appointments').insert([payload]);
      if (error) throw error;

      closeBookingModal();
      showToast(`Jadwal pertemuan berhasil dipesan untuk tanggal ${meeting_date} pukul ${meeting_time} WIB.`, 'success');
    } catch (err) {
      showToast('Gagal memesan jadwal: ' + err.message, 'error');
    }
  };

  // ── 5. FITUR REKOMENDASI SPESIFIKASI & WIZARD KALKULATOR ─────────────
  window.calculateSpecRecommendation = function () {
    const appType = document.getElementById('specAppType').value;
    const scale = document.getElementById('specScale').value;
    const features = Array.from(document.querySelectorAll('.spec-feature-check:checked')).map(c => c.value);

    let resultStack = [];
    let resultAi = [];
    let estBudget = '';
    let estDuration = '';
    let architectureNote = '';

    if (appType === 'website') {
      resultStack = ['Astro / Next.js', 'Tailwind CSS', 'Cloudflare CDN'];
      estBudget = scale === 'enterprise' ? '8 – 15 Juta' : '3.5 – 7 Juta';
      estDuration = '5 – 10 Hari Kerja';
      architectureNote = 'SSR/SSG imersif, SEO tingkat tinggi, loading di bawah 1 detik, aman dari DDoS.';
    } else if (appType === 'webapp') {
      resultStack = ['React / Next.js', 'Node.js Express', 'PostgreSQL', 'Redis'];
      estBudget = scale === 'enterprise' ? '25 – 60 Juta' : '12 – 22 Juta';
      estDuration = '3 – 6 Minggu';
      architectureNote = 'Arsitektur modular, role-based auth, dashboard admin realtime, auto backup data.';
    } else if (appType === 'saas') {
      resultStack = ['Next.js App Router', 'PostgreSQL + Supabase', 'Docker', 'Midtrans / Xendit'];
      estBudget = scale === 'enterprise' ? '45 – 90 Juta' : '20 – 38 Juta';
      estDuration = '1 – 2 Bulan';
      architectureNote = 'Multi-tenant architecture, sistem langganan otomatis, rate limiting & 2FA security.';
    } else {
      resultStack = ['React Native / PWA', 'Laravel / Node.js API', 'PostgreSQL'];
      estBudget = '15 – 35 Juta';
      estDuration = '3 – 5 Minggu';
      architectureNote = 'Cross-platform PWA offline-first, push notification browser & WhatsApp gateway.';
    }

    if (features.includes('auth')) {
      architectureNote += ' + Autentikasi OAuth Google & OTP WhatsApp.';
    }
    if (features.includes('qris')) {
      resultStack.push('Midtrans / QRIS Automatic Hook');
    }
    if (features.includes('ai_chatbot')) {
      resultAi.push('AI Chatbot Custom Data (RAG)');
    }
    if (features.includes('ocr')) {
      resultAi.push('OCR Dokumen Browser (Tesseract.js)');
    }
    if (features.includes('speech')) {
      resultAi.push('Web Speech Voice Input');
    }

    if (resultAi.length === 0) {
      resultAi = ['Pencarian semantik', 'Deteksi Anomali Data'];
    }

    const outputBox = document.getElementById('specOutputBox');
    outputBox.innerHTML = `
      <div class="spec-result-card">
        <div class="spec-header">
          <span class="spec-kicker">Rekomendasi Cetak Biru Spesifikasi</span>
          <h3>Estimasi Investasi: <span class="spec-price">${estBudget}</span></h3>
          <p class="spec-duration"><i class="ph ph-clock"></i> Estimasi Pengerjaan: <b>${estDuration}</b></p>
        </div>
        <div class="spec-details-grid">
          <div>
            <h5><i class="ph ph-cpu"></i> Rekomendasi Stack</h5>
            <ul class="chips">${resultStack.map(s => `<li>${s}</li>`).join('')}</ul>
          </div>
          <div>
            <h5><i class="ph ph-brain"></i> Fitur AI Tepat Guna</h5>
            <ul class="chips">${resultAi.map(a => `<li>${a}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="spec-arch-note">
          <h5><i class="ph ph-shield-check"></i> Arsitektur & Keamanan</h5>
          <p>${architectureNote}</p>
        </div>
        <div class="spec-cta-row">
          <button type="button" class="btn-spec-action" onclick="openNewConsultationModal({ type: '${appType.toUpperCase()}', budget: '${estBudget}', stack: '${resultStack.join(', ')}', ai: '${resultAi.join(', ')}', duration: '${estDuration}' })">
            <i class="ph ph-rocket-launch"></i> Gunakan Spesifikasi Ini untuk Diskusi Proyek
          </button>
        </div>
      </div>
    `;
    outputBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // ── UTILITIES ─────────────────────────────────────────────────────────
  function escapeHTML(str) {
    return (str || '').replace(/[&<>"']/g, match => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
  }

  window.showToast = function (message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="ph ph-${type === 'success' ? 'check-circle' : type === 'error' ? 'warning-circle' : 'info'}"></i>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  };

  // DOM Loaded listener
  document.addEventListener('DOMContentLoaded', initSDK);
})();
