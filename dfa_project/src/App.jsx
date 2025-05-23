// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // React Router DOM'dan gerekli bileşenler
import SignInPage from './SignInPage'; // Yeni oluşturduğumuz giriş sayfasını import ediyoruz
import SignUpPage from './SignUpPage';
import DashboardPage from './DashboardPage';
import './App.css'; // Temel CSS sıfırlamalarının olduğu dosya (eğer varsa)

function App() {
  // Kullanıcının giriş yapıp yapmadığını kontrol eden basit bir fonksiyon
  // auth.js veya benzeri bir dosya
  const isAuthenticated = () => {
    const userId = localStorage.getItem('userId'); // Giriş yaparken sakladığın userId'ı kontrol et
    return !!userId; // userId varsa true, yoksa false döner
  };

  return (
    <Router> {/* Uygulamamızın yönlendirme mantığını başlatan ana bileşen */}
      <Routes> {/* Tanımladığımız tüm rotaları barındırır */}
        <Route path="/" element={<SignInPage />} /> {/* Ana yol ('/') için SignInPage'i göster */}
        {/*<Route path="/" element={<Navigate to="/signin" replace />} />*/}
        <Route path="/signin" element={<SignInPage />} /> {/* /signin yolu için SignInPage'i göster */}
        <Route path="/signup" element={<SignUpPage />} /> {/* /signup yolu için SignUpPage'i göster */}
        {/* Dashboard sayfasına erişimi kontrol ediyoruz */}
        {isAuthenticated() ? <Route
          path="/DashboardPage" element={<DashboardPage />}/>
        :
        <Route path="/" element={<SignInPage />}/>}
        {/* Varsayılan yönlendirme */}
        
      </Routes>
    </Router>

  );
}

export default App;

/*<Route
          path="/DashboardPage"
          element={isAuthenticated() ? <DashboardPage /> : <Navigate to="/signin" replace />}
          */