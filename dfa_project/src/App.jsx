import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Navigate'i buraya ekledik
import SignInPage from './SignInPage';
import SignUpPage from './SignUpPage';
import DashboardPage from './DashboardPage';
import './App.css'; // Temel CSS sıfırlamalarının olduğu dosya (eğer varsa)

function App() {
  // Kullanıcının giriş yapıp yapmadığını kontrol eden basit bir fonksiyon
  const isAuthenticated = () => {
    const userId = localStorage.getItem('userId'); // Giriş yaparken sakladığın userId'ı kontrol et
    return !!userId; // userId varsa true, yoksa false döner
  };

  return (
    <Router> {/* Uygulamamızın yönlendirme mantığını başlatan ana bileşen */}
      <Routes> {/* Tanımladığımız tüm rotaları barındırır */}

        {/* SignIn ve SignUp sayfaları her zaman erişilebilir olmalı */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* DashboardPage yolunu koruma altına alıyoruz */}
        {/* Kullanıcı kimliği doğrulanmışsa DashboardPage'i göster, değilse /signin'e yönlendir */}
        <Route
          path="/DashboardPage"
          element={isAuthenticated() ? <DashboardPage /> : <Navigate to="/signin" replace />}
        />

        {/* Kök yol ('/') için akıllı yönlendirme */}
        {/* Kullanıcı kimliği doğrulanmışsa DashboardPage'e, değilse /signin'e yönlendir */}
        <Route
          path="/"
          element={isAuthenticated() ? <Navigate to="/DashboardPage" replace /> : <Navigate to="/signin" replace />}
        />

        {/* Opsiyonel: Tanımlanmamış diğer tüm yollar için varsayılan bir yönlendirme
            Örneğin, yanlış bir URL girilirse her zaman /signin'e yönlendirir. */}
        {/* <Route path="*" element={<Navigate to="/signin" replace />} /> */}

      </Routes>
    </Router>
  );
}

export default App;