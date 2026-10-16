<?php
// api.php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/config.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

function sendResponse($status, $message, $data = null) {
    echo json_encode([
        'status'  => $status,
        'message' => $message,
        'data'    => $data
    ]);
    exit();
}

switch ($action) {
    // -------------------------------------------------------------
    // AUTHENTICATION
    // -------------------------------------------------------------
    case 'register':
        if ($method !== 'POST') sendResponse('error', 'Metode request tidak diizinkan');

        $name     = trim($body['name'] ?? '');
        $email    = trim($body['email'] ?? '');
        $password = trim($body['password'] ?? '');
        $phone    = trim($body['phone'] ?? '');
        $role     = trim($body['role'] ?? 'tenant');

        if (empty($name) || empty($email) || empty($password)) {
            sendResponse('error', 'Semua kolom wajib diisi');
        }

        $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmtCheck->execute([$email]);
        if ($stmtCheck->rowCount() > 0) {
            sendResponse('error', 'Email sudah terdaftar, silakan gunakan email lain');
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)");
        if ($stmt->execute([$name, $email, $hashedPassword, $phone, $role])) {
            sendResponse('success', 'Pendaftaran berhasil! Silakan masuk.');
        } else {
            sendResponse('error', 'Gagal memproses pendaftaran.');
        }
        break;

    case 'login':
        if ($method !== 'POST') sendResponse('error', 'Metode request tidak diizinkan');

        $email    = trim($body['email'] ?? '');
        $password = trim($body['password'] ?? '');

        if (empty($email) || empty($password)) {
            sendResponse('error', 'Email dan password tidak boleh kosong');
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            unset($user['password']);
            $_SESSION['user'] = $user;
            sendResponse('success', 'Login berhasil!', $user);
        } else {
            sendResponse('error', 'Email atau kata sandi tidak valid');
        }
        break;

    case 'check_session':
        if (isset($_SESSION['user'])) {
            sendResponse('success', 'Sesi aktif', $_SESSION['user']);
        } else {
            sendResponse('unauthorized', 'Belum login');
        }
        break;

    case 'logout':
        session_destroy();
        sendResponse('success', 'Logout berhasil');
        break;

    // -------------------------------------------------------------
    // KOST LISTING & DETAIL
    // -------------------------------------------------------------
    case 'get_kosts':
        $search   = isset($_GET['search']) ? '%' . trim($_GET['search']) . '%' : null;
        $type     = isset($_GET['type']) && $_GET['type'] !== 'All' ? $_GET['type'] : null;
        $maxPrice = isset($_GET['max_price']) && is_numeric($_GET['max_price']) ? (int)$_GET['max_price'] : null;
        $bathroom = isset($_GET['bathroom']) && $_GET['bathroom'] !== 'All' ? $_GET['bathroom'] : null;

        $sql = "SELECT k.*, u.name as owner_name, u.phone as owner_phone FROM kosts k JOIN users u ON k.owner_id = u.id WHERE 1=1";
        $params = [];

        if ($search) {
            $sql .= " AND (k.name LIKE ? OR k.city LIKE ? OR k.address LIKE ?)";
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }
        if ($type) {
            $sql .= " AND k.type = ?";
            $params[] = $type;
        }
        if ($maxPrice) {
            $sql .= " AND k.price_monthly <= ?";
            $params[] = $maxPrice;
        }
        if ($bathroom) {
            $sql .= " AND k.bathroom_type = ?";
            $params[] = $bathroom;
        }

        $sql .= " ORDER BY k.id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $kosts = $stmt->fetchAll();

        foreach ($kosts as &$k) {
            $k['facilities'] = json_decode($k['facilities'], true) ?? [];
        }

        sendResponse('success', 'Berhasil memuat data kost', $kosts);
        break;

    case 'get_kost_detail':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $stmt = $pdo->prepare("SELECT k.*, u.name as owner_name, u.phone as owner_phone FROM kosts k JOIN users u ON k.owner_id = u.id WHERE k.id = ?");
        $stmt->execute([$id]);
        $kost = $stmt->fetch();

        if ($kost) {
            $kost['facilities'] = json_decode($kost['facilities'], true) ?? [];
            sendResponse('success', 'Kost ditemukan', $kost);
        } else {
            sendResponse('error', 'Properti tidak ditemukan');
        }
        break;

    // -------------------------------------------------------------
    // BOOKING TRANSAKSI
    // -------------------------------------------------------------
    case 'create_booking':
        if ($method !== 'POST') sendResponse('error', 'Metode request tidak diizinkan');
        if (!isset($_SESSION['user'])) sendResponse('unauthorized', 'Silakan login terlebih dahulu');

        $kost_id         = (int)($body['kost_id'] ?? 0);
        $tenant_id       = (int)$_SESSION['user']['id'];
        $start_date      = trim($body['start_date'] ?? '');
        $duration_months = (int)($body['duration_months'] ?? 1);
        $payment_method  = trim($body['payment_method'] ?? 'Transfer Bank');

        if ($kost_id <= 0 || empty($start_date) || $duration_months <= 0) {
            sendResponse('error', 'Parameter booking tidak lengkap');
        }

        $stmtKost = $pdo->prepare("SELECT price_monthly, available_rooms FROM kosts WHERE id = ?");
        $stmtKost->execute([$kost_id]);
        $kost = $stmtKost->fetch();

        if (!$kost || $kost['available_rooms'] <= 0) {
            sendResponse('error', 'Unit kamar saat ini sedang penuh.');
        }

        $total_price = $kost['price_monthly'] * $duration_months;

        $stmt = $pdo->prepare("INSERT INTO bookings (kost_id, tenant_id, start_date, duration_months, total_price, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')");
        if ($stmt->execute([$kost_id, $tenant_id, $start_date, $duration_months, $total_price, $payment_method])) {
            // Pengurangan kamar otomatis saat pemesanan
            $pdo->prepare("UPDATE kosts SET available_rooms = available_rooms - 1 WHERE id = ?")->execute([$kost_id]);
            sendResponse('success', 'Booking berhasil diajukan! Menunggu verifikasi pemilik kost.');
        } else {
            sendResponse('error', 'Gagal memproses booking');
        }
        break;

    case 'get_my_bookings':
        if (!isset($_SESSION['user'])) sendResponse('unauthorized', 'Silakan login terlebih dahulu');
        $userId = $_SESSION['user']['id'];

        $stmt = $pdo->prepare("
            SELECT b.*, k.name as kost_name, k.image_url, k.city, k.type 
            FROM bookings b 
            JOIN kosts k ON b.kost_id = k.id 
            WHERE b.tenant_id = ? 
            ORDER BY b.id DESC
        ");
        $stmt->execute([$userId]);
        $bookings = $stmt->fetchAll();
        sendResponse('success', 'Data booking pengguna', $bookings);
        break;

    // -------------------------------------------------------------
    // LANDLORD OPERATIONS
    // -------------------------------------------------------------
    case 'add_kost':
        if ($method !== 'POST') sendResponse('error', 'Metode request tidak diizinkan');
        if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'landlord') {
            sendResponse('forbidden', 'Hanya pemilik properti yang dapat menambah kost');
        }

        $owner_id      = $_SESSION['user']['id'];
        $name          = trim($body['name'] ?? '');
        $type          = trim($body['type'] ?? 'Campur');
        $city          = trim($body['city'] ?? '');
        $address       = trim($body['address'] ?? '');
        $price_monthly = (int)($body['price_monthly'] ?? 0);
        $duration_type = trim($body['duration_type'] ?? 'Bulanan');
        $bathroom_type = trim($body['bathroom_type'] ?? 'Dalam');
        $facilities    = json_encode($body['facilities'] ?? []);
        $rules         = trim($body['rules'] ?? '');
        $image_url     = trim($body['image_url'] ?? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80');
        $total_rooms   = (int)($body['total_rooms'] ?? 5);

        if (empty($name) || empty($city) || $price_monthly <= 0) {
            sendResponse('error', 'Semua kolom bertanda wajib harus diisi dengan benar');
        }

        $stmt = $pdo->prepare("
            INSERT INTO kosts (owner_id, name, type, city, address, price_monthly, duration_type, bathroom_type, facilities, rules, image_url, total_rooms, available_rooms) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $result = $stmt->execute([$owner_id, $name, $type, $city, $address, $price_monthly, $duration_type, $bathroom_type, $facilities, $rules, $image_url, $total_rooms, $total_rooms]);

        if ($result) {
            sendResponse('success', 'Properti kost baru berhasil didaftarkan');
        } else {
            sendResponse('error', 'Gagal menyimpan properti baru');
        }
        break;

    case 'get_landlord_dashboard':
        if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'landlord') {
            sendResponse('forbidden', 'Akses ditolak');
        }

        $owner_id = $_SESSION['user']['id'];

        // Statistik
        $stmtKosts = $pdo->prepare("SELECT * FROM kosts WHERE owner_id = ?");
        $stmtKosts->execute([$owner_id]);
        $kosts = $stmtKosts->fetchAll();

        $totalProperties = count($kosts);
        $totalRooms = 0;
        $availableRooms = 0;

        foreach ($kosts as $k) {
            $totalRooms += $k['total_rooms'];
            $availableRooms += $k['available_rooms'];
        }
        $occupiedRooms = $totalRooms - $availableRooms;
        $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

        // Total Pendapatan dari booking approved
        $stmtIncome = $pdo->prepare("
            SELECT SUM(b.total_price) as total_revenue 
            FROM bookings b 
            JOIN kosts k ON b.kost_id = k.id 
            WHERE k.owner_id = ? AND b.status = 'Approved'
        ");
        $stmtIncome->execute([$owner_id]);
        $incomeRow = $stmtIncome->fetch();
        $totalRevenue = $incomeRow['total_revenue'] ?? 0;

        // Daftar Booking yang Masuk
        $stmtBookings = $pdo->prepare("
            SELECT b.*, u.name as tenant_name, u.phone as tenant_phone, k.name as kost_name 
            FROM bookings b 
            JOIN kosts k ON b.kost_id = k.id 
            JOIN users u ON b.tenant_id = u.id 
            WHERE k.owner_id = ? 
            ORDER BY b.id DESC
        ");
        $stmtBookings->execute([$owner_id]);
        $bookingsList = $stmtBookings->fetchAll();

        sendResponse('success', 'Statistik landlord didapatkan', [
            'stats' => [
                'total_properties' => $totalProperties,
                'total_rooms'      => $totalRooms,
                'occupied_rooms'   => $occupiedRooms,
                'occupancy_rate'   => $occupancyRate,
                'total_revenue'    => (int)$totalRevenue
            ],
            'kosts'    => $kosts,
            'bookings' => $bookingsList
        ]);
        break;

    case 'update_booking_status':
        if ($method !== 'POST') sendResponse('error', 'Metode request tidak diizinkan');
        if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'landlord') {
            sendResponse('forbidden', 'Akses ditolak');
        }

        $bookingId = (int)($body['booking_id'] ?? 0);
        $status    = trim($body['status'] ?? '');

        if (!in_array($status, ['Approved', 'Rejected'])) {
            sendResponse('error', 'Status tidak valid');
        }

        $stmt = $pdo->prepare("UPDATE bookings SET status = ? WHERE id = ?");
        if ($stmt->execute([$status, $bookingId])) {
            sendResponse('success', 'Status pengajuan sewa berhasil diperbarui');
        } else {
            sendResponse('error', 'Gagal memperbarui status');
        }
        break;

    default:
        sendResponse('error', 'Endpoint API tidak valid');
        break;
}