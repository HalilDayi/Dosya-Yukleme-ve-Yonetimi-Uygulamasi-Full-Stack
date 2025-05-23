/*import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from './config';
import './DashboardPage.css';

const DashboardPage = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1); // Sayfa durumunu aktif ediyoruz
  const [totalPages, setTotalPages] = useState(1); // Toplam sayfa durumunu aktif ediyoruz
  const [totalFilesCount, setTotalFilesCount] = useState(0); // Toplam dosya sayısı durumu
  const filesPerPage = 10; // Her sayfada gösterilecek dosya sayısı

  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const fetchFiles = useCallback(async (page, limit) => { // Sayfalama parametreleri artık doğrudan kullanılıyor
    if (!userId) {
      console.log("Kullanıcı ID'si yok, giriş sayfasına yönlendiriliyor.");
      alert('Giriş yapmalısınız.');
      navigate('/signin');
      return;
    }

    try {
      // Backend'in beklentisine uygun olarak userId, page ve limit parametrelerini gönderiyoruz.
      const url = `${API_ENDPOINTS.listFiles}?userId=${userId}&page=${page}&limit=${limit}`;
      console.log("DEBUG: Dosyaları listeleme API çağrılıyor:", url);

      const response = await axios.get(url);

      console.log("DEBUG: API yanıtı (list-files):", response.data);

      // API yanıtının beklenen formatta olup olmadığını kontrol ediyoruz.
      // Backend'den beklediğimiz yapı: { files: [...], currentPage: X, totalPages: Y, totalFiles: Z }
      if (response.data && Array.isArray(response.data.files)) {
        setFiles(response.data.files);
        setTotalPages(response.data.totalPages); // totalPages'i set ediyoruz
        setCurrentPage(response.data.currentPage); // Gelen currentPage'i set ediyoruz
        setTotalFilesCount(response.data.totalFiles);

        console.log("DEBUG: Dosyalar başarıyla state'e aktarıldı. Gelen dosya sayısı:", response.data.files.length);
        if (response.data.files.length > 0) {
          console.log("DEBUG: İlk dosya adı:", response.data.files[0].file_name);
        }
        console.log("DEBUG: Toplam dosya sayısı:", response.data.totalFiles);

      } else {
        console.error("HATA: API yanıtında 'files' dizisi bulunamadı veya geçersiz formatta:", response.data);
        setFiles([]);
        setTotalPages(1);
        setCurrentPage(1);
        setTotalFilesCount(0);
      }

    } catch (error) {
      console.error('Dosyaları çekerken hata oluştu:', error);
      setFiles([]);
      setTotalPages(1);
      setCurrentPage(1);
      setTotalFilesCount(0);

      if (error.response && error.response.status === 401) {
        alert('Oturumunuz sona ermiş veya yetkisiz erişim. Lütfen tekrar giriş yapın.');
        localStorage.removeItem('userId');
        navigate('/signin');
      } else {
        alert('Dosyaları yüklerken bir sorun oluştu. Lütfen konsolu kontrol edin.');
      }
    }
  }, [userId, navigate]); // Bağımlılıklar güncellendi.

  useEffect(() => {
    // İlk yüklendiğinde ve sayfa değiştiğinde dosyaları çek
    fetchFiles(currentPage, filesPerPage);
  }, [fetchFiles, currentPage, filesPerPage]); // currentPage ve filesPerPage bağımlılık olarak eklendi

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Lütfen yüklenecek bir dosya seçin.');
      return;
    }
    if (!userId) {
      alert('Giriş yapmalısınız.');
      navigate('/signin');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userId', userId);

    try {
      const response = await axios.post(API_ENDPOINTS.uploadFile, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        alert(response.data.message);
        setSelectedFile(null);
        // Dosya yüklendikten sonra mevcut sayfayı tekrar çekiyoruz
        fetchFiles(currentPage, filesPerPage);
      } else {
        alert(`Yükleme başarısız: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Dosya yüklerken hata oluştu:', error);
      if (error.response) {
        alert(`Yükleme başarısız: ${error.response.data.message}`);
      } else {
        alert('Sunucuya bağlanırken bir sorun oluştu.');
      }
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) {
      return;
    }
    if (!userId) {
      alert('Giriş yapmalısınız.');
      navigate('/signin');
      return;
    }

    try {
      // userId'yi query parametresi olarak gönderiyoruz
      const response = await axios.delete(`${API_ENDPOINTS.deleteFile}/${fileId}?userId=${userId}`);

      if (response.status === 200) {
        alert(response.data.message);
        // Dosya silindikten sonra mevcut sayfayı tekrar çekiyoruz
        fetchFiles(currentPage, filesPerPage);
      } else {
        alert(`Silme başarısız: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Dosya silerken hata oluştu:', error);
      if (error.response) {
        alert(`Silme başarısız: ${error.response.data.message}`);
      } else {
        alert('Sunucuya bağlanırken bir sorun oluştu.');
      }
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1); // Sayfa numarasını güncelliyoruz
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1); // Sayfa numarasını güncelliyoruz
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    navigate('/signin');
  };

  return (
    <div className="dashboard-wrapper">
      <button className="logout-button" onClick={handleLogout}>
        Çıkış Yap
      </button>

      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Dosyalarım</h1>
        </header>

        <div className="controls-section">
          <div className="file-upload-section">
            <label htmlFor="file-upload" className="file-input-label">
              Dosya Seç
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="file-input"
              />
            </label>
            <button
              onClick={handleUpload}
              className="upload-button"
              disabled={!selectedFile}
            >
              Dosya Yükle
            </button>
          </div>
        </div>

        {/* Toplam dosya sayısı bilgisini göster /}
        /*<p className="total-files-info">
          Toplam **{totalFilesCount}** dosyanız bulunmaktadır.
        </p>

        <div className="file-list-section">
          {files.length === 0 ? (
            <p className="no-files-message">
              Henüz yüklediğiniz bir dosya bulunmamaktadır. İlk dosyanızı yüklemek
              için "Dosya Yükle" butonunu kullanın.
            </p>
          ) : (
            <ul className="file-list">
              {files.map((file) => (
                <li key={file.id} className="file-item">
                  <span className="file-name">{file.file_name}</span>
                  <span className="file-size">
                    ({(file.file_size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  {<a
                    href={file.public_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-link"
                  >
                    Görüntüle/İndir
                  </a>}
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="delete-button"
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

       /* {/* Sayfalama Kontrolleri *}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button onClick={handlePreviousPage} disabled={currentPage === 1}>
              Önceki
            </button>
            <span>
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
*/

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from './config';
import './DashboardPage.css';

const DashboardPage = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState(''); // Seçilen dosyanın adını tutmak için yeni state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const filesPerPage = 5; // Sayfa başına dosya sayısı 5 olarak güncellendi

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const fetchFiles = useCallback(async (page, limit, query = '') => {
    if (!userId) {
      console.log("Kullanıcı ID'si yok, giriş sayfasına yönlendiriliyor.");
      alert('Giriş yapmalısınız.');
      navigate('/signin');
      return;
    }

    try {
      let url;
      if (query) {
        url = `${API_ENDPOINTS.searchFiles}?userId=${userId}&page=${page}&limit=${limit}&query=${query}`;
        console.log("DEBUG: Dosya arama API çağrılıyor:", url);
      } else {
        url = `${API_ENDPOINTS.listFiles}?userId=${userId}&page=${page}&limit=${limit}`;
        console.log("DEBUG: Dosyaları listeleme API çağrılıyor:", url);
      }

      const response = await axios.get(url);

      console.log("DEBUG: API yanıtı:", response.data);

      if (response.data && Array.isArray(response.data.files)) {
        setFiles(response.data.files);
        setTotalPages(response.data.totalPages);
        setCurrentPage(response.data.currentPage);
        setTotalFilesCount(response.data.totalFiles);

        console.log("DEBUG: Dosyalar başarıyla state'e aktarıldı. Gelen dosya sayısı:", response.data.files.length);
        if (response.data.files.length > 0) {
          console.log("DEBUG: İlk dosya adı:", response.data.files[0].file_name);
        }
        console.log("DEBUG: Toplam dosya sayısı:", response.data.totalFiles);

      } else {
        console.error("HATA: API yanıtında 'files' dizisi bulunamadı veya geçersiz formatta:", response.data);
        setFiles([]);
        setTotalPages(1);
        setCurrentPage(1);
        setTotalFilesCount(0);
      }

    } catch (error) {
      console.error('Dosyaları çekerken hata oluştu:', error);
      setFiles([]);
      setTotalPages(1);
      setCurrentPage(1);
      setTotalFilesCount(0);

      if (error.response && error.response.status === 401) {
        alert('Oturumunuz sona ermiş veya yetkisiz erişim. Lütfen tekrar giriş yapın.');
        localStorage.removeItem('userId');
        navigate('/signin');
      } else {
        alert('Dosyaları yüklerken bir sorun oluştu. Lütfen konsolu kontrol edin.');
      }
    }
  }, [userId, navigate]);

  useEffect(() => {
    fetchFiles(currentPage, filesPerPage, activeSearchQuery);
  }, [fetchFiles, currentPage, filesPerPage, activeSearchQuery]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setSelectedFileName(file ? file.name : ''); // Dosya adı state'ini güncelle
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Lütfen yüklenecek bir dosya seçin.');
      return;
    }
    if (!userId) {
      alert('Giriş yapmalısınız.');
      navigate('/signin');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userId', userId);

    try {
      const response = await axios.post(API_ENDPOINTS.uploadFile, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        alert(response.data.message);
        setSelectedFile(null);
        setSelectedFileName(''); // Dosya adı state'ini temizle
        fetchFiles(currentPage, filesPerPage, activeSearchQuery);
      } else {
        alert(`Yükleme başarısız: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Dosya yüklerken hata oluştu:', error);
      if (error.response) {
        alert(`Yükleme başarısız: ${error.response.data.message}`);
      } else {
        alert('Sunucuya bağlanırken bir sorun oluştu.');
      }
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) {
      return;
    }
    if (!userId) {
      alert('Giriş yapmalısınız.');
      navigate('/signin');
      return;
    }

    try {
      const response = await axios.delete(`${API_ENDPOINTS.deleteFile}/${fileId}?userId=${userId}`);

      if (response.status === 200) {
        alert(response.data.message);
        fetchFiles(currentPage, filesPerPage, activeSearchQuery);
      } else {
        alert(`Silme başarısız: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Dosya silerken hata oluştu:', error);
      if (error.response) {
        alert(`Silme başarısız: ${error.response.data.message}`);
      } else {
        alert('Sunucuya bağlanırken bir sorun oluştu.');
      }
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    navigate('/signin');
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = () => {
    setActiveSearchQuery(searchQuery);
    setCurrentPage(1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  return (
    <div className="dashboard-wrapper">
      <button className="logout-button" onClick={handleLogout}>
        Çıkış Yap
      </button>

      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Dosyalarım</h1>
        </header>

        <div className="controls-section">
          {/* Arama çubuğu ve butonu */}
          <div className="search-and-button-container">
            <input
              type="text"
              placeholder="Dosya adına göre ara..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              className="search-input"
            />
            <button onClick={handleSearchSubmit} className="search-button">
              Ara
            </button>
          </div>

          {/* Dosya yükleme bölümü */}
          <div className="file-upload-section">
            <label htmlFor="file-upload" className="file-input-label">
              Dosya Seç
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="file-input"
              />
            </label>
            {selectedFileName && ( // Seçilen dosya adı varsa göster
              <span className="selected-file-name">
                {selectedFileName.length > 25 ? `${selectedFileName.substring(0, 22)}...` : selectedFileName}
              </span>
            )}
            <button
              onClick={handleUpload}
              className="upload-button"
              disabled={!selectedFile}
            >
              Dosya Yükle
            </button>
          </div>
        </div>

        <p className="total-files-info">
          Toplam **{totalFilesCount}** dosyanız bulunmaktadır.
        </p>

        <div className="file-list-section">
          {files.length === 0 ? (
            <p className="no-files-message">
              {activeSearchQuery ? `"${activeSearchQuery}" için dosya bulunamadı.` : 'Henüz yüklediğiniz bir dosya bulunmamaktadır. İlk dosyanızı yüklemek için "Dosya Yükle" butonunu kullanın.'}
            </p>
          ) : (
            <ul className="file-list">
              {files.map((file) => (
                <li key={file.id} className="file-item">
                  <span className="file-name">{file.file_name}</span>
                  <span className="file-size">
                    ({(file.file_size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <a
                    href={file.public_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-link"
                  >
                    Görüntüle/İndir
                  </a>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="delete-button"
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button onClick={handlePreviousPage} disabled={currentPage === 1}>
              Önceki
            </button>
            <span>
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;


