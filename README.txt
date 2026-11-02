RUANG UANG - PERSONAL FINANCE PLANNER

Isi folder:
- index.html : struktur halaman
- style.css  : tampilan responsif
- app.js     : logika aplikasi dan database IndexedDB
- manifest.json : metadata PWA
- sw.js      : cache offline dasar

MENJALANKAN DI KOMPUTER
1. Buka folder ini di VS Code.
2. Jalankan melalui Live Server (jangan membuka index.html langsung dengan file://).
3. Catatan transaksi tersimpan di IndexedDB browser.

MEMBUAT APK ANDROID DENGAN CAPACITOR
1. Install Node.js LTS dan Android Studio.
2. Buat folder project baru, lalu tempatkan folder web ini sebagai www.
3. Buka terminal pada folder project:
   npm init -y
   npm install @capacitor/core
   npm install -D @capacitor/cli
   npx cap init "Ruang Uang" "com.ruanguang.app" --web-dir www
   npm install @capacitor/android
   npx cap add android
   npx cap sync android
   npx cap open android
4. Build APK dari Android Studio.

CATATAN OFFLINE
Aplikasi dan database transaksi berjalan lokal. Untuk import/export Excel,
letakkan file xlsx.full.min.js di folder ini agar fitur Excel dapat digunakan
tanpa internet. Library tersebut tidak disertakan di paket ini. Ambil file
SheetJS versi 0.18.5 ketika online dan simpan dengan nama persis:
xlsx.full.min.js

IndexedDB terikat pada penyimpanan aplikasi/browser. Uninstall aplikasi atau
menghapus data browser dapat menghapus transaksi. Export Excel secara berkala.
