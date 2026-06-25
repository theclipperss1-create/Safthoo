## 1. Overview

SaaS Safthoo adalah platform e-commerce B2C premium untuk pembeli online yang ingin melihat produk, memasukkan item ke keranjang, dan menyelesaikan checkout dengan pengalaman cepat, rapi, dan minim hambatan. [Assumption] Pengguna utama MVP adalah pelanggan akhir yang membeli produk langsung dari katalog Safthoo, bukan penjual pihak ketiga atau tim internal dengan workflow kompleks. Masalah inti yang diselesaikan adalah pengalaman belanja yang sering terasa lambat, berantakan, dan tidak jelas statusnya setelah checkout, terutama saat pengguna perlu memastikan stok dan pembayaran. MVP Safthoo berfokus pada katalog produk dengan tampilan premium, pencarian/filter dasar, keranjang belanja, checkout, simulasi pembayaran QRIS, serta status pembayaran dan stok yang tersinkron real-time. Keberhasilan versi pertama berarti pengguna dapat menemukan produk, checkout, melihat status pembayaran, dan menyelesaikan transaksi simulasi tanpa kebingungan atau bantuan manual.

## 2. Scope Warning & MVP Boundary

SaaS Safthoo versi draft terlalu besar untuk rilis pertama karena mencampur e-commerce B2C, multi-tenant roles, simulasi pembayaran, media upload, real-time sync, dan desain animasi premium sekaligus. Untuk MVP, fokus dipersempit ke alur inti: pengguna melihat produk, menaruh produk ke keranjang, checkout, lalu melihat status pembayaran simulasi. Ini menjaga build tetap cepat, mudah diuji, dan tidak mengunci tim ke arsitektur yang terlalu berat sejak awal.

MVP mencakup:

- **Login pengguna sederhana** menggunakan Firebase Auth dengan Email + Password dan Google OAuth. Setelah login, pengguna langsung masuk ke halaman katalog.
- **Katalog produk premium** dengan layout Gapless Bento Grid, data produk dari Firestore, gambar produk public read, dan basic filtering berdasarkan nama atau kategori.
- **Keranjang belanja cepat** berisi tambah produk, ubah jumlah, hapus item, hitung subtotal, dan hard-delete cart setelah checkout berhasil dibuat.
- **Checkout dengan simulasi QRIS** yang membuat transaksi permanen di Firestore, menampilkan QR simulasi, dan memperbarui status pembayaran secara real-time.
- **Sinkronisasi stok produk** secara real-time pada halaman produk dan checkout agar pengguna tidak membeli item yang sudah habis.

### Out of MVP:

- Multi-tenant organisasi dan multiple roles.
- Dashboard admin lengkap untuk manajemen produk.
- Upload gambar dari UI admin.
- Email notification dan push notification.
- Optimasi SEO/SSR lanjutan di Vercel.
- Animasi kompleks di luar micro-interaction tombol, cart, toast, dan transisi halaman.

## 3. MVP Requirements

### Functional

- [Must] Pengguna dapat membuat akun dan login menggunakan email + password atau Google OAuth melalui Firebase Auth.
- [Must] Pengguna yang belum login tetap dapat melihat katalog produk, tetapi harus login sebelum checkout.
- [Must] Data utama MVP terdiri dari `users`, `products`, `carts`, `orders`, dan `paymentStatus` di Cloud Firestore.
- [Must] Produk memiliki minimal field `name`, `description`, `price`, `stock`, `imageUrl`, `isActive`, `createdAt`, dan `updatedAt`.
- [Must] Katalog menampilkan produk aktif dalam layout Gapless Bento Grid dengan pencarian dasar berdasarkan nama produk.
- [Must] Pengguna dapat menambahkan produk ke keranjang, mengubah jumlah item, dan menghapus item dari keranjang sebelum checkout.
- [Must] Sistem harus mencegah checkout jika stok produk tidak mencukupi pada saat pengguna menekan tombol checkout.
- [Must] Core action MVP adalah pengguna memilih produk, memasukkannya ke keranjang, checkout, lalu melihat status pembayaran simulasi QRIS.
- [Must] Setelah checkout berhasil dibuat, cart pengguna dihapus permanen dan order disimpan permanen sebagai riwayat transaksi.
- [Must] Status pembayaran simulasi dapat berubah secara real-time dan terlihat di halaman order pengguna.
- [Should] Stok produk diperbarui secara real-time pada katalog dan halaman detail produk agar pengguna tidak membeli stok yang sudah habis.

### Non-Functional

- [Must] Aplikasi menggunakan React, Vite, TypeScript, Tailwind CSS v4, Firebase, dan Vercel sesuai stack proyek.
- [Must] Halaman katalog harus terasa cepat untuk skenario read-heavy dengan query Firestore yang sederhana dan terindeks.
- [Must] Firebase Security Rules harus memastikan pengguna hanya dapat membaca dan mengubah cart serta order miliknya sendiri.
- [Should] UI memenuhi aksesibilitas dasar, termasuk label form, fokus keyboard yang terlihat, kontras teks yang cukup, dan tombol dengan state loading.

## 4. MVP Core Features

[Assumption] MVP difokuskan pada satu storefront B2C terlebih dahulu. Multi-tenant, multiple roles kompleks, dan dashboard organisasi dipindah ke post-MVP agar checkout flow bisa divalidasi lebih cepat.

**Autentikasi Pembeli**
- Behavior: Pengguna dapat daftar dan login menggunakan Email + Password atau Google OAuth melalui Firebase Auth. Setelah login berhasil, pengguna diarahkan ke halaman katalog utama.
- States: Logged out menampilkan tombol login/daftar; loading saat proses auth berjalan; logged in menampilkan avatar/menu akun; invalid credentials menampilkan pesan error singkat di form.
- User value: Pengguna punya sesi belanja yang tersimpan, sehingga cart dan transaksi bisa dikaitkan ke akun mereka.
- Failure: Jika Firebase Auth gagal atau koneksi terputus, tampilkan toast error dan biarkan pengguna mencoba lagi tanpa menghapus input email/password.

**Katalog Produk Bento Grid**
- Behavior: Produk ditampilkan dalam Gapless Bento Grid dengan gambar, nama produk, harga aktif, status stok, dan tombol tambah ke cart. Basic filtering mendukung pencarian teks berdasarkan nama produk.
- States: Empty catalog menampilkan pesan “Produk belum tersedia”; loading menampilkan skeleton grid; out of stock menonaktifkan tombol tambah; hasil filter kosong menampilkan tombol reset filter.
- User value: Pengguna bisa menemukan produk dengan cepat dan langsung memahami harga serta ketersediaan stok tanpa membuka banyak halaman.
- Failure: Jika data produk gagal dimuat dari Firestore, tampilkan state error dengan tombol “Muat ulang”; jangan tampilkan harga/stok dari cache jika data ditandai stale.

**Keranjang Belanja Cepat**
- Behavior: Pengguna dapat menambahkan produk ke cart, mengubah kuantitas, menghapus item, dan melihat subtotal berdasarkan harga produk saat item ditambahkan. Cart hanya tersedia untuk pengguna login.
- States: Empty cart menampilkan CTA kembali ke katalog; cart aktif menampilkan item, kuantitas, subtotal, dan tombol checkout; kuantitas tidak boleh melebihi stok aktif; checkout loading mengunci tombol.
- User value: Pengguna bisa menyusun pembelian dengan cepat tanpa friction dan melihat estimasi total sebelum bayar.
- Failure: Jika stok berubah dan kuantitas cart tidak valid, tampilkan pesan “Stok berubah” lalu turunkan kuantitas ke stok tersedia atau minta pengguna menghapus item.

**Checkout QRIS Simulasi**
- Behavior: Saat checkout, sistem membuat transaksi permanen di Firestore, mengurangi/menahan stok sesuai aturan implementasi, menghapus cart secara hard-delete, lalu menampilkan QRIS simulasi dan status pembayaran real-time.
- States: Pending menampilkan QR dan instruksi bayar; Paid menampilkan ringkasan transaksi; Expired/Failed menampilkan tombol kembali ke cart/katalog; stok produk tersinkron real-time selama proses checkout.
- User value: Pengguna bisa menyelesaikan alur beli dari katalog sampai pembayaran tanpa integrasi payment gateway asli di MVP.
- Failure: Jika transaksi gagal dibuat, cart tidak boleh dihapus. Jika status pembayaran gagal disinkronkan, tampilkan banner retry dan polling ulang status transaksi.

## 5. User Flow

[Assumption] MVP berfokus pada alur pembeli B2C: melihat katalog, memasukkan produk ke keranjang, checkout, dan menyelesaikan simulasi pembayaran QRIS.

1. Pengguna membuka halaman utama Safthoo dan langsung melihat katalog produk dalam layout Gapless Bento Grid.
2. Pengguna menggunakan pencarian atau filter dasar untuk mempersempit produk yang ingin dibeli.
3. Pengguna memilih produk untuk melihat detail utama seperti nama, gambar, harga dinamis, stok, dan deskripsi singkat.
4. Pengguna menambahkan produk ke keranjang, lalu sistem memberi feedback taktil dan gooey-toast bahwa produk berhasil ditambahkan.
5. Pengguna membuka keranjang untuk meninjau item, jumlah, subtotal, dan ketersediaan stok terbaru.
6. Jika belum login, pengguna diminta masuk dengan Email + Password atau Google OAuth sebelum melanjutkan checkout.
7. Pengguna menekan checkout, lalu sistem membuat transaksi permanen dan menghapus keranjang setelah checkout berhasil dibuat.
8. Pengguna melihat halaman pembayaran simulasi QRIS dengan status pembayaran real-time.
9. Setelah status pembayaran berubah menjadi berhasil, pengguna melihat ringkasan transaksi sebagai bukti bahwa pesanan sudah tercatat.

### Key edge paths

- **Stok habis saat checkout:** sistem menahan proses checkout, menampilkan item bermasalah, dan meminta pengguna mengubah jumlah atau menghapus produk dari keranjang.
- **Keranjang kosong:** halaman keranjang menampilkan empty state premium dengan ajakan kembali ke katalog, bukan layar kosong.
- **Returning user:** pengguna yang sudah login dapat langsung membuka katalog, menambahkan produk, dan checkout tanpa melewati login ulang selama sesi masih valid.

## 6. Architecture

### MVP Components

- **Client app:** React + Vite + TypeScript app hosted on Vercel. The client handles product browsing, basic filtering, cart UI, auth screens, checkout flow, theme toggle, and in-app gooey toast notifications.

- **Backend/API layer:** Firebase Cloud Functions handles server-side actions that should not live in the browser, especially checkout finalization, simulated QRIS payment creation, payment status updates, stock checks, and cart hard-delete after successful checkout.

- **Datastore:** Cloud Firestore stores products, carts, orders/transactions, payment status, stock counts, user profiles, and minimal organization/role data. [Assumption] MVP keeps multi-tenant support simple: user data is scoped by organization ID, without a complex admin dashboard.

- **Media and third-party services:** Firebase Storage stores product images with public read and admin-only write rules. Firebase Auth supports email/password login and Google OAuth. Vercel serves the frontend. Simulated QRIS is implemented as internal Firebase-backed payment state, not a real payment provider.

## 7. Database Schema

MVP menyimpan data inti untuk auth, katalog, keranjang, checkout, dan simulasi pembayaran QRIS. [Assumption] MVP tetap mendukung organisasi dan role sederhana, tetapi tidak membuat workflow admin dashboard yang kompleks.

- **ORGANIZATION** — ruang data untuk tenant/store yang memiliki produk dan pengguna.
- **USER** — profil pengguna dari Firebase Auth, termasuk role dasar dan relasi organisasi.
- **PRODUCT** — katalog produk, harga aktif, stok, status publikasi, dan URL gambar.
- **CART** — keranjang aktif milik user; dihapus permanen setelah checkout selesai.
- **CART_ITEM** — item produk dalam keranjang, termasuk kuantitas dan snapshot harga saat ditambahkan.
- **ORDER** — transaksi permanen setelah checkout; tidak dihapus.
- **ORDER_ITEM** — snapshot item transaksi agar riwayat tetap akurat walau harga produk berubah.
- **PAYMENT** — simulasi QRIS custom, status pembayaran real-time, dan data QR.

## 8. API Endpoints

[Assumption] API MVP menggunakan Firebase Cloud Functions sebagai HTTP API tipis di atas Firebase Auth dan Cloud Firestore. Semua endpoint mengembalikan JSON dan membutuhkan `Authorization: Bearer <firebaseIdToken>` kecuali endpoint katalog publik.

## 9. Acceptance Criteria & Build Plan

### Build Plan

1. **Foundation & Auth** — Set up React, Vite, TypeScript, Tailwind v4, Firebase Auth, Firestore structure, routing, and protected pages. Implement Email/Password and Google login with minimal onboarding.  
   **Checkpoint:** A signed-in user can access dashboard/catalog; a signed-out user is redirected to login before protected routes.

2. **Catalog, Product Detail & Cart** — Build product listing, gapless bento grid, basic filtering, product detail, cart state, quantity changes, and total calculation.  
   **Checkpoint:** A user can search products, add items to cart, update quantity, and see accurate subtotal/total.

3. **Checkout & Simulated Payment** — Create transaction records, hard-delete cart after completed checkout, show simulated QRIS payment UI, and sync payment status plus product stock in real time.  
   **Checkpoint:** A checkout creates one permanent transaction, shows live payment status, and blocks insufficient-stock purchases.

4. **UI Polish, Rules & Critical Tests** — Apply Geist typography, light-first theme, floating navigation/bottom dock, Framer Motion interactions, gooey-toast notifications, Firebase Security Rules, and testsprite critical-path tests.  
   **Checkpoint:** Critical paths pass: login, browse, add to cart, checkout, simulated payment update, stock failure, and unauthorized write rejection.

## 10. Post-MVP / Future Ideas

- **Multi-tenant organization roles** — Membutuhkan validasi kebutuhan tim sebelum menambah kompleksitas akses.
- **Payment gateway nyata** — Ditunda sampai simulasi QRIS terbukti cukup untuk alur checkout.
- **Admin dashboard lengkap** — MVP cukup memakai pengelolaan data sederhana di Firebase.
- **Email dan push notification** — Fokus awal tetap pada notifikasi in-app gooey-toast.
- **Advanced product filtering** — Basic filtering cukup untuk menguji katalog dan pembelian awal.
- **SEO/SSR optimization mendalam** — Ditunda sampai struktur halaman dan katalog stabil.
