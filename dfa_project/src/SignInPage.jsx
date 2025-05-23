// src/SignInPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; // axios import ediyoruz
import { API_ENDPOINTS } from './config'; // config dosyasını import ediyoruz
import './SignInPage.css';

const SignInPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const userData = {
      email: email,
      password: password,
    };

    try {
      // API_ENDPOINTS.signIn kullanıyoruz
      const response = await axios.post(API_ENDPOINTS.signIn, userData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) { // Axios, response.ok yerine status kodu kullanır
        alert(response.data.message);
        // userId'yi localStorage'a kaydediyoruz (Dashboard'da kullanacağız)
        localStorage.setItem('userId', response.data.userId);
        navigate('/DashboardPage'); // Giriş başarılıysa dashboard'a yönlendir
      } else {
        alert(`Giriş başarısız: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Giriş isteği sırasında hata:', error);
      if (error.response) {
        // Backend'den gelen hata mesajı varsa göster
        alert(`Giriş başarısız: ${error.response.data.message}`);
      } else {
        alert('Sunucuya bağlanırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    }
  };

  return (
    <div className="login-container">
      {/* Sol Panel */}
      <div className="login-image-panel"></div>

      {/* Sağ Panel */}
      <div className="login-form-panel">
        <div className="login-card">
          <h2 className="login-title">Hesabınıza Giriş Yapın</h2>
          
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">E-posta Adresiniz</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="örnek@eposta.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Şifreniz</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Şifrenizi girin"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-button">
              Giriş Yap
            </button>
          </form>

          <div className="signup-link-container">
            <p>
              Hesabınız yok mu?{' '}
              <Link to="/signup" className="signup-link">
                Şimdi kaydolun!
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;