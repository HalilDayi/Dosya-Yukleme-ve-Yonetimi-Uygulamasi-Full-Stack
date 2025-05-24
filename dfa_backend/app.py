import os
import json
from flask import Flask, request, jsonify, Response # Response import edildi
from flask_cors import CORS
from dotenv import load_dotenv
import psycopg2
import uuid
from werkzeug.security import generate_password_hash, check_password_hash # Şifre hashleme için eklendi
from supabase import create_client, Client # Supabase client için eklendi
from functools import wraps

# Ortam değişkenlerini .env dosyasından yükle
load_dotenv()

app = Flask(__name__)
CORS(app) # Tüm rotalar için CORS'u etkinleştir

# Supabase Veritabanı Bağlantı Bilgileri
DB_HOST = os.getenv("SUPABASE_DB_HOST")
DB_NAME = os.getenv("SUPABASE_DB_NAME")
DB_USER = os.getenv("SUPABASE_DB_USER")
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")
DB_PORT = os.getenv("SUPABASE_DB_PORT")

# Supabase API Anahtarları (Dosya yükleme/silme için)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME") # Supabase storage bucket adınız

# Supabase client'ı başlat
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Veritabanı Bağlantı Fonksiyonu
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            # SSL modunu 'require' veya 'prefer' olarak ayarlayabilirsiniz.
            # Supabase genellikle SSL kullanır.
            # DİKKAT: Eğer yerel geliştirme için SSL sorunları yaşarsanız bu satırı yorum satırı yapın.
            sslmode='require' 
        )
        return conn
    except Exception as e:
        print(f"Veritabanı bağlantı hatası: {e}")
        return None


def validate_user_id(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # user_id'yi URL sorgu parametrelerinden veya form verisinden almayı deneyin
        user_id = request.args.get('userId') or request.form.get('userId')

        if not user_id:
            return jsonify({"message": "Kullanıcı ID'si eksik. Lütfen 'userId' parametresini gönderin."}), 400

        return f(user_id=user_id, *args, **kwargs)
    return decorated_function

# --- API Yönlendirmeleri (API Endpoints) ---

@app.route('/signin', methods=['POST'])
def sign_in():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "E-posta ve şifre gerekli!"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"message": "Veritabanı bağlantı hatası!"}), 500

    try:
        cur = conn.cursor()
        cur.execute("SELECT id, email, password_hash FROM users WHERE email = %s;", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user:
            user_id, stored_email, hashed_password_from_db = user

            # check_password_hash string bekler, bu yüzden bytes ise decode et
            if isinstance(hashed_password_from_db, bytes):
                hashed_password_from_db = hashed_password_from_db.decode('utf-8')

            if check_password_hash(hashed_password_from_db, password):
                return jsonify({"message": "Giriş başarılı!", "userId": str(user_id)}), 200
            else:
                return jsonify({"message": "Geçersiz e-posta veya şifre!"}), 401
        else:
            return jsonify({"message": "Geçersiz e-posta veya şifre!"}), 401
    except Exception as e:
        print(f"Giriş sırasında hata: {e}")
        return jsonify({"message": "Sunucu hatası!"}), 500

@app.route('/signup', methods=['POST'])
def sign_up():
    data = request.get_json()
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    email = data.get('email')
    password = data.get('password')

    if not all([first_name, last_name, email, password]):
        return jsonify({"message": "Tüm alanlar gerekli!"}), 400

    # Şifreyi hash'le
    hashed_password = generate_password_hash(password)

    conn = get_db_connection()
    if conn is None:
        return jsonify({"message": "Veritabanı bağlantı hatası!"}), 500

    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"message": "Bu e-posta adresi zaten kayıtlı!"}), 409

        cur.execute(
            "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (%s, %s, %s, %s) RETURNING id;",
            (first_name, last_name, email, hashed_password)
        )
        new_user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Kayıt başarılı! Lütfen giriş yapın.", "userId": str(new_user_id)}), 201
    except Exception as e:
        conn.rollback()
        print(f"Kayıt sırasında hata: {e}")
        return jsonify({"message": "Sunucu hatası!"}), 500



@app.route('/upload-file', methods=['POST'])
@validate_user_id
def upload_file(user_id):
    print(f"DEBUG: /upload-file çağrıldı. user_id: {user_id}")

    if 'file' not in request.files:
        print("DEBUG: 'file' anahtarı request.files içinde bulunamadı.")
        return jsonify({"message": "Dosya bulunamadı!"}), 400

    file = request.files['file']
    if file.filename == '':
        print("DEBUG: Dosya adı boş.")
        return jsonify({"message": "Dosya seçilmedi!"}), 400

    try:
        original_name = file.filename
        mime_type = file.content_type

        # Dosyanın içeriğini oku ve boyutunu al.
        # Bu, dosyanın gerçek boyutunu en güvenilir şekilde verir.
        file_contents = file.read()
        size_bytes = len(file_contents)

        # Supabase'e yüklemeden önce dosya imlecini başa döndürmeye gerek yok,
        # çünkü 'file_contents' (bytes) doğrudan upload metoduna gönderiliyor.
        # Eğer 'file' objesini tekrar okuyacak başka bir işlem olsaydı file.seek(0) gerekli olurdu.

        file_extension = os.path.splitext(original_name)[1]
        stored_name = f"{uuid.uuid4()}{file_extension}"
        storage_path = f"{SUPABASE_BUCKET_NAME}/{user_id}/{stored_name}"

        print(f"DEBUG: Dosya bilgileri: Original='{original_name}', MIME='{mime_type}', Size={size_bytes} bytes, Stored='{stored_name}'")
        print(f"DEBUG: Supabase storage path: {storage_path}")

        # Supabase Storage'a yükleme
        response_upload = supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
            storage_path,
            file_contents, # Okunmuş dosya içeriğini (bytes) gönderiyoruz
            {
                "content-type": mime_type,
                "x-upsert": "true"
            }
        )
        print(f"DEBUG: Supabase upload yanıtı: {response_upload}")

        # Public URL'yi al
        public_url_response = supabase.storage.from_(SUPABASE_BUCKET_NAME).get_public_url(storage_path)
        print(f"DEBUG: Supabase public URL yanıtı: {public_url_response}")

        public_url = None
        if isinstance(public_url_response, str):
            public_url = public_url_response
        elif public_url_response and hasattr(public_url_response, 'data') and public_url_response.data and 'publicUrl' in public_url_response.data:
            public_url = public_url_response.data.get('publicUrl')
        else:
            print(f"HATA: get_public_url'den beklenmeyen yanıt tipi veya formatı: {public_url_response}")

        if not public_url:
            print("HATA: Public URL alınamadı. Supabase bucket ayarlarını (public mi?) veya API anahtarlarını kontrol edin.")
            return jsonify({"message": "Dosya yüklendi ancak genel URL oluşturulamadı. Lütfen bucket ayarlarını kontrol edin."}), 500

        # Veritabanı bağlantısı ve kaydı
        conn = get_db_connection()
        if conn is None:
            print("HATA: Veritabanı bağlantısı kurulamadı (upload-file).")
            return jsonify({"message": "Veritabanı bağlantı hatası!"}), 500

        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO files (user_id, original_name, stored_name, size_bytes, mime_type, public_url, uploaded_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW()) RETURNING id;
            """,
            (user_id, original_name, stored_name, size_bytes, mime_type, public_url)
        )
        new_file_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        print(f"DEBUG: Dosya veritabanına kaydedildi. ID: {new_file_id}")
        return jsonify({"message": "Dosya başarıyla yüklendi!", "fileId": str(new_file_id), "publicUrl": public_url}), 201

    except Exception as e:
        print(f"HATA: Dosya yükleme sırasında genel hata: {e}", exc_info=True)
        return jsonify({"message": f"Dosya yüklenirken beklenmeyen bir hata oluştu: {e}"}), 500




@app.route('/list-files', methods=['GET'])
@validate_user_id
def list_files(user_id):
    # validate_user_id dekoratörü user_id'yi zaten parametre olarak f'e iletiyor
    # Bu yüzden buradaki if not user_id kontrolü gereksiz, dekoratör hallediyor.
    # if not user_id:
    #     return jsonify({"message": "Kullanıcı ID'si eksik. Lütfen 'userId' parametresini gönderin."}), 400

    print(f"DEBUG: list-files çağrıldı, user_id: {user_id}, args: {request.args}")

    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit

    conn = get_db_connection()
    if conn is None:
        return jsonify({"message": "Veritabanı bağlantı hatası!"}), 500

    try:
        cur = conn.cursor()

        # Toplam dosya sayısını sadece user_id'ye göre al
        count_query = "SELECT COUNT(*) FROM files WHERE user_id = %s"
        count_params = [user_id]

        cur.execute(count_query, tuple(count_params))
        total_files = cur.fetchone()[0]
        print(f"DEBUG: Kullanıcının toplam dosya sayısı: {total_files}")

        # Sayfalama ile dosyaları çek
        # public_url sütunu SELECT sorgusuna EKLENDİ
        files_query = """
            SELECT id, original_name, size_bytes, stored_name, uploaded_at, mime_type, public_url
            FROM files
            WHERE user_id = %s
            ORDER BY uploaded_at DESC LIMIT %s OFFSET %s;
        """
        files_params = [user_id, limit, offset]

        cur.execute(files_query, tuple(files_params))
        files_data = cur.fetchall()
        cur.close()
        conn.close()

        files_list = []
        for file in files_data:
            # Buradaki sıralama, yukarıdaki SELECT sorgunuzdaki sütun sırasıyla aynı olmalı.
            # public_url_from_db değişkeni buraya EKLENDİ
            file_id, original_name, size_bytes, stored_name_from_db, uploaded_at, mime_type, public_url_from_db = file

            # NOT: Eğer `public_url` zaten veritabanında varsa, Supabase'den tekrar almaya gerek yok.
            # public_url'i doğrudan veritabanından alıyoruz
            final_public_url = public_url_from_db

            files_list.append({
                "id": str(file_id),
                "file_name": original_name,
                "file_size": size_bytes,
                "public_url": final_public_url, # public_url kullanılıyor
                "uploaded_at": uploaded_at.isoformat(),
                "content_type": mime_type
            })

        total_pages = (total_files + limit - 1) // limit if total_files > 0 else 1

        return jsonify({
            "message": "Dosyalar başarıyla listelendi.",
            "files": files_list,
            "currentPage": page,
            "totalPages": total_pages,
            "totalFiles": total_files
        }), 200
    except Exception as e:
        print(f"Dosya listeleme hatası: {e}")
        return jsonify({"message": f"Dosyalar listelenirken beklenmeyen bir hata oluştu: {e}"}), 500
    


@app.route('/delete-file/<uuid:file_id>', methods=['DELETE'])
@validate_user_id
def delete_file(file_id, user_id):
    # Debug mesajı ekleyelim
    print(f"DEBUG: delete_file çağrıldı. file_id: {file_id}, user_id: {user_id}")
    print(f"DEBUG: file_id tipi: {type(file_id)}") # Tipini kontrol edelim

    conn = get_db_connection()
    if conn is None:
        print("HATA: Veritabanı bağlantı hatası (delete-file).")
        return jsonify({"message": "Veritabanı bağlantı hatası!"}), 500

    try:
        cur = conn.cursor()

        # file_id'yi veritabanına göndermeden önce string'e çeviriyoruz
        file_id_str = str(file_id)
        print(f"DEBUG: file_id (string): {file_id_str}")

        # 'files' tablosunu kullanıyoruz.
        cur.execute(
            "SELECT stored_name FROM files WHERE id = %s AND user_id = %s;",
            (file_id_str, user_id) # Buradaki file_id'yi string olarak gönderdik
        )
        file_info = cur.fetchone()

        if not file_info:
            cur.close()
            conn.close()
            print(f"UYARI: Dosya bulunamadı veya yetki yok. file_id: {file_id_str}, user_id: {user_id}")
            return jsonify({"message": "Dosya bulunamadı veya bu dosyayı silmeye yetkiniz yok!"}), 404

        stored_name_to_delete = file_info[0]
        storage_path_to_delete = f"{SUPABASE_BUCKET_NAME}/{user_id}/{stored_name_to_delete}"
        print(f"DEBUG: Supabase'den silinecek yol: {storage_path_to_delete}")

        # Supabase Storage'dan silme
        # `remove` methodu bir liste bekler.
        delete_response = supabase.storage.from_(SUPABASE_BUCKET_NAME).remove([storage_path_to_delete])
        print(f"DEBUG: Supabase remove yanıtı: {delete_response}")

        # Supabase storage'dan silme başarılı ise veritabanından kaydı sil
        cur.execute("DELETE FROM files WHERE id = %s AND user_id = %s;", (file_id_str, user_id)) # Buradaki file_id'yi de string olarak gönderdik
        conn.commit()
        cur.close()
        conn.close()

        print(f"DEBUG: Dosya hem Supabase Storage'dan hem de veritabanından başarıyla silindi. File ID: {file_id_str}")
        return jsonify({"message": "Dosya başarıyla silindi!"}), 200

    except Exception as e:
        conn.rollback() # Hata durumunda veritabanı işlemini geri al
        print(f"HATA: Dosya silme sırasında genel hata: {e}", exc_info=True) # exc_info=True ile traceback'i bas
        return jsonify({"message": f"Dosya silinirken beklenmeyen bir hata oluştu: {e}"}), 500

@app.route('/files/search', methods=['GET'])
@validate_user_id
def search_files(user_id):
    query = request.args.get('query', '')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))

    offset = (page - 1) * limit
    search_pattern = f"%{query}%"

    conn = get_db_connection()
    if conn is None:
        return jsonify({"message": "Veritabanı bağlantı hatası!"}), 500

    try:
        cur = conn.cursor()
        # 'files' tablosunu kullanıyoruz, 'user_files' değil.
        cur.execute(
            "SELECT COUNT(*) FROM files WHERE user_id = %s AND original_name ILIKE %s;", # original_name'e göre arama
            (user_id, search_pattern)
        )
        total_files = cur.fetchone()[0]

        cur.execute(
            """
            SELECT id, original_name, size_bytes, stored_name, uploaded_at, mime_type, public_url
            FROM files
            WHERE user_id = %s AND original_name ILIKE %s
            ORDER BY uploaded_at DESC
            LIMIT %s OFFSET %s;
            """,
            (user_id, search_pattern, limit, offset)
        )
        files_data = cur.fetchall()
        cur.close()
        conn.close()

        files_list = []
        for file in files_data:
            file_id, original_name, size_bytes, stored_name, uploaded_at, mime_type, public_url_from_db = file
            
            # Public URL zaten veritabanında var, tekrar çekmeye gerek yok
            final_public_url = public_url_from_db
            
            files_list.append({
                "id": str(file_id),
                "file_name": original_name,
                "file_size": size_bytes,
                "public_url": final_public_url,
                "uploaded_at": uploaded_at.isoformat(),
                "content_type": mime_type
            })

        total_pages = (total_files + limit - 1) // limit if total_files > 0 else 1

        return jsonify({
            "message": "Arama sonuçları başarıyla listelendi.",
            "files": files_list,
            "currentPage": page,
            "totalPages": total_pages,
            "totalFiles": total_files
        }), 200
    except Exception as e:
        print(f"Dosya arama hatası: {e}")
        return jsonify({"message": "Dosyalar aranırken bir hata oluştu."}), 500



@app.route('/download-file/<uuid:file_id>', methods=['GET'])
@validate_user_id
def download_file(file_id, user_id):
    print(f"DEBUG: download_file çağrıldı. file_id: {file_id}, user_id: {user_id}")
    print(f"DEBUG: file_id tipi: {type(file_id)}") # Tipini kontrol edelim

    conn = get_db_connection()
    if conn is None:
        print("HATA: Veritabanı bağlantı hatası (download-file).")
        return jsonify({"message": "Veritabanı bağlantı hatası!"}), 500

    try:
        cur = conn.cursor()
        # file_id'yi veritabanına göndermeden önce string'e çeviriyoruz
        file_id_str = str(file_id)
        print(f"DEBUG: file_id (string): {file_id_str}")

        cur.execute(
            "SELECT stored_name, original_name, mime_type, public_url FROM files WHERE id = %s AND user_id = %s;",
            (file_id_str, user_id) # file_id'yi string olarak gönderdik
        )
        file_info = cur.fetchone()
        cur.close()
        conn.close()

        if not file_info:
            print(f"UYARI: Dosya bulunamadı veya yetki yok. file_id: {file_id_str}, user_id: {user_id}")
            return jsonify({"message": "Dosya bulunamadı veya yetkiniz yok!"}), 404

        stored_name_to_download, original_filename, content_type, public_url_from_db = file_info
        
        # Eğer zaten bir public_url varsa, doğrudan ona yönlendirmek daha verimli olabilir
        if public_url_from_db:
            print(f"DEBUG: Dosyanın zaten public URL'si var: {public_url_from_db}. Yönlendiriliyor...")
            # Supabase'den indirmek yerine doğrudan public URL'ye yönlendirme yapabiliriz.
            # Ancak tarayıcı doğrudan URL'ye gitmeli.
            # Eğer frontend'de <a> etiketi zaten public_url'i kullanıyorsa,
            # bu endpoint'e gerek kalmayabilir veya bu endpoint sadece "indir" butonu için kullanılır.
            # Şimdilik mevcut mantığı koruyarak devam edelim.
            # Flask redirect kullanmak yerine, tarayıcının kendi URL'yi açmasını bekliyoruz.
            pass # Bu durumda indirme mantığına devam et

        storage_path = f"{SUPABASE_BUCKET_NAME}/{user_id}/{stored_name_to_download}"
        print(f"DEBUG: Supabase Storage'dan indirilecek yol: {storage_path}")

        # Supabase Storage'dan dosyayı indir
        file_data_response = supabase.storage.from_(SUPABASE_BUCKET_NAME).download(storage_path)
        print(f"DEBUG: Supabase download yanıtı tipi: {type(file_data_response)}") # Yanıtın tipini kontrol edelim

        # Supabase download methodu genellikle doğrudan bytes objesini döndürür.
        # Hata durumunda bir Exception fırlatması beklenir.
        if isinstance(file_data_response, bytes):
            print(f"DEBUG: Dosya içeriği başarıyla alındı. Boyut: {len(file_data_response)} bayt.")
            return Response(
                file_data_response, # Supabase download doğrudan dosya içeriği (bytes) döner
                mimetype=content_type,
                headers={
                    "Content-Disposition": f"attachment; filename=\"{original_filename}\"",
                    "X-Content-Type-Options": "nosniff" # Tarayıcıların MIME type snifing yapmasını engeller
                }
            )
        else:
            # Eğer bytes objesi değilse veya hata içeriyorsa
            print(f"HATA: Supabase Storage indirme beklenmeyen yanıt tipi: {file_data_response}")
            # Supabase istemcisi hata durumunda genellikle Exception fırlatır,
            # ama eğer burada özel bir obje dönüyorsa debug için faydalı.
            return jsonify({"message": "Dosya indirilirken bir hata oluştu (Storage)."}), 500

    except Exception as e:
        print(f"HATA: Dosya indirme sırasında genel hata: {e}", exc_info=True)
        return jsonify({"message": "Dosya indirilirken beklenmeyen bir hata oluştu."}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
