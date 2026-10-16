-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 16 Okt 2026 pada 15.06
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_kostify`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `kost_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `duration_months` int(11) NOT NULL DEFAULT 1,
  `total_price` int(11) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `favorites`
--

CREATE TABLE `favorites` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `kost_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `kosts`
--

CREATE TABLE `kosts` (
  `id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `type` enum('Putra','Putri','Campur') NOT NULL,
  `city` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `price_monthly` int(11) NOT NULL,
  `duration_type` enum('Harian','Bulanan','Tahunan') DEFAULT 'Bulanan',
  `bathroom_type` enum('Dalam','Luar') DEFAULT 'Dalam',
  `facilities` text NOT NULL,
  `rules` text DEFAULT NULL,
  `image_url` text NOT NULL,
  `rating` decimal(2,1) DEFAULT 4.8,
  `total_rooms` int(11) DEFAULT 5,
  `available_rooms` int(11) DEFAULT 5,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `kosts`
--

INSERT INTO `kosts` (`id`, `owner_id`, `name`, `type`, `city`, `address`, `price_monthly`, `duration_type`, `bathroom_type`, `facilities`, `rules`, `image_url`, `rating`, `total_rooms`, `available_rooms`, `created_at`) VALUES
(1, 1, 'Verdant Hills Executive Living', 'Campur', 'Bandung', 'Jl. Bukit Pakar No. 88, Ciburial', 2750000, 'Bulanan', 'Dalam', '[\"AC\", \"Wi-Fi\", \"Kasur\", \"Lemari\", \"Bebas 24 Jam\", \"Parkir\"]', 'Tidak boleh merokok di dalam kamar, Tamu lawan jenis dilarang menginap', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', 4.9, 10, 4, '2026-10-13 15:53:28'),
(2, 1, 'Griya Amartha Kost Putri', 'Putri', 'Jakarta Selatan', 'Jl. Tebet Barat Dalam No. 12', 1850000, 'Bulanan', 'Dalam', '[\"AC\", \"Wi-Fi\", \"Kasur\", \"Lemari\", \"Parkir\"]', 'Gerbang tutup pukul 23:00 WIB, Khusus putri single/mahasiswi', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80', 4.8, 8, 2, '2026-10-13 15:53:28'),
(3, 1, 'Pavilion Residence Senayan', 'Campur', 'Jakarta Pusat', 'Jl. Asia Afrika No. 45', 3500000, 'Bulanan', 'Dalam', '[\"AC\", \"Wi-Fi\", \"Kasur\", \"Lemari\", \"Bebas 24 Jam\", \"Parkir\"]', 'Menjaga kebersihan dan ketenangan lingkungan sekitar', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80', 5.0, 6, 1, '2026-10-13 15:53:28'),
(4, 1, 'Kost Arya Man Putra', 'Putra', 'Yogyakarta', 'Jl. Kaliurang KM 5, Sleman', 950000, 'Bulanan', 'Luar', '[\"Wi-Fi\", \"Kasur\", \"Lemari\", \"Parkir\"]', 'Dilarang membawa miras dan narkoba', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80', 4.6, 12, 5, '2026-10-13 15:53:28');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('tenant','landlord') NOT NULL DEFAULT 'tenant',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone`, `role`, `created_at`) VALUES
(1, 'Hendra Wijaya (Owner)', 'owner@example.com', '$2y$10$vI8aWBnW3fID.ZQ4/zo1G.qH0vJ2vF88tY7c7R3qU6jBfU8e1tK4K', '081234567890', 'landlord', '2026-10-13 15:53:28'),
(2, 'Sarah Amalia (Penyewa)', 'tenant@example.com', '$2y$10$vI8aWBnW3fID.ZQ4/zo1G.qH0vJ2vF88tY7c7R3qU6jBfU8e1tK4K', '089876543210', 'tenant', '2026-10-13 15:53:28');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `kost_id` (`kost_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indeks untuk tabel `favorites`
--
ALTER TABLE `favorites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_kost_unique` (`user_id`,`kost_id`),
  ADD KEY `kost_id` (`kost_id`);

--
-- Indeks untuk tabel `kosts`
--
ALTER TABLE `kosts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `favorites`
--
ALTER TABLE `favorites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `kosts`
--
ALTER TABLE `kosts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`kost_id`) REFERENCES `kosts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `favorites`
--
ALTER TABLE `favorites`
  ADD CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`kost_id`) REFERENCES `kosts` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `kosts`
--
ALTER TABLE `kosts`
  ADD CONSTRAINT `kosts_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
