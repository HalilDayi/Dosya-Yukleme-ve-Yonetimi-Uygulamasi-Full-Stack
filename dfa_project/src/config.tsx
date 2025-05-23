// src/config.js

// Google Colab'dan aldığınız ngrok URL'sini buraya yapıştırın.
// UNUTMAYIN: Bu URL her Colab oturumunda veya ngrok tüneli yeniden başlatıldığında değişebilir.
// Örn: 'https://e437-34-19-14-46.ngrok-free.app' gibi
export const BACKEND_BASE_URL = 'http://127.0.0.1:5000'; 

export const API_ENDPOINTS = {
  signIn: `${BACKEND_BASE_URL}/signin`,
  signUp: `${BACKEND_BASE_URL}/signup`,
  uploadFile: `${BACKEND_BASE_URL}/upload-file`, // Yeni endpoint
  listFiles: `${BACKEND_BASE_URL}/list-files`,      // Yeni endpoint
  deleteFile: `${BACKEND_BASE_URL}/delete-file`,       // Yeni endpoint (ID ile)
  searchFiles: `${BACKEND_BASE_URL}/files/search`, // Yeni endpoint
};