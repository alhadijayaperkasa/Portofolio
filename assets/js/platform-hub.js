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
      ensureModalsExist();
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
      // Map app type to consultation project type select
      const typeMap = {
        'WEBSITE': 'Website & Landing Page',
        'WEBAPP': 'WebApp & SaaS',
        'SAAS': 'WebApp & SaaS',
        'MOBILE': 'PWA Mobile & POS'
      };
      const projectType = typeMap[presetSpec.type] || 'WebApp & SaaS';
      document.getElementById('consultProjectType').value = projectType;
      document.getElementById('consultBudget').value = presetSpec.budget || '10-25 Juta';
      document.getElementById('consultTimeline').value = presetSpec.duration || '';

      // Build comprehensive specification summary
      let desc = '══════════════════════════════════════\n';
      desc += '📋 CETAK BIRU SPESIFIKASI KALKULATOR\n';
      desc += '══════════════════════════════════════\n\n';

      desc += `🏷️ Jenis Aplikasi: ${presetSpec.appTypeLabel || presetSpec.type}\n`;
      desc += `📊 Tingkat Usaha: ${presetSpec.scaleLabel || '-'}\n`;
      desc += `⏱️ Estimasi Durasi: ${presetSpec.duration || '-'}\n`;
      desc += `💰 Total Estimasi Setup: ${presetSpec.totalSetup || '-'}\n`;
      desc += `📆 Operasional Bulanan: ${presetSpec.totalMonthly || 'Rp 0'}\n\n`;

      // Cost breakdown table
      if (presetSpec.costItems && presetSpec.costItems.length > 0) {
        desc += '──────────────────────────────────────\n';
        desc += '💳 RINCIAN BIAYA PER MODUL:\n';
        desc += '──────────────────────────────────────\n';
        presetSpec.costItems.forEach((item, i) => {
          desc += `\n${i + 1}. ${item.category}\n`;
          desc += `   Spesifikasi: ${item.spec}\n`;
          desc += `   Setup: ${item.setupFormatted}\n`;
          desc += `   Bulanan: ${item.monthly}\n`;
        });
        desc += '\n';
      }

      // Tech stack
      if (presetSpec.stack && presetSpec.stack.length > 0) {
        desc += '──────────────────────────────────────\n';
        desc += '🛠️ REKOMENDASI TECH STACK:\n';
        desc += '──────────────────────────────────────\n';
        presetSpec.stack.forEach(s => { desc += `• ${s}\n`; });
        desc += '\n';
      }

      // AI modules
      if (presetSpec.ai && presetSpec.ai.length > 0 && presetSpec.ai[0] !== 'Tanpa Modul AI') {
        desc += '🤖 MODUL AI:\n';
        presetSpec.ai.forEach(a => { desc += `• ${a}\n`; });
        desc += '\n';
      }

      // Hosting & Infrastructure
      if (presetSpec.hosting) {
        desc += `☁️ Infrastruktur: ${presetSpec.hosting}\n`;
        desc += `   Backup Harian: ${presetSpec.backupActive ? 'Aktif ✅' : 'Non-aktif ❌'}\n`;
        desc += `   WAF Cloudflare: ${presetSpec.wafActive ? 'Aktif ✅' : 'Non-aktif ❌'}\n\n`;
      }

      // Architecture note
      if (presetSpec.architectureNote) {
        desc += '──────────────────────────────────────\n';
        desc += '📐 CATATAN ARSITEKTUR:\n';
        desc += '──────────────────────────────────────\n';
        desc += presetSpec.architectureNote + '\n';
      }

      document.getElementById('consultDesc').value = desc;
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
    const cloud = document.getElementById('specCloud').value;
    const backend = document.getElementById('specBackend').value;
    const ai = document.getElementById('specAI').value;
    const payment = document.getElementById('specPayment').value;

    const featureAuth = document.getElementById('featureAuth').checked;
    const featureWaf = document.getElementById('featureWaf').checked;
    const featureBackup = document.getElementById('featureBackup').checked;
    const featureAnalytics = document.getElementById('featureAnalytics').checked;

    let resultStack = [];
    let resultAi = [];
    let estDuration = '';
    let architectureNote = '';
    
    // Cost analysis array
    let costItems = [];
    let totalSetup = 0;
    let totalMonthlyMin = 0;
    let totalMonthlyMax = 0;

    // 1. Base Development Fee mapping based on App Type
    let baseAppPrice = 0;
    let appTypeLabel = '';
    if (appType === 'website') {
      resultStack = ['Astro / Next.js', 'Tailwind CSS', 'Vite'];
      baseAppPrice = 1200000;
      appTypeLabel = 'Website / Landing Page';
      estDuration = '3 – 5 Hari Kerja';
      architectureNote = 'Website statik supercepat dengan integrasi SEO tingkat lanjut & loading kurang dari 1 detik.';
    } else if (appType === 'webapp') {
      resultStack = ['React / Next.js', 'Tailwind CSS', 'Node.js API'];
      baseAppPrice = 3200000;
      appTypeLabel = 'WebApp Custom / Portal Bisnis';
      estDuration = '2 – 3 Minggu';
      architectureNote = 'Web Application kustom dengan dashboard admin interaktif, sistem hak akses pengguna, dan rekap data.';
    } else if (appType === 'saas') {
      resultStack = ['Next.js App Router', 'Tailwind CSS', 'Node.js Serverless'];
      baseAppPrice = 5500000;
      appTypeLabel = 'Platform SaaS Multi-Tenant';
      estDuration = '4 – 5 Minggu';
      architectureNote = 'Platform SaaS Multi-Tenant dengan manajemen langganan (billing), pendaftaran otomatis tenancies, dan proteksi API.';
    } else if (appType === 'mobile') {
      resultStack = ['React Native / PWA', 'Tailwind CSS', 'FastAPI / Express'];
      baseAppPrice = 4200000;
      appTypeLabel = 'PWA Mobile / Kasir POS';
      estDuration = '3 – 4 Minggu';
      architectureNote = 'Aplikasi PWA/Kasir POS responsif yang dapat diinstal langsung di Android/iOS dengan dukungan mode offline-first.';
    }

    // 2. Adjust for Scale / Tingkat Usaha Modifier
    let scaleLabel = '';
    let scaleModifier = 0;
    if (scale === 'umkm') {
      scaleLabel = 'UMKM / Rintisan (Discounted)';
      scaleModifier = -0.20; // 20% discount
      architectureNote += ' Dioptimalkan untuk efisiensi biaya awal dan proses pengerjaan kilat.';
    } else if (scale === 'growth') {
      scaleLabel = 'SME / Bisnis Berkembang (Standard)';
      scaleModifier = 0;
    } else if (scale === 'enterprise') {
      scaleLabel = 'Enterprise / Korporasi (High Availability)';
      scaleModifier = 0.50; // 50% premium
      if (appType === 'website') estDuration = '10 – 14 Hari Kerja';
      else if (appType === 'webapp') estDuration = '4 – 6 Minggu';
      else if (appType === 'saas') estDuration = '6 – 8 Minggu';
      else if (appType === 'mobile') estDuration = '5 – 6 Minggu';
      architectureNote += ' Dilengkapi infrastruktur kluster dengan skalabilitas horizontal otomatis.';
    }

    const modifierCost = Math.round(baseAppPrice * scaleModifier);
    const finalBasePrice = baseAppPrice + modifierCost;
    
    costItems.push({
      category: 'Base Development',
      spec: `${appTypeLabel} (${scaleLabel})`,
      setup: finalBasePrice,
      monthly: 'Rp 0'
    });
    totalSetup += finalBasePrice;

    // 3. Infrastructure & Cloud Hosting
    let hostingDetails = '';
    let cloudSetupCost = 0;
    let cloudMonthlyLabel = 'Rp 0';
    if (cloud === 'free') {
      resultStack.push('Cloudflare Pages / Vercel');
      cloudMonthlyLabel = 'Rp 0';
      hostingDetails = 'Serverless Hosting Gratis';
      cloudSetupCost = 0;
    } else if (cloud === 'standard') {
      resultStack.push('Dedicated VPS Server (DigitalOcean / Linode)');
      cloudMonthlyLabel = 'Rp 150rb – 450rb';
      totalMonthlyMin += 150000;
      totalMonthlyMax += 450000;
      hostingDetails = 'VPS Dedicated Kinerja Tinggi';
      cloudSetupCost = 500000;
    } else if (cloud === 'premium') {
      resultStack.push('Enterprise Cloud Cluster (AWS EC2 / GCP Engine)');
      cloudMonthlyLabel = 'Rp 1.5jt – 4.5jt';
      totalMonthlyMin += 1500000;
      totalMonthlyMax += 4500000;
      hostingDetails = 'Premium AWS/GCP Cluster';
      cloudSetupCost = 1200000;
    }

    costItems.push({
      category: 'Infrastruktur Cloud',
      spec: hostingDetails,
      setup: cloudSetupCost,
      monthly: cloudMonthlyLabel
    });
    totalSetup += cloudSetupCost;

    // 4. Database & Storage Scale
    let dbLabel = '';
    let dbSetupCost = 0;
    if (backend === 'insforge') {
      resultStack.push('InsForge BaaS Client SDK', 'PostgreSQL (InsForge Cloud)');
      architectureNote += ' Backend terintegrasi penuh menggunakan InsForge (Auth, DB RLS, Storage).';
      dbLabel = 'InsForge Integrated BaaS';
      dbSetupCost = 0;
    } else if (backend === 'standard') {
      resultStack.push('Dedicated PostgreSQL / MySQL Standard');
      dbLabel = 'Dedicated Managed Database';
      dbSetupCost = 400000;
    } else if (backend === 'cluster') {
      resultStack.push('HA Database Cluster (Multi-Region Replicas)');
      dbLabel = 'Enterprise HA Database Cluster';
      dbSetupCost = 1000000;
    }

    if (dbSetupCost > 0 || backend === 'insforge') {
      costItems.push({
        category: 'Database & Storage',
        spec: dbLabel,
        setup: dbSetupCost,
        monthly: 'Rp 0'
      });
      totalSetup += dbSetupCost;
    }

    // 5. AI Modules
    let aiLabel = 'Tanpa AI';
    let aiSetupCost = 0;
    let aiMonthlyLabel = 'Rp 0';
    if (ai === 'basic') {
      resultStack.push('Gemini AI API (Free Tier)', 'Web Speech API (Speech to Text)', 'Tesseract.js OCR (Client-side)');
      resultAi = ['Gemini AI Chatbot (Free)', 'Web Speech Voice Input', 'Client OCR Scanning'];
      aiLabel = 'Basic AI (Gemini Free + Speech + OCR Client)';
      aiSetupCost = 500000;
      aiMonthlyLabel = 'Rp 0';
    } else if (ai === 'advanced') {
      resultStack.push('Gemini Flash/Pro API Integration', 'Prompt Optimization');
      resultAi = ['Gemini Assistant API', 'Custom Prompt Engineering', 'Content Summarizer'];
      aiLabel = 'Advanced AI API (Gemini Flash/Pro)';
      aiSetupCost = 1200000;
      aiMonthlyLabel = 'Sesuai Pemakaian API';
    } else if (ai === 'enterprise_rag') {
      resultStack.push('OpenAI GPT-4o / Claude 3.5 API', 'pgvector DB Vector Search', 'Knowledge Ingestion Pipeline');
      resultAi = ['Custom RAG Knowledge-base Bot', 'Semantic Search Engine', 'AI Forecasting Dashboard'];
      aiLabel = 'Enterprise LLM & RAG Vector Search';
      aiSetupCost = 2500000;
      aiMonthlyLabel = 'Token LLM + Rp 200rb/bln';
      totalMonthlyMin += 200000;
      totalMonthlyMax += 200000;
    } else {
      resultAi = ['Tanpa Modul AI'];
    }

    if (aiSetupCost > 0) {
      costItems.push({
        category: 'Modul Kecerdasan Buatan',
        spec: aiLabel,
        setup: aiSetupCost,
        monthly: aiMonthlyLabel
      });
      totalSetup += aiSetupCost;
    }

    // 6. Payment & Transaction Gateway
    let paymentLabel = 'Tanpa Integrasi Pembayaran';
    let paymentSetupCost = 0;
    let paymentMonthlyLabel = 'Rp 0';
    if (payment === 'single') {
      resultStack.push('QRIS Manual / WhatsApp Billing Checkout');
      paymentLabel = 'Single-Channel Checkouts (Manual)';
      paymentSetupCost = 200000;
      paymentMonthlyLabel = 'Rp 0';
    } else if (payment === 'full') {
      resultStack.push('Midtrans / Xendit Payment Gateway API');
      paymentLabel = 'Full Payment Gateway (Midtrans/Xendit)';
      paymentSetupCost = 600000;
      paymentMonthlyLabel = '0.7% - 2% / Transaksi';
    } else if (payment === 'international') {
      resultStack.push('Stripe Payments SDK Integration');
      paymentLabel = 'Cross-Border (Stripe Credit Card)';
      paymentSetupCost = 1000000;
      paymentMonthlyLabel = '2.9% + Rp 5rb / Transaksi';
    }

    if (paymentSetupCost > 0) {
      costItems.push({
        category: 'Integrasi Fintech',
        spec: paymentLabel,
        setup: paymentSetupCost,
        monthly: paymentMonthlyLabel
      });
      totalSetup += paymentSetupCost;
    }

    // 7. Security features & Add-ons
    let addonSpecs = [];
    let addonSetupCost = 0;
    if (featureAuth) {
      resultStack.push('Google OAuth', '2FA Authentication');
      addonSpecs.push('Google Auth & 2FA');
      addonSetupCost += 250000;
    }
    if (featureWaf) {
      resultStack.push('Cloudflare WAF / DDoS Protection');
      addonSpecs.push('WAF & Anti-DDoS');
      addonSetupCost += 250000;
    }
    if (featureBackup) {
      resultStack.push('Encrypted Daily Backup Cron');
      addonSpecs.push('Daily Data Backup');
      addonSetupCost += 200000;
    }
    if (featureAnalytics) {
      resultStack.push('Google Analytics & SEO optimization');
      addonSpecs.push('Google Analytics & SEO');
      addonSetupCost += 200000;
    }

    if (addonSetupCost > 0) {
      costItems.push({
        category: 'Fitur Tambahan & Keamanan',
        spec: addonSpecs.join(', '),
        setup: addonSetupCost,
        monthly: 'Rp 0'
      });
      totalSetup += addonSetupCost;
    }

    // Ensure absolute cap of Rp 15.000.000 (Solo Dev package limit)
    if (totalSetup > 15000000) {
      totalSetup = 15000000;
    }

    // Format totals
    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    });

    const formattedSetup = formatter.format(totalSetup);
    
    let formattedMonthly = 'Rp 0';
    if (totalMonthlyMin > 0) {
      formattedMonthly = `${formatter.format(totalMonthlyMin)} – ${formatter.format(totalMonthlyMax)} / Bulan`;
    }
    if (ai === 'advanced' || ai === 'enterprise_rag') {
      formattedMonthly += ' + Token AI';
    }

    // Store complete spec for the CTA button to pass to consultation modal
    window.__lastCalcSpec = {
      type: appType.toUpperCase(),
      appTypeLabel: appTypeLabel,
      scaleLabel: scaleLabel,
      budget: formattedSetup,
      totalSetup: formattedSetup,
      totalMonthly: formattedMonthly,
      duration: estDuration,
      costItems: costItems.map(item => ({
        ...item,
        setupFormatted: formatter.format(item.setup)
      })),
      stack: resultStack,
      ai: resultAi,
      hosting: hostingDetails,
      backupActive: featureBackup,
      wafActive: featureWaf,
      architectureNote: architectureNote
    };

    const outputBox = document.getElementById('specOutputBox');
    outputBox.innerHTML = `
      <div class="spec-result-card border-beam-card" style="margin-top: 24px; padding: 24px; box-sizing: border-box;">
        <div class="spec-header" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px; margin-bottom: 16px;">
          <span class="spec-kicker" style="font-size: 11px; font-weight:700; color:#22D3EE; text-transform:uppercase;">Cetak Biru Rekomendasi Spesifikasi Anda</span>
          <h3 style="font-size: 24px; margin: 8px 0 4px; color: #fff;">Estimasi Investasi: <span class="spec-price" style="color:#34d399; font-weight:700;">${formattedSetup}</span></h3>
          <p class="spec-duration" style="font-size: 13px; color:#8B96B3; display:flex; align-items:center; gap:6px; margin:0;">
            <i class="ph ph-clock"></i> Estimasi Durasi Pengerjaan: <b style="color:#fff;">${estDuration}</b>
          </p>
        </div>

        <div style="overflow-x:auto; margin-bottom:20px; background:rgba(0,0,0,0.18); border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
          <table style="width:100%; border-collapse:collapse; font-size:12.5px; text-align:left; color:#cfd3e5; min-width:480px;">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(34, 211, 238, 0.06); color:#22D3EE;">
                <th style="padding:10px 12px; font-weight:600;">Kategori Modul</th>
                <th style="padding:10px 12px; font-weight:600;">Spesifikasi Terpilih</th>
                <th style="padding:10px 12px; font-weight:600; text-align:right;">Setup (Sekali Bayar)</th>
                <th style="padding:10px 12px; font-weight:600; text-align:right;">Operasional Bulanan</th>
              </tr>
            </thead>
            <tbody>
              ${costItems.map(item => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.2s;">
                  <td style="padding:10px 12px; font-weight:600; color:#fff;">${item.category}</td>
                  <td style="padding:10px 12px; color:#a9b4cf;">${item.spec}</td>
                  <td style="padding:10px 12px; text-align:right; font-family:monospace; color:#34d399;">${formatter.format(item.setup)}</td>
                  <td style="padding:10px 12px; text-align:right; font-family:monospace; color:#fbbf24;">${item.monthly}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:rgba(255,255,255,0.02); font-weight:700; border-top:2px solid rgba(255,255,255,0.1);">
                <td colspan="2" style="padding:12px; color:#fff;">Total Estimasi Proyek:</td>
                <td style="padding:12px; text-align:right; color:#34d399; font-size:14px; font-family:monospace;">${formattedSetup}</td>
                <td style="padding:12px; text-align:right; color:#fbbf24; font-size:14px; font-family:monospace;">${formattedMonthly}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="spec-details-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 20px;">
          <div>
            <h5 style="color:#22D3EE; font-size:13px; margin:0 0 8px; display:flex; align-items:center; gap:6px;"><i class="ph ph-cpu"></i> Rekomendasi Stack &amp; Tools</h5>
            <ul class="chips" style="display:flex; flex-wrap:wrap; gap:6px; padding:0; list-style:none; margin:0;">
              ${resultStack.map(s => `<li style="font-size: 11px; background:#0B0E1C; border:1px solid rgba(255,255,255,0.08); padding:4px 8px; border-radius:6px; color:#cfd3e5;">${s}</li>`).join('')}
            </ul>
          </div>
          <div>
            <h5 style="color:#22D3EE; font-size:13px; margin:0 0 8px; display:flex; align-items:center; gap:6px;"><i class="ph ph-shield-check"></i> Kebijakan Infrastruktur &amp; Backup</h5>
            <div style="font-size:13px; color:#e9e9ed;">
              <div style="font-weight:600; color:#fff; margin-bottom:2px;">${hostingDetails}</div>
              <div style="color:#8B96B3; font-size:12px; line-height:1.3;">Backup Harian Otomatis ${featureBackup ? 'Aktif' : 'Non-aktif'}, WAF SSL Cloudflare ${featureWaf ? 'Aktif' : 'Non-aktif'}.</div>
            </div>
          </div>
        </div>

        <div class="spec-arch-note" style="background: rgba(10, 15, 30, 0.5); padding: 12px; border-radius: 8px; border-left: 3px solid #22D3EE; margin-bottom: 20px;">
          <h5 style="font-size: 11px; color: #8B96B3; margin: 0 0 4px; text-transform:uppercase;">Catatan Arsitektur Sistem &amp; Keamanan</h5>
          <p style="font-size: 12.5px; color: #cfd3e5; margin: 0; line-height:1.4;">${architectureNote}</p>
        </div>

        <div class="spec-cta-row">
          <button type="button" class="btn-spec-action" onclick="openNewConsultationModal(window.__lastCalcSpec)" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
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

  function ensureModalsExist() {
    if (document.getElementById('authModal')) return; // Already present (e.g. index.html)

    const container = document.createElement('div');
    container.id = 'dynamicModalsContainer';
    container.innerHTML = `
      <!-- MODAL: AUTHENTICATION -->
      <div class="platform-modal" id="authModal">
        <div class="platform-modal-content">
          <div class="platform-modal-header">
            <h3><i class="ph ph-user-lock"></i> Platform Akun Klien</h3>
            <button class="platform-modal-close" onclick="closeAuthModal()">&times;</button>
          </div>
          <div class="platform-modal-body">
            <div class="auth-tabs">
              <button type="button" class="auth-tab active" id="authTabLogin" onclick="openAuthModal('login')">Masuk</button>
              <button type="button" class="auth-tab" id="authTabRegister" onclick="openAuthModal('register')">Daftar Akun Baru</button>
              <button type="button" class="auth-tab" id="authTabVerify" onclick="openAuthModal('verify')">Verifikasi OTP</button>
            </div>
            <div id="authAlert" style="display:none"></div>

            <!-- LOGIN FORM -->
            <form id="authFormLogin" onsubmit="handleAuthLogin(event)">
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="loginEmail" class="form-control" placeholder="nama@perusahaan.com" required>
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" id="loginPassword" class="form-control" placeholder="••••••••" required>
              </div>
              <button type="submit" class="btn-platform-primary"><i class="ph ph-sign-in"></i> Masuk Sekarang</button>
            </form>

            <!-- REGISTER FORM -->
            <form id="authFormRegister" onsubmit="handleAuthRegister(event)" style="display:none">
              <div class="form-group">
                <label>Nama Lengkap</label>
                <input type="text" id="regName" class="form-control" placeholder="Nama Anda" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="regEmail" class="form-control" placeholder="nama@email.com" required>
                </div>
                <div class="form-group">
                  <label>No. WhatsApp</label>
                  <input type="tel" id="regPhone" class="form-control" placeholder="08123456789">
                </div>
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" id="regPassword" class="form-control" placeholder="Minimal 6 karakter" minlength="6" required>
              </div>
              <button type="submit" class="btn-platform-primary"><i class="ph ph-user-plus"></i> Daftar Akun Klien</button>
            </form>

            <!-- VERIFY OTP FORM -->
            <form id="authFormVerify" onsubmit="handleAuthVerifyOtp(event)" style="display:none">
              <div style="font-size:13px; color:#9397ab; margin-bottom:14px;">
                Masukkan 6 digit kode OTP yang dikirimkan ke <b id="verifyEmailLabel" style="color:#22D3EE;">email Anda</b>:
              </div>
              <div class="form-group">
                <label>Kode OTP 6 Digit</label>
                <input type="text" id="verifyOtpCode" class="form-control" placeholder="685913" maxlength="6" style="letter-spacing: 0.3em; font-size: 18px; font-weight: 700; text-align: center;" required>
              </div>
              <button type="submit" class="btn-platform-primary"><i class="ph ph-check-circle"></i> Verifikasi Kode OTP</button>
              <div style="text-align:center; margin-top:14px;">
                <button type="button" class="btn-hub-sm" style="background:transparent; border:0; color:#8B96B3; text-decoration:underline; cursor:pointer;" onclick="handleResendOtp()">
                  <i class="ph ph-arrows-counter-clockwise"></i> Kirim Ulang Kode OTP
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- MODAL: USER PROFILE & HISTORY -->
      <div class="platform-modal" id="profileModal">
        <div class="platform-modal-content" style="width: min(680px, 94vw);">
          <div class="platform-modal-header">
            <h3><i class="ph ph-user-circle"></i> Dashboard Klien &amp; Profil</h3>
            <button class="platform-modal-close" onclick="closeProfileModal()">&times;</button>
          </div>
          <div class="platform-modal-body">
            <form onsubmit="handleUpdateProfile(event)">
              <div class="form-row">
                <div class="form-group">
                  <label>Nama Lengkap</label>
                  <input type="text" id="profName" class="form-control">
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="profEmail" class="form-control" disabled readonly>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>No. WhatsApp</label>
                  <input type="tel" id="profPhone" class="form-control">
                </div>
                <div class="form-group">
                  <label>Perusahaan / Usaha</label>
                  <input type="text" id="profCompany" class="form-control">
                </div>
              </div>
              <div style="display:flex; gap:10px; justify-content:space-between; margin-bottom:20px;">
                <button type="submit" class="btn-hub-sm" style="background:#22D3EE; color:#06121F; padding:8px 16px;"><i class="ph ph-floppy-disk"></i> Simpan Profil</button>
                <button type="button" class="btn-hub-sm" style="background:rgba(239,68,68,0.2); color:#f87171;" onclick="handleAuthLogout()"><i class="ph ph-sign-out"></i> Keluar</button>
              </div>
            </form>

            <div class="profile-section-title"><i class="ph ph-chat-circle-dots"></i> Riwayat Diskusi Proyek</div>
            <div id="userConsultationsList"></div>

            <div class="profile-section-title"><i class="ph ph-calendar"></i> Jadwal Pertemuan Dipesan</div>
            <div id="userAppointmentsList"></div>
          </div>
        </div>
      </div>

      <!-- MODAL: FITUR DISKUSI KEBUTUHAN -->
      <div class="platform-modal" id="consultationModal">
        <div class="platform-modal-content">
          <div class="platform-modal-header">
            <h3><i class="ph ph-paper-plane-tilt"></i> Ajukan Diskusi Kebutuhan Proyek</h3>
            <button class="platform-modal-close" onclick="closeConsultationModal()">&times;</button>
          </div>
          <div class="platform-modal-body">
            <form onsubmit="handleConsultationSubmit(event)">
              <div class="form-row">
                <div class="form-group">
                  <label>Nama Lengkap</label>
                  <input type="text" id="consultName" class="form-control" required>
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="consultEmail" class="form-control" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>No. WhatsApp</label>
                  <input type="tel" id="consultPhone" class="form-control" required>
                </div>
                <div class="form-group">
                  <label>Jenis Proyek</label>
                  <select id="consultProjectType" class="form-control">
                    <option value="Website & Landing Page">Website &amp; Landing Page</option>
                    <option value="WebApp & SaaS" selected>WebApp &amp; SaaS Custom</option>
                    <option value="Fitur AI Chatbot / RAG">Fitur AI Chatbot / RAG</option>
                    <option value="PWA Mobile & POS">PWA Mobile &amp; POS</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Estimasi Anggaran</label>
                  <select id="consultBudget" class="form-control">
                    <option value="3.5 - 7 Juta">3.5 – 7 Juta</option>
                    <option value="10 - 25 Juta" selected>10 – 25 Juta</option>
                    <option value="25 - 50 Juta">25 – 50 Juta</option>
                    <option value="> 50 Juta">> 50 Juta</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Target Peluncuran</label>
                  <input type="text" id="consultTimeline" class="form-control" placeholder="misal: 1 Bulan">
                </div>
              </div>
              <div class="form-group">
                <label>Deskripsi Kebutuhan &amp; Spesifikasi</label>
                <textarea id="consultDesc" class="form-control" placeholder="Jelaskan gambaran aplikasi yang ingin Anda bangun..." required></textarea>
              </div>
              <button type="submit" class="btn-platform-primary"><i class="ph ph-paper-plane-tilt"></i> Kirimkan Pengajuan Diskusi</button>
            </form>
          </div>
        </div>
      </div>

      <!-- MODAL: DISCUSSION THREAD CHAT -->
      <div class="platform-modal" id="discussionThreadModal">
        <div class="platform-modal-content" style="width: min(640px, 94vw);">
          <div class="platform-modal-header">
            <h3 id="threadTitle"><i class="ph ph-chat-circle-dots"></i> Diskusi Chat Proyek</h3>
            <button class="platform-modal-close" onclick="closeDiscussionThreadModal()">&times;</button>
          </div>
          <div class="platform-modal-body" style="padding: 16px;">
            <div class="chat-container">
              <div class="chat-body" id="threadChatBody"></div>
              <form class="chat-form" onsubmit="handleSendChatMessage(event)">
                <input type="text" id="threadInputMessage" class="form-control" placeholder="Tuliskan pesan atau pertanyaan..." required autocomplete="off">
                <button type="submit" class="btn-platform-primary" style="width: auto; padding: 0 18px;"><i class="ph ph-paper-plane-right"></i> Kirim</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: FITUR BOOK JADWAL PERTEMUAN -->
      <div class="platform-modal" id="bookingModal">
        <div class="platform-modal-content">
          <div class="platform-modal-header">
            <h3><i class="ph ph-calendar-plus"></i> Book Jadwal Pertemuan / Konsultasi</h3>
            <button class="platform-modal-close" onclick="closeBookingModal()">&times;</button>
          </div>
          <div class="platform-modal-body">
            <form onsubmit="handleBookingSubmit(event)">
              <div class="form-row">
                <div class="form-group">
                  <label>Nama Anda</label>
                  <input type="text" id="bookName" class="form-control" required>
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="bookEmail" class="form-control" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>No. WhatsApp</label>
                  <input type="tel" id="bookPhone" class="form-control" required>
                </div>
                <div class="form-group">
                  <label>Media Pertemuan</label>
                  <select id="bookType" class="form-control">
                    <option value="google_meet">Google Meet (Online)</option>
                    <option value="whatsapp_call">WhatsApp Call / Video</option>
                    <option value="offline">Tatap Muka (Offline)</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Pilih Tanggal</label>
                  <input type="date" id="bookDate" class="form-control" required>
                </div>
                <div class="form-group">
                  <label>Pilih Jam (WIB)</label>
                  <select id="bookTime" class="form-control">
                    <option value="10:00">10:00 WIB</option>
                    <option value="13:00">13:00 WIB</option>
                    <option value="15:30">15:30 WIB</option>
                    <option value="19:30">19:30 WIB</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Topik Diskusi / Judul Pertemuan</label>
                <input type="text" id="bookTopic" class="form-control" placeholder="misal: Konsultasi Arsitektur WebApp Toko Online" required>
              </div>
              <div class="form-group">
                <label>Catatan Tambahan (Opsional)</label>
                <textarea id="bookNotes" class="form-control" placeholder="Ada hal khusus yang ingin disiapkan sebelum meeting?"></textarea>
              </div>
              <button type="submit" class="btn-platform-primary"><i class="ph ph-calendar-check"></i> Konfirmasi Booking Pertemuan</button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  }

  // DOM Loaded listener
  document.addEventListener('DOMContentLoaded', initSDK);
})();
