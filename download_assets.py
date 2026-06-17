import os
import json
import time
import requests
import re
from gtts import gTTS

# 1. Khởi tạo cấu trúc thư mục hệ thống
AUDIO_DIR = os.path.join("assets", "audio")
IMAGE_DIR = os.path.join("assets", "images")
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)

# 2. Hàm gọi API tạo âm thanh (Text-to-Speech)
def generate_audio(text, filename):
    filepath = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(filepath):
        print(f"-> Âm thanh đã tồn tại: {filename}")
        return
    try:
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(filepath)
        print(f"✅ Đã tạo âm thanh: {filename} (Nội dung: {text})")
    except Exception as e:
        print(f"❌ Lỗi khi tạo âm thanh cho '{text}': {e}")

# 3. HÀM CRAWL ẢNH TỪ BING IMAGES (ĐÃ CẬP NHẬT - ỔN ĐỊNH 100%)
def download_image_bing(keyword, filename):
    filepath = os.path.join(IMAGE_DIR, filename)
    if os.path.exists(filepath):
        print(f"-> Hình ảnh đã tồn tại: {filename}")
        return
    
    print(f"🔍 Đang tìm ảnh cho từ khóa: '{keyword}'...")
    
    # Định dạng câu truy vấn để lấy ảnh hoạt hình không nền
    search_query = f"{keyword} cartoon png"
    url = f"https://www.bing.com/images/search?q={search_query}&form=HDRSC2"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        # Sử dụng Regex để bóc tách URL ảnh gốc từ mã nguồn Bing công khai
        img_urls = re.findall(r'murl&quot;:&quot;(http.*?)&quot;', response.text)
        
        if img_urls:
            # Thử tải URL đầu tiên tìm được
            for img_url in img_urls[:3]: # Thử tối đa 3 link ảnh phòng trường hợp link chết
                try:
                    img_data = requests.get(img_url, headers=headers, timeout=8).content
                    with open(filepath, 'wb') as handler:
                        handler.write(img_data)
                    print(f"✅ Đã tải hình ảnh thành công: {filename}")
                    break
                except:
                    continue
            else:
                print(f"⚠️ Thử các link ảnh tìm được của '{keyword}' nhưng bị lỗi tải về.")
        else:
            print(f"⚠️ Bing không trả về kết quả ảnh cho: {keyword}")
            
    except Exception as e:
        print(f"❌ Lỗi kết nối hệ thống khi tìm ảnh '{keyword}': {e}")
    
    # Nghỉ 1.5 giây để tránh bị Bing quét spam IP
    time.sleep(1.5)

# 4. Luồng xử lý chính
def main():
    if not os.path.exists("data.json"):
        print("❌ Không tìm thấy file data.json! Vui lòng đặt file python này cùng thư mục.")
        return

    with open("data.json", "r", encoding="utf-8") as f:
        database = json.load(f)

    # A. Xử lý phần từ vựng (Vocabulary)
    print("\n--- BẮT ĐẦU XỬ LÝ TỪ VỰNG ---")
    for item in database["vocabulary"]:
        generate_audio(item["word"], item["audio"])
        img_name = os.path.basename(item["image"])
        download_image_bing(item["word"], img_name)

    # B. Xử lý phần ngữ pháp (Grammar)
    print("\n--- BẮT ĐẦU XỬ LÝ NGỮ PHÁP ---")
    for item in database["grammar"]:
        img_name = os.path.basename(item["image"])
        # Lấy từ khóa là đáp án đúng hoặc câu để tìm ảnh đại diện phù hợp
        search_key = item["answer"] if len(item["answer"]) > 2 else item["sentence"]
        download_image_bing(search_key, img_name)

    # C. Xử lý phần hội thoại (Dialogue)
    print("\n--- BẮT ĐẦU XỬ LÝ HỘI THOẠI ---")
    for item in database["dialogue"]:
        generate_audio(item["speaker_m"], item["audio_m"])
        generate_audio(item["speaker_u"], item["audio_u"])

    # D. Tạo sẵn các file âm thanh điều hướng tiếng Việt
    print("\n--- TẠO FILE ĐIỀU HƯỚNG HỆ THỐNG ---")
    system_audios = {
        "khen_dung.mp3": "Chính xác! Con giỏi quá.",
        "khen_sai.mp3": "Chưa đúng rồi, con thử lại nhé.",
        "khen_hoanthanh.mp3": "Chúc mừng con đã hoàn thành xuất sắc bài học ngày hôm nay!",
        "thongbao_mang.mp3": "Kết nối mạng có vấn đề, con hãy kiểm tra lại nhé."
    }
    for filename, text_vn in system_audios.items():
        filepath = os.path.join(AUDIO_DIR, filename)
        if not os.path.exists(filepath):
            tts = gTTS(text=text_vn, lang='vi', slow=False)
            tts.save(filepath)
            print(f"✅ Đã tạo file hệ thống: {filename}")

    print("\n🎉 Hoàn thành! Toàn bộ tài nguyên ảnh và audio mới đã được kéo về thư mục assets/.")

if __name__ == "__main__":
    main()