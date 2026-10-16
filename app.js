// app.js
const app = {
    currentUser: null,
    kostsData: [],

    init() {
        this.checkSession();
        this.fetchKosts();
        this.bindEvents();
    },

    bindEvents() {
        // Slider Price Listener
        const priceSlider = document.getElementById('filterPrice');
        const priceLabel = document.getElementById('priceLabel');
        if (priceSlider && priceLabel) {
            priceSlider.addEventListener('input', (e) => {
                priceLabel.innerText = `Rp ${Number(e.target.value).toLocaleString('id-ID')} / bln`;
            });
        }
    },

    // ------------------------------------------------------------------------
    // SESSION & AUTH
    // ------------------------------------------------------------------------
    async checkSession() {
        try {
            const res = await fetch('api.php?action=check_session');
            const data = await res.json();
            if (data.status === 'success') {
                this.currentUser = data.data;
            } else {
                this.currentUser = null;
            }
            this.renderNavAuth();
        } catch (error) {
            console.error('Gagal memverifikasi sesi:', error);
        }
    },

    renderNavAuth() {
        const authArea = document.getElementById('navAuthArea');
        const linkRiwayat = document.getElementById('linkRiwayat');
        const linkLandlord = document.getElementById('linkLandlord');

        if (this.currentUser) {
            authArea.innerHTML = `
                <div style="text-align: right; margin-right: 5px;">
                    <strong style="display: block; font-size: 0.9rem;">${this.currentUser.name}</strong>
                    <span style="font-size: 0.75rem; color: var(--primary); text-transform: uppercase;">Role: ${this.currentUser.role}</span>
                </div>
                <button class="btn btn-outline" onclick="app.handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Keluar</button>
            `;

            if (this.currentUser.role === 'landlord') {
                linkLandlord.style.display = 'inline-block';
                linkRiwayat.style.display = 'none';
            } else {
                linkLandlord.style.display = 'none';
                linkRiwayat.style.display = 'inline-block';
            }
        } else {
            authArea.innerHTML = `
                <button class="btn btn-outline" onclick="app.openModal('modalAuth')">Masuk / Daftar</button>
            `;
            linkLandlord.style.display = 'none';
            linkRiwayat.style.display = 'none';
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch('api.php?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const result = await res.json();
            if (result.status === 'success') {
                alert('Berhasil masuk! Selamat datang ' + result.data.name);
                this.currentUser = result.data;
                this.closeModal('modalAuth');
                this.renderNavAuth();
                if (this.currentUser.role === 'landlord') {
                    this.showLandlordDashboard();
                } else {
                    this.showHomeView();
                }
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert('Terjadi kesalahan saat memproses login.');
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const payload = {
            name: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
            phone: document.getElementById('regPhone').value,
            password: document.getElementById('regPassword').value,
            role: document.getElementById('regRole').value
        };

        try {
            const res = await fetch('api.php?action=register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            alert(result.message);
            if (result.status === 'success') {
                this.switchAuthTab('login');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat pendaftaran.');
        }
    },

    async handleLogout() {
        if (!confirm('Apakah Anda yakin ingin keluar?')) return;
        try {
            await fetch('api.php?action=logout');
            this.currentUser = null;
            this.renderNavAuth();
            this.showHomeView();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    },

    // ------------------------------------------------------------------------
    // KOSTS LISTING & FILTER
    // ------------------------------------------------------------------------
    async fetchKosts() {
        const search = document.getElementById('filterSearch').value;
        const type = document.getElementById('filterType').value;
        const maxPrice = document.getElementById('filterPrice').value;

        const queryParams = new URLSearchParams({
            search: search,
            type: type,
            max_price: maxPrice
        });

        try {
            const res = await fetch(`api.php?action=get_kosts&${queryParams.toString()}`);
            const result = await res.json();
            if (result.status === 'success') {
                this.kostsData = result.data;
                this.renderKosts(this.kostsData);
            }
        } catch (err) {
            console.error('Error fetching kosts:', err);
        }
    },

    renderKosts(kosts) {
        const container = document.getElementById('kostListContainer');
        if (!container) return;

        if (kosts.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fa-solid fa-magnifying-glass" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 10px;"></i>
                    <p class="text-muted">Properti yang Anda cari tidak ditemukan. Coba sesuaikan filter pencarian.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = kosts.map(k => `
            <div class="property-card">
                <div class="property-thumb">
                    <img src="${k.image_url}" alt="${k.name}" loading="lazy">
                    <span class="badge-tag">${k.type}</span>
                    <span class="badge-rating"><i class="fa-solid fa-star"></i> ${k.rating}</span>
                </div>
                <div class="property-body">
                    <h3 class="property-title">${k.name}</h3>
                    <p class="property-location"><i class="fa-solid fa-map-pin"></i> ${k.city} - ${k.address}</p>
                    <div class="amenities-badges">
                        ${k.facilities.slice(0, 3).map(f => `<span class="amenity-pill"><i class="fa-solid fa-check"></i> ${f}</span>`).join('')}
                        ${k.facilities.length > 3 ? `<span class="amenity-pill">+${k.facilities.length - 3}</span>` : ''}
                    </div>
                    <div class="property-footer">
                        <div class="price-text">
                            Rp ${Number(k.price_monthly).toLocaleString('id-ID')}<span> / bln</span>
                        </div>
                        <button class="btn btn-primary" onclick="app.openKostDetail(${k.id})">Detail</button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    setQuickFilter(type, chipElement) {
        document.querySelectorAll('.filter-quick-chips .chip').forEach(c => c.classList.remove('active'));
        chipElement.classList.add('active');
        document.getElementById('filterType').value = type;
        this.fetchKosts();
    },

    // ------------------------------------------------------------------------
    // KOST DETAIL & BOOKING MODAL
    // ------------------------------------------------------------------------
    async openKostDetail(kostId) {
        try {
            const res = await fetch(`api.php?action=get_kost_detail&id=${kostId}`);
            const result = await res.json();
            if (result.status === 'success') {
                const k = result.data;
                const detailBody = document.getElementById('modalDetailBody');
                detailBody.innerHTML = `
                    <div style="margin-bottom: 20px;">
                        <img src="${k.image_url}" alt="${k.name}" style="width: 100%; height: 320px; object-fit: cover; border-radius: 12px; margin-bottom: 15px;">
                        <h2>${k.name}</h2>
                        <p class="text-muted"><i class="fa-solid fa-location-dot"></i> ${k.address}, ${k.city}</p>
                    </div>
                    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                        <span class="amenity-pill"><i class="fa-solid fa-bath"></i> Kamar Mandi: ${k.bathroom_type}</span>
                        <span class="amenity-pill"><i class="fa-solid fa-door-open"></i> Sisa Kamar: ${k.available_rooms} Unit</span>
                        <span class="amenity-pill"><i class="fa-solid fa-user-tie"></i> Pemilik: ${k.owner_name}</span>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <h4>Fasilitas Lengkap</h4>
                        <div class="facilities-checkbox-grid" style="margin-top: 8px;">
                            ${k.facilities.map(f => `<div><i class="fa-solid fa-circle-check" style="color: var(--primary);"></i> ${f}</div>`).join('')}
                        </div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <h4>Peraturan Kost</h4>
                        <p class="text-muted">${k.rules || 'Menjaga tata tertib dan kenyamanan bersama.'}</p>
                    </div>
                    <div class="property-footer" style="align-items: center;">
                        <div class="price-text">Rp ${Number(k.price_monthly).toLocaleString('id-ID')}<span> / bulan</span></div>
                        <button class="btn btn-primary" onclick="app.startBookingProcess(${k.id}, '${k.name.replace(/'/g, "\\'")}', ${k.price_monthly})">
                            <i class="fa-solid fa-calendar-check"></i> Ajukan Sewa Sekarang
                        </button>
                    </div>
                `;
                this.openModal('modalDetail');
            }
        } catch (err) {
            alert('Gagal mengambil detail properti.');
        }
    },

    startBookingProcess(kostId, kostName, monthlyPrice) {
        if (!this.currentUser) {
            alert('Silakan masuk ke akun Anda terlebih dahulu untuk mengajukan sewa.');
            this.closeModal('modalDetail');
            this.openModal('modalAuth');
            return;
        }

        this.closeModal('modalDetail');
        document.getElementById('bookingKostId').value = kostId;
        document.getElementById('bookingKostTitle').innerText = kostName;
        document.getElementById('bookingMonthlyRate').value = monthlyPrice;
        document.getElementById('bookingStartDate').value = new Date().toISOString().split('T')[0];
        this.calculateBookingPrice();
        this.openModal('modalBooking');
    },

    calculateBookingPrice() {
        const rate = Number(document.getElementById('bookingMonthlyRate').value) || 0;
        const duration = Number(document.getElementById('bookingDuration').value) || 1;
        const total = rate * duration;

        document.getElementById('bookingRateText').innerText = `Rp ${rate.toLocaleString('id-ID')} x ${duration} Bulan`;
        document.getElementById('bookingTotalPriceText').innerText = `Rp ${total.toLocaleString('id-ID')}`;
    },

    async submitBooking(e) {
        e.preventDefault();
        const payload = {
            kost_id: document.getElementById('bookingKostId').value,
            start_date: document.getElementById('bookingStartDate').value,
            duration_months: document.getElementById('bookingDuration').value,
            payment_method: document.getElementById('bookingPaymentMethod').value
        };

        try {
            const res = await fetch('api.php?action=create_booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            alert(result.message);
            if (result.status === 'success') {
                this.closeModal('modalBooking');
                this.showBookingsHistory();
            }
        } catch (err) {
            alert('Terjadi kesalahan saat memproses pemesanan.');
        }
    },

    async showBookingsHistory() {
        document.getElementById('homeView').style.display = 'none';
        document.getElementById('landlordView').style.display = 'none';
        document.getElementById('bookingsHistoryView').style.display = 'block';

        try {
            const res = await fetch('api.php?action=get_my_bookings');
            const result = await res.json();
            const container = document.getElementById('tenantBookingsContainer');

            if (result.status === 'success') {
                if (result.data.length === 0) {
                    container.innerHTML = '<p class="text-muted">Anda belum memiliki riwayat sewa properti.</p>';
                    return;
                }
                container.innerHTML = result.data.map(b => `
                    <div class="property-card">
                        <div class="property-thumb" style="height: 160px;">
                            <img src="${b.image_url}" alt="${b.kost_name}">
                            <span class="badge-tag">${b.status}</span>
                        </div>
                        <div class="property-body">
                            <h3>${b.kost_name}</h3>
                            <p class="text-muted"><i class="fa-solid fa-calendar"></i> Mulai: ${b.start_date} (${b.duration_months} Bulan)</p>
                            <p class="text-muted"><i class="fa-solid fa-credit-card"></i> Metode: ${b.payment_method}</p>
                            <div class="property-footer">
                                <strong>Total: Rp ${Number(b.total_price).toLocaleString('id-ID')}</strong>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error(err);
        }
    },

    // ------------------------------------------------------------------------
    // LANDLORD DASHBOARD
    // ------------------------------------------------------------------------
    async showLandlordDashboard() {
        document.getElementById('homeView').style.display = 'none';
        document.getElementById('bookingsHistoryView').style.display = 'none';
        document.getElementById('landlordView').style.display = 'block';

        try {
            const res = await fetch('api.php?action=get_landlord_dashboard');
            const result = await res.json();
            if (result.status === 'success') {
                const data = result.data;
                document.getElementById('statTotalProps').innerText = data.stats.total_properties;
                document.getElementById('statOccupancy').innerText = `${data.stats.occupancy_rate}% (${data.stats.occupied_rooms}/${data.stats.total_rooms} Kamar)`;
                document.getElementById('statRevenue').innerText = `Rp ${Number(data.stats.total_revenue).toLocaleString('id-ID')}`;

                const tableBody = document.getElementById('landlordBookingTableings');
                if (data.bookings.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">Belum ada pengajuan booking kamar.</td></tr>`;
                    return;
                }

                tableBody.innerHTML = data.bookings.map(b => `
                    <tr>
                        <td><strong>${b.kost_name}</strong></td>
                        <td>${b.tenant_name}</td>
                        <td>${b.tenant_phone}</td>
                        <td>${b.start_date}</td>
                        <td>${b.duration_months} Bulan</td>
                        <td>Rp ${Number(b.total_price).toLocaleString('id-ID')}</td>
                        <td>${b.payment_method}</td>
                        <td>
                            <span class="amenity-pill" style="background: ${b.status === 'Approved' ? '#dcfce7' : (b.status === 'Rejected' ? '#fee2e2' : '#fef3c7')};">
                                ${b.status}
                            </span>
                        </td>
                        <td>
                            ${b.status === 'Pending' ? `
                                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="app.updateBookingStatus(${b.id}, 'Approved')">Terima</button>
                                <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem; border-color: red; color: red;" onclick="app.updateBookingStatus(${b.id}, 'Rejected')">Tolak</button>
                            ` : `<span class="text-muted">Selesai</span>`}
                        </td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            console.error('Error fetching landlord data:', err);
        }
    },

    async updateBookingStatus(bookingId, status) {
        if (!confirm(`Konfirmasi untuk ${status === 'Approved' ? 'menyetujui' : 'menolak'} pengajuan sewa ini?`)) return;
        try {
            const res = await fetch('api.php?action=update_booking_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId, status: status })
            });
            const result = await res.json();
            alert(result.message);
            this.showLandlordDashboard();
        } catch (err) {
            alert('Gagal memperbarui status');
        }
    },

    async handleAddKost(e) {
        e.preventDefault();
        const facilitiesChecked = Array.from(document.querySelectorAll('input[name="facilities"]:checked')).map(el => el.value);

        const payload = {
            name: document.getElementById('kostName').value,
            type: document.getElementById('kostType').value,
            city: document.getElementById('kostCity').value,
            address: document.getElementById('kostAddress').value,
            price_monthly: document.getElementById('kostPrice').value,
            bathroom_type: document.getElementById('kostBathroom').value,
            total_rooms: document.getElementById('kostRooms').value,
            image_url: document.getElementById('kostImage').value,
            facilities: facilitiesChecked,
            rules: document.getElementById('kostRules').value
        };

        try {
            const res = await fetch('api.php?action=add_kost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            alert(result.message);
            if (result.status === 'success') {
                this.closeModal('modalAddKost');
                document.getElementById('formAddKost').reset();
                this.showLandlordDashboard();
                this.fetchKosts();
            }
        } catch (err) {
            alert('Gagal menambahkan kost.');
        }
    },

    // ------------------------------------------------------------------------
    // UI MODAL & NAVIGATION HELPERS
    // ------------------------------------------------------------------------
    showHomeView() {
        document.getElementById('landlordView').style.display = 'none';
        document.getElementById('bookingsHistoryView').style.display = 'none';
        document.getElementById('homeView').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    },

    switchAuthTab(type) {
        const formLogin = document.getElementById('formLogin');
        const formReg = document.getElementById('formRegister');
        const tabBtnLogin = document.getElementById('tabBtnLogin');
        const tabBtnReg = document.getElementById('tabBtnRegister');

        if (type === 'login') {
            formLogin.style.display = 'block';
            formReg.style.display = 'none';
            tabBtnLogin.classList.add('active');
            tabBtnReg.classList.remove('active');
        } else {
            formLogin.style.display = 'none';
            formReg.style.display = 'block';
            tabBtnLogin.classList.remove('active');
            tabBtnReg.classList.add('active');
        }
    },

    toggleMobileMenu() {
        alert('Navigasi mobile diaktifkan');
    }
};

// Inisialisasi App saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});