(function () {
  const API = '/api/v1';
  const TOKEN_KEY = 'dvc_token';
  const USER_KEY = 'dvc_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token || '');
  }
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }
  function setUser(user) {
    localStorage.setItem(USER_KEY, user ? JSON.stringify(user) : '');
  }
  function clearAuth() {
    setToken('');
    setUser(null);
  }

  function api(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(API + url, { ...options, headers }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw { status: res.status, ...data };
      return data;
    });
  }

  const $ = (id) => document.getElementById(id);
  const show = (el, visible) => { if (el) el.style.display = visible ? '' : 'none'; };
  const showError = (elId, msg) => {
    const el = $(elId);
    if (!el) return;
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
  };

  // --- Auth flow ---
  async function checkSetup() {
    const data = await api('/setup/check');
    const createAdmin = $('auth-create-admin');
    const loginBlock = $('auth-login');
    if (data.hasAdmin) {
      show(createAdmin, false);
      show(loginBlock, true);
    } else {
      show(createAdmin, true);
      show(loginBlock, false);
    }
    show($('auth-page'), true);
    show($('main-app'), false);
  }

  async function init() {
    const hash = (location.hash || '#login').replace('#', '') || 'login';
    if (hash === 'register') {
      show($('auth-page'), false);
      show($('register-page'), true);
      show($('main-app'), false);
      return;
    }
    const token = getToken();
    if (token) {
      try {
        const data = await api('/auth/me');
        setUser(data.user);
        showMainApp(data.user);
        route(hash);
        return;
      } catch (e) {
        clearAuth();
      }
    }
    await checkSetup();
  }

  $('form-create-admin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;
    const full_name = form.full_name.value.trim();
    showError('auth-admin-error', '');
    try {
      await api('/setup/create-admin', {
        method: 'POST',
        body: JSON.stringify({ username, password, full_name })
      });
      showError('auth-admin-error', '');
      alert('Tạo tài khoản quản trị thành công. Vui lòng đăng nhập.');
      await checkSetup();
    } catch (err) {
      showError('auth-admin-error', err.error?.message || err.message || 'Lỗi');
    }
  });

  $('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;
    showError('auth-login-error', '');
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      setToken(data.access_token);
      setUser(data.user);
      show($('auth-page'), false);
      showMainApp(data.user);
      routeByRole(data.user.role);
    } catch (err) {
      showError('auth-login-error', err.error?.message || err.message || 'Đăng nhập thất bại');
    }
  });

  $('form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      username: form.username.value.trim(),
      password: form.password.value,
      full_name: form.full_name.value.trim(),
      national_id: form.national_id.value.trim(),
      email: form.email?.value?.trim() || '',
      phone: form.phone?.value?.trim() || ''
    };
    showError('register-error', '');
    try {
      await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
      alert('Đăng ký thành công. Tài khoản của bạn đang chờ quản trị viên duyệt.');
      location.hash = 'login';
      location.reload();
    } catch (err) {
      showError('register-error', err.error?.message || err.message || 'Lỗi');
    }
  });

  $('btn-logout')?.addEventListener('click', () => {
    clearAuth();
    location.hash = 'login';
    location.reload();
  });

  function showMainApp(user) {
    show($('main-app'), true);
    show($('auth-page'), false);
    show($('register-page'), false);
    const roleText = { ADMIN: 'Quản trị', CITIZEN: 'Công dân', OFFICIAL: 'Cán bộ', REPORT_ADMIN: 'Báo cáo' };
    const roleEl = $('header-role');
    if (roleEl) roleEl.textContent = (roleText[user?.role] || user?.role) + ' • ' + (user?.username || '');
  }

  function routeByRole(role) {
    if (role === 'ADMIN') location.hash = 'admin';
    else if (role === 'CITIZEN') location.hash = 'citizen';
    else if (role === 'OFFICIAL') location.hash = 'official';
    else if (role === 'REPORT_ADMIN') location.hash = 'reports';
    else location.hash = 'admin';
  }

  function route(hash) {
    const user = getUser();
    const content = $('main-content');
    if (!content) return;
    const role = user?.role;
    if ((hash === 'admin' || hash.startsWith('admin-')) && role === 'ADMIN') return renderAdmin(content);
    if ((hash === 'citizen' || hash.startsWith('citizen')) && role === 'CITIZEN') return renderCitizen(content);
    if (hash === 'official' && role === 'OFFICIAL') return renderOfficial(content);
    if (hash === 'reports' && (role === 'REPORT_ADMIN' || role === 'ADMIN')) return renderReports(content);
    routeByRole(role);
  }

  // --- Admin ---
  async function renderAdmin(container) {
    container.innerHTML = '<p>Đang tải...</p>';
    let pending = [];
    let agencies = [];
    try {
      [pending, agencies] = await Promise.all([
        api('/admin/pending-accounts').then(d => d.items),
        api('/admin/agencies').then(d => d.items)
      ]);
    } catch (e) {
      container.innerHTML = '<div class="alert alert-error">' + (e.error?.message || 'Lỗi tải dữ liệu') + '</div>';
      return;
    }
    const fullHash = (location.hash || '#admin').replace('#', '');
    const subHash = fullHash === 'admin' ? '' : (fullHash.startsWith('admin') ? fullHash.replace(/^admin-?/, '') : '');
    const nav = `
      <nav class="nav-tabs">
        <a href="#admin" class="${subHash === '' ? 'active' : ''}">Tài khoản chờ duyệt</a>
        <a href="#admin-create" class="${subHash === 'create' ? 'active' : ''}">Tạo tài khoản cán bộ / báo cáo</a>
      </nav>`;
    if (subHash === 'create') {
      container.innerHTML = nav + `
        <div class="card">
          <h2>Tạo tài khoản (Cán bộ / Quản lý báo cáo)</h2>
          <form id="admin-create-form">
            <div class="form-group">
              <label>Tên đăng nhập *</label>
              <input type="text" name="username" required>
            </div>
            <div class="form-group">
              <label>Mật khẩu *</label>
              <input type="password" name="password" required minlength="6">
            </div>
            <div class="form-group">
              <label>Vai trò *</label>
              <select name="role" id="admin-role-select">
                <option value="OFFICIAL">Cán bộ xử lý</option>
                <option value="REPORT_ADMIN">Quản lý báo cáo</option>
              </select>
            </div>
            <div class="form-group">
              <label>Họ tên *</label>
              <input type="text" name="full_name" required>
            </div>
            <div id="admin-official-fields">
              <div class="form-group">
                <label>Cơ quan *</label>
                <select name="agency_id" id="admin-agency-id">
                  <option value="">-- Chọn cơ quan --</option>
                  ${(agencies || []).map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Phòng/ban</label>
                <select name="department_id" id="admin-department-id">
                  <option value="">-- Chọn phòng/ban --</option>
                </select>
              </div>
              <div class="form-group">
                <label>Mã cán bộ</label>
                <input type="text" name="employee_code">
              </div>
              <div class="form-group">
                <label>Chức danh</label>
                <input type="text" name="position_title">
              </div>
            </div>
            <div id="admin-create-msg" class="alert" style="display:none;"></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Tạo tài khoản</button>
            </div>
          </form>
        </div>`;
      const roleSelect = document.getElementById('admin-role-select');
      const officialFields = document.getElementById('admin-official-fields');
      roleSelect?.addEventListener('change', () => {
        officialFields.style.display = roleSelect.value === 'OFFICIAL' ? '' : 'none';
      });
      officialFields.style.display = roleSelect?.value === 'OFFICIAL' ? '' : 'none';
      document.getElementById('admin-agency-id')?.addEventListener('change', async (e) => {
        const aid = e.target.value;
        const sel = document.getElementById('admin-department-id');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Chọn phòng/ban --</option>';
        if (!aid) return;
        const d = await api('/admin/departments?agency_id=' + aid);
        d.items?.forEach(dept => {
          sel.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
        });
      });
      document.getElementById('admin-create-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const role = form.role.value;
        const body = {
          username: form.username.value.trim(),
          password: form.password.value,
          role,
          full_name: form.full_name.value.trim()
        };
        if (role === 'OFFICIAL') {
          body.agency_id = parseInt(form.agency_id.value, 10);
          body.department_id = form.department_id.value ? parseInt(form.department_id.value, 10) : null;
          body.employee_code = form.employee_code?.value?.trim() || null;
          body.position_title = form.position_title?.value?.trim() || null;
        }
        const msgEl = document.getElementById('admin-create-msg');
        try {
          await api('/admin/users', { method: 'POST', body: JSON.stringify(body) });
          msgEl.className = 'alert alert-success';
          msgEl.textContent = 'Tạo tài khoản thành công.';
          msgEl.style.display = 'block';
          form.reset();
        } catch (err) {
          msgEl.className = 'alert alert-error';
          msgEl.textContent = err.error?.message || 'Lỗi';
          msgEl.style.display = 'block';
        }
      });
      return;
    }
    container.innerHTML = nav + `
      <div class="card">
        <h2>Tài khoản công dân chờ duyệt</h2>
        ${pending.length === 0 ? '<p class="empty-state">Không có tài khoản nào chờ duyệt.</p>' : `
        <table>
          <thead>
            <tr>
              <th>Tên đăng nhập</th>
              <th>Họ tên</th>
              <th>CCCD/CMND</th>
              <th>Email</th>
              <th>Điện thoại</th>
              <th>Ngày đăng ký</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${pending.map(p => `
              <tr data-id="${p.id}">
                <td>${escapeHtml(p.username)}</td>
                <td>${escapeHtml(p.full_name)}</td>
                <td>${escapeHtml(p.national_id)}</td>
                <td>${escapeHtml(p.email || '-')}</td>
                <td>${escapeHtml(p.phone || '-')}</td>
                <td>${formatDate(p.created_at)}</td>
                <td class="actions">
                  <button type="button" class="btn btn-success btn-sm btn-approve">Duyệt</button>
                  <button type="button" class="btn btn-danger btn-sm btn-reject">Từ chối</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        `}
      </div>`;
    container.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').dataset.id;
        try {
          await api('/admin/pending-accounts/' + id + '/approve', { method: 'POST' });
          btn.closest('tr').remove();
        } catch (e) {
          alert(e.error?.message || 'Lỗi');
        }
      });
    });
    container.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Từ chối tài khoản này?')) return;
        const id = btn.closest('tr').dataset.id;
        try {
          await api('/admin/pending-accounts/' + id + '/reject', { method: 'POST' });
          btn.closest('tr').remove();
        } catch (e) {
          alert(e.error?.message || 'Lỗi');
        }
      });
    });
  }

  // --- Citizen ---
  async function renderCitizen(container) {
    let subHash = (location.hash || '#citizen').replace('#citizen', '').replace('#', '').replace(/^-/, '') || 'home';
    const nav = `
      <nav class="nav-tabs">
        <a href="#citizen" class="${subHash === '' || subHash === 'home' ? 'active' : ''}">Trang chủ</a>
        <a href="#citizen-profile">Hồ sơ cá nhân</a>
        <a href="#citizen-services">Dịch vụ</a>
        <a href="#citizen-submit">Nộp hồ sơ</a>
        <a href="#citizen-dossiers">Hồ sơ của tôi</a>
      </nav>`;
    if (subHash === 'profile') {
      let me = {};
      try {
        me = await api('/citizens/me');
      } catch (e) {
        container.innerHTML = nav + '<div class="alert alert-error">' + (e.error?.message || 'Lỗi') + '</div>';
        return;
      }
      container.innerHTML = nav + `
        <div class="card">
          <h2>Hồ sơ cá nhân</h2>
          <form id="citizen-profile-form">
            <div class="form-group">
              <label>Họ tên</label>
              <input type="text" value="${escapeHtml(me.full_name)}" disabled>
            </div>
            <div class="form-group">
              <label>Số CCCD/CMND</label>
              <input type="text" value="${escapeHtml(me.national_id)}" disabled>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" value="${escapeHtml(me.email || '')}">
            </div>
            <div class="form-group">
              <label>Số điện thoại</label>
              <input type="text" name="phone" value="${escapeHtml(me.phone || '')}">
            </div>
            <div class="form-group">
              <label>Địa chỉ thường trú</label>
              <input type="text" name="permanent_address" value="${escapeHtml(me.permanent_address || '')}">
            </div>
            <div class="form-group">
              <label>Địa chỉ hiện tại</label>
              <input type="text" name="current_address" value="${escapeHtml(me.current_address || '')}">
            </div>
            <div id="profile-msg" class="alert" style="display:none;"></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Cập nhật</button>
            </div>
          </form>
        </div>`;
      document.getElementById('citizen-profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const msgEl = document.getElementById('profile-msg');
        try {
          await api('/citizens/me', {
            method: 'PUT',
            body: JSON.stringify({
              email: form.email?.value?.trim(),
              phone: form.phone?.value?.trim(),
              permanent_address: form.permanent_address?.value?.trim(),
              current_address: form.current_address?.value?.trim()
            })
          });
          msgEl.className = 'alert alert-success';
          msgEl.textContent = 'Đã cập nhật.';
          msgEl.style.display = 'block';
        } catch (err) {
          msgEl.className = 'alert alert-error';
          msgEl.textContent = err.error?.message || 'Lỗi';
          msgEl.style.display = 'block';
        }
      });
      return;
    }
    if (subHash === 'services') {
      let data = { items: [] };
      try {
        data = await api('/services?page_size=50');
      } catch (e) {
        container.innerHTML = nav + '<div class="alert alert-error">Lỗi tải dịch vụ</div>';
        return;
      }
      container.innerHTML = nav + `
        <div class="card">
          <h2>Danh mục dịch vụ hành chính công</h2>
          ${data.items.length === 0 ? '<p class="empty-state">Chưa có dịch vụ.</p>' : `
          <table>
            <thead><tr><th>Mã</th><th>Tên dịch vụ</th><th>Thời hạn (ngày)</th><th>Phí</th><th>Cơ quan</th></tr></thead>
            <tbody>
              ${data.items.map(s => `
                <tr>
                  <td>${escapeHtml(s.service_code)}</td>
                  <td>${escapeHtml(s.name)}</td>
                  <td>${s.processing_days}</td>
                  <td>${s.fee_amount != null ? Number(s.fee_amount).toLocaleString('vi-VN') + ' đ' : '-'}</td>
                  <td>${escapeHtml(s.agency_name || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          `}
        </div>`;
      return;
    }
    if (subHash === 'submit') {
      let services = [];
      try {
        services = (await api('/services?page_size=100')).items;
      } catch (e) {}
      container.innerHTML = nav + `
        <div class="card">
          <h2>Nộp hồ sơ</h2>
          <form id="citizen-submit-form">
            <div class="form-group">
              <label>Dịch vụ *</label>
              <select name="service_id" required>
                <option value="">-- Chọn dịch vụ --</option>
                ${(services || []).map(s => `<option value="${s.id}">${s.name} (${s.service_code})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Tiêu đề / Nội dung ngắn gọn</label>
              <input type="text" name="subject" placeholder="VD: Đăng ký khai sinh cho trẻ">
            </div>
            <div class="form-group">
              <label>Dữ liệu biểu mẫu (JSON, tùy chọn)</label>
              <textarea name="form_data" rows="4" placeholder='{"child_full_name":"Nguyễn Văn A","child_date_of_birth":"2025-01-01"}'></textarea>
            </div>
            <div id="submit-msg" class="alert" style="display:none;"></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Nộp hồ sơ</button>
            </div>
          </form>
        </div>`;
      document.getElementById('citizen-submit-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        let form_data = null;
        try {
          const raw = form.form_data?.value?.trim();
          if (raw) form_data = JSON.parse(raw);
        } catch (err) {
          document.getElementById('submit-msg').className = 'alert alert-error';
          document.getElementById('submit-msg').textContent = 'Dữ liệu biểu mẫu không đúng định dạng JSON.';
          document.getElementById('submit-msg').style.display = 'block';
          return;
        }
        const msgEl = document.getElementById('submit-msg');
        try {
          const res = await api('/dossiers', {
            method: 'POST',
            body: JSON.stringify({
              service_id: parseInt(form.service_id.value, 10),
              subject: form.subject?.value?.trim() || null,
              form_data
            })
          });
          msgEl.className = 'alert alert-success';
          msgEl.textContent = 'Nộp hồ sơ thành công. Mã hồ sơ: ' + (res.dossier?.dossier_code || '');
          msgEl.style.display = 'block';
          form.reset();
        } catch (err) {
          msgEl.className = 'alert alert-error';
          msgEl.textContent = err.error?.message || 'Lỗi';
          msgEl.style.display = 'block';
        }
      });
      return;
    }
    if (subHash === 'dossiers') {
      let data = { items: [] };
      try {
        data = await api('/dossiers?page_size=50');
      } catch (e) {
        container.innerHTML = nav + '<div class="alert alert-error">Lỗi tải danh sách hồ sơ</div>';
        return;
      }
      container.innerHTML = nav + `
        <div class="card">
          <h2>Hồ sơ của tôi</h2>
          ${data.items.length === 0 ? '<p class="empty-state">Bạn chưa có hồ sơ nào.</p>' : `
          <table>
            <thead>
              <tr><th>Mã hồ sơ</th><th>Dịch vụ</th><th>Trạng thái</th><th>Ngày nộp</th><th></th></tr>
            </thead>
            <tbody>
              ${data.items.map(d => `
                <tr>
                  <td>${escapeHtml(d.dossier_code)}</td>
                  <td>${escapeHtml(d.service_name)}</td>
                  <td><span class="badge badge-${(d.current_status || '').toLowerCase()}">${escapeHtml(d.status_name || d.current_status)}</span></td>
                  <td>${formatDate(d.submitted_at)}</td>
                  <td><a href="#citizen-dossier-${d.dossier_code}">Chi tiết</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          `}
        </div>`;
      return;
    }
    if (subHash.startsWith('dossier-')) {
      const code = subHash.replace(/^dossier-/, '');
      let detail = null;
      try {
        detail = await api('/dossiers/' + encodeURIComponent(code));
      } catch (e) {
        container.innerHTML = nav + '<div class="alert alert-error">Không tìm thấy hồ sơ</div>';
        return;
      }
      let histories = [];
      try {
        const h = await api('/dossiers/' + encodeURIComponent(code) + '/histories');
        histories = h.histories || [];
      } catch (e) {}
      container.innerHTML = nav + `
        <div class="card">
          <h2>Chi tiết hồ sơ: ${escapeHtml(detail.dossier_code)}</h2>
          <p><strong>Dịch vụ:</strong> ${escapeHtml(detail.service?.name)}</p>
          <p><strong>Cơ quan:</strong> ${escapeHtml(detail.agency?.name)}</p>
          <p><strong>Trạng thái:</strong> <span class="badge badge-${(detail.current_status || '').toLowerCase()}">${escapeHtml(detail.status_name || detail.current_status)}</span></p>
          <p><strong>Ngày nộp:</strong> ${formatDate(detail.submitted_at)}</p>
          ${detail.due_at ? '<p><strong>Hạn xử lý:</strong> ' + formatDate(detail.due_at) + '</p>' : ''}
          ${detail.form_data && Object.keys(detail.form_data).length ? '<p><strong>Dữ liệu biểu mẫu:</strong></p><pre>' + escapeHtml(JSON.stringify(detail.form_data, null, 2)) + '</pre>' : ''}
        </div>
        <div class="card">
          <h2>Lịch sử xử lý</h2>
          ${histories.length === 0 ? '<p class="empty-state">Chưa có lịch sử.</p>' : `
          <table>
            <thead><tr><th>Thời gian</th><th>Hành động</th><th>Trạng thái sau</th><th>Ghi chú</th></tr></thead>
            <tbody>
              ${histories.map(h => `
                <tr>
                  <td>${formatDate(h.created_at)}</td>
                  <td>${escapeHtml(h.action)}</td>
                  <td>${escapeHtml(h.to_status || '-')}</td>
                  <td>${escapeHtml(h.note || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          `}
        </div>
        <p><a href="#citizen-dossiers" class="btn btn-secondary">← Danh sách hồ sơ</a></p>`;
      return;
    }
    container.innerHTML = nav + `
      <div class="card">
        <h2>Xin chào, Công dân</h2>
        <p>Chọn mục trên menu: Hồ sơ cá nhân, Dịch vụ, Nộp hồ sơ, hoặc xem Hồ sơ của tôi.</p>
      </div>`;
  }

  // --- Official ---
  async function renderOfficial(container) {
    let data = { items: [] };
    try {
      data = await api('/official/dossiers?page_size=50');
    } catch (e) {
      container.innerHTML = '<div class="alert alert-error">' + (e.error?.message || 'Lỗi') + '</div>';
      return;
    }
    const statusBadge = (s) => (s || '').toLowerCase().replace(' ', '_');
    container.innerHTML = `
      <div class="card">
        <h2>Hồ sơ cần xử lý (cơ quan của tôi)</h2>
        ${data.items.length === 0 ? '<p class="empty-state">Không có hồ sơ nào.</p>' : `
        <table>
          <thead>
            <tr><th>Mã hồ sơ</th><th>Dịch vụ</th><th>Công dân</th><th>Trạng thái</th><th>Ngày nộp</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            ${data.items.map(d => `
              <tr>
                <td>${escapeHtml(d.dossier_code)}</td>
                <td>${escapeHtml(d.service_name)}</td>
                <td>${escapeHtml(d.citizen_name)} (${escapeHtml(d.citizen_national_id)})</td>
                <td><span class="badge badge-${statusBadge(d.current_status)}">${escapeHtml(d.status_name || d.current_status)}</span></td>
                <td>${formatDate(d.submitted_at)}</td>
                <td class="actions">
                  ${d.current_status === 'SUBMITTED' ? `<button type="button" class="btn btn-success btn-sm btn-receive" data-code="${escapeHtml(d.dossier_code)}">Tiếp nhận</button>` : ''}
                  ${(d.current_status === 'RECEIVED' || d.current_status === 'PROCESSING') ? `
                    <button type="button" class="btn btn-secondary btn-sm btn-supplement" data-code="${escapeHtml(d.dossier_code)}">Yêu cầu bổ sung</button>
                    <button type="button" class="btn btn-primary btn-sm btn-complete" data-code="${escapeHtml(d.dossier_code)}">Hoàn tất</button>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        `}
      </div>`;
    container.querySelectorAll('.btn-receive').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.code;
        const note = prompt('Ghi chú tiếp nhận (tùy chọn):');
        try {
          await api('/official/dossiers/' + encodeURIComponent(code) + '/receive', {
            method: 'PATCH',
            body: JSON.stringify({ note: note || undefined })
          });
          location.reload();
        } catch (e) {
          alert(e.error?.message || 'Lỗi');
        }
      });
    });
    container.querySelectorAll('.btn-supplement').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.code;
        const note = prompt('Nội dung yêu cầu bổ sung:');
        if (note === null) return;
        try {
          await api('/official/dossiers/' + encodeURIComponent(code) + '/request-supplement', {
            method: 'PATCH',
            body: JSON.stringify({ note })
          });
          location.reload();
        } catch (e) {
          alert(e.error?.message || 'Lỗi');
        }
      });
    });
    container.querySelectorAll('.btn-complete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.code;
        const note = prompt('Ghi chú hoàn tất (tùy chọn):');
        try {
          await api('/official/dossiers/' + encodeURIComponent(code) + '/complete', {
            method: 'PATCH',
            body: JSON.stringify({ note: note || undefined })
          });
          location.reload();
        } catch (e) {
          alert(e.error?.message || 'Lỗi');
        }
      });
    });
  }

  // --- Reports ---
  async function renderReports(container) {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const defaultFrom = from.toISOString().slice(0, 10);
    const defaultTo = new Date().toISOString().slice(0, 10);
    let agencies = [];
    let services = [];
    try {
      const user = getUser();
      if (user?.role === 'ADMIN') {
        const [a, s] = await Promise.all([
          api('/admin/agencies').then(d => d.items),
          api('/services?page_size=200').then(d => d.items)
        ]);
        agencies = a || [];
        services = s || [];
      }
    } catch (e) {}
    container.innerHTML = `
      <div class="card">
        <h2>Báo cáo tổng hợp</h2>
        <form id="report-form" style="display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end;margin-bottom:1rem;">
          <div class="form-group" style="margin-bottom:0;">
            <label>Từ ngày</label>
            <input type="date" name="from" value="${defaultFrom}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Đến ngày</label>
            <input type="date" name="to" value="${defaultTo}">
          </div>
          ${agencies.length ? `
          <div class="form-group" style="margin-bottom:0;">
            <label>Cơ quan</label>
            <select name="agency_id">
              <option value="">Tất cả</option>
              ${agencies.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
            </select>
          </div>
          ` : ''}
          ${services.length ? `
          <div class="form-group" style="margin-bottom:0;">
            <label>Dịch vụ</label>
            <select name="service_id">
              <option value="">Tất cả</option>
              ${services.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          ` : ''}
          <div class="form-group" style="margin-bottom:0;">
            <button type="submit" class="btn btn-primary">Xem báo cáo</button>
          </div>
        </form>
        <div id="report-result"></div>
      </div>`;
    const resultEl = document.getElementById('report-result');
    async function loadReport() {
      const form = document.getElementById('report-form');
      const params = new URLSearchParams({
        from: form.from.value,
        to: form.to.value
      });
      if (form.agency_id?.value) params.set('agency_id', form.agency_id.value);
      if (form.service_id?.value) params.set('service_id', form.service_id.value);
      try {
        const data = await api('/reports/summary?' + params.toString());
        const m = data.metrics || {};
        resultEl.innerHTML = `
          <table>
            <tr><th>Đã nộp</th><td>${m.submitted ?? 0}</td></tr>
            <tr><th>Đã tiếp nhận</th><td>${m.received ?? 0}</td></tr>
            <tr><th>Đang xử lý</th><td>${m.processing ?? 0}</td></tr>
            <tr><th>Yêu cầu bổ sung</th><td>${m.supplement_required ?? 0}</td></tr>
            <tr><th>Từ chối</th><td>${m.rejected ?? 0}</td></tr>
            <tr><th>Hoàn tất</th><td>${m.completed ?? 0}</td></tr>
            <tr><th>Tỷ lệ đúng hạn</th><td>${((m.on_time_rate ?? 0) * 100).toFixed(1)}%</td></tr>
            <tr><th>Thời gian xử lý TB (giờ)</th><td>${(m.avg_processing_hours ?? 0).toFixed(1)}</td></tr>
          </table>`;
      } catch (e) {
        resultEl.innerHTML = '<div class="alert alert-error">' + (e.error?.message || 'Lỗi') + '</div>';
      }
    }
    document.getElementById('report-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      loadReport();
    });
    loadReport();
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  function formatDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleString('vi-VN');
  }

  window.addEventListener('hashchange', () => {
    const user = getUser();
    if (!user) return;
    const hash = (location.hash || '#').replace('#', '') || 'login';
    if (hash === 'login' || hash === 'register') return;
    route(hash);
  });

  window.addEventListener('load', () => {
    init();
  });
})();
