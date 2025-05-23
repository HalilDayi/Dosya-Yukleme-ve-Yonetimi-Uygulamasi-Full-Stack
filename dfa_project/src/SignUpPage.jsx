// src/SignUpPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; // axios import ediyoruz
import { API_ENDPOINTS } from './config'; // config dosyasını import ediyoruz
import './SignUpPage.css';

const SignUpPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      alert('Şifreler eşleşmiyor. Lütfen kontrol edin.');
      return;
    }

    const userData = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
    };

    try {
      // API_ENDPOINTS.signUp kullanıyoruz
      const response = await axios.post(API_ENDPOINTS.signUp, userData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 201) { // Axios, response.ok yerine status kodu kullanır
        alert(response.data.message);
        navigate('/signin'); 
      } else {
        alert(`Kayıt başarısız: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Kayıt isteği sırasında hata:', error);
      if (error.response) {
        alert(`Kayıt başarısız: ${error.response.data.message}`);
      } else {
        alert('Sunucuya bağlanırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    }
  };

  return (
    <div className="signup-container">
      {/* Sol Panel */}
      <div className="signup-image-panel"></div>

      {/* Sağ Panel */}
      <div className="signup-form-panel">
        <div className="signup-card">
          <h2 className="signup-title">Yeni Hesap Oluştur</h2>
          
          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="firstName">Adınız</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Adınızı girin"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="lastName">Soyadınız</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Soyadınızı girin"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

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
                placeholder="En az 6 karakter"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Şifrenizi Onaylayın</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Şifrenizi tekrar girin"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="signup-button">
              Kaydol
            </button>
          </form>

          <div className="signin-link-container">
            <p>
              Zaten bir hesabınız var mı?{' '}
              <Link to="/signin" className="signin-link">
                Giriş yapın
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;