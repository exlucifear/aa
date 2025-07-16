// update-api-server/index.js
require('dotenv').config(); // Memuat variabel lingkungan dari file .env

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json()); // Untuk membaca body request dalam format JSON

// --- Konfigurasi dari Environment Variables ---
const PORT = process.env.PORT || 3000;
const API_SECRET_KEY = process.env.API_SECRET_KEY; // Kunci rahasia untuk otentikasi permintaan download

// Direktori tempat file ZIP update disimpan (relatif terhadap file index.js ini)
const UPDATE_FILES_DIR = path.join(__dirname, process.env.UPDATE_FILES_DIR || 'updates');
// Lokasi file JSON yang berisi informasi versi terbaru (relatif terhadap file index.js ini)
const VERSION_FILE_PATH = path.join(__dirname, process.env.VERSION_FILE || 'public/current_version.json');

// Pastikan direktori 'updates' dan 'public' ada
if (!fs.existsSync(UPDATE_FILES_DIR)) {
    fs.mkdirSync(UPDATE_FILES_DIR, { recursive: true });
}
if (!fs.existsSync(path.dirname(VERSION_FILE_PATH))) {
    fs.mkdirSync(path.dirname(VERSION_FILE_PATH), { recursive: true });
}
// Pastikan file versi ada, jika tidak, buat dengan versi default
if (!fs.existsSync(VERSION_FILE_PATH)) {
    fs.writeFileSync(VERSION_FILE_PATH, JSON.stringify({ version: "0.0.0", filename: "" }, null, 2));
}

// Middleware otentikasi untuk endpoint yang membutuhkan keamanan
const authenticateApiRequest = (req, res, next) => {
    const receivedSecret = req.headers['x-api-secret'];
    if (!receivedSecret || receivedSecret !== API_SECRET_KEY) {
        console.warn('Percobaan akses tidak sah ke API!');
        return res.status(403).json({ success: false, message: 'Tidak Sah: Kunci Rahasia API Tidak Valid.' });
    }
    next();
};

// --- Endpoint API ---

// Endpoint untuk mendapatkan versi terbaru yang tersedia
app.get('/api/latest-version', (req, res) => {
    try {
        const versionData = JSON.parse(fs.readFileSync(VERSION_FILE_PATH, 'utf8'));
        console.log(`Permintaan versi terbaru. Mengirim: ${JSON.stringify(versionData)}`);
        res.status(200).json({ success: true, data: versionData });
    } catch (error) {
        console.error('Error saat membaca file versi:', error);
        res.status(500).json({ success: false, message: 'Gagal mendapatkan versi terbaru.' });
    }
});

// Endpoint untuk mengunduh file update ZIP
// Membutuhkan 'X-Api-Secret' di header untuk otentikasi
app.get('/api/download-update/:filename', authenticateApiRequest, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPDATE_FILES_DIR, filename);

    if (fs.existsSync(filePath)) {
        console.log(`Melayani file update: ${filename}`);
        // Menggunakan res.download() untuk mengirim file sebagai unduhan
        res.download(filePath, (err) => {
            if (err) {
                console.error(`Error saat mengirim file ${filename}:`, err);
                // Jika error terjadi setelah header dikirim, tidak bisa mengirim JSON lagi
                if (!res.headersSent) {
                    res.status(500).json({ success: false, message: 'Gagal mengunduh file.' });
                }
            }
        });
    } else {
        console.warn(`File tidak ditemukan: ${filename}`);
        res.status(404).json({ success: false, message: 'File update tidak ditemukan.' });
    }
});

// --- Jalankan Server API ---
app.listen(PORT, () => {
    console.log(`Web API untuk update berjalan di http://localhost:${PORT}`);
    console.log(`Direktori file update: ${UPDATE_FILES_DIR}`);
    console.log(`File versi: ${VERSION_FILE_PATH}`);
    console.log('Pastikan Anda mengunggah file ZIP update dan memperbarui current_version.json secara manual.');
});