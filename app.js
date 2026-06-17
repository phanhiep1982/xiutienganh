class EducationalGameEngine {
    constructor() {
        this.data = null;
        this.gameFlow = []; // Mảng chứa tuần tự cấu trúc kịch bản các vòng chơi
        this.currentIndex = 0;
        this.speechAttempts = 0;
        this.recognition = null;
        this.currentSpellingAnswer = "";
        this.currentSpellingInput = [];
        this.audioPath = "assets/audio/";
    }

    // Đọc cơ sở dữ liệu độc lập
    async initGame() {
        try {
            const response = await fetch('data.json');
            this.data = await response.json();
            this.setupWebSpeech();
            this.buildGameFlow();
            this.showScreen('screen-quiz');
            this.executeChallenge();
        } catch (error) {
            console.error("Lỗi khởi tạo dữ liệu hệ thống:", error);
            alert("Không thể tải tệp tin cấu hình data.json!");
        }
    }

    // Thiết lập Web Speech API
    setupWebSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
        } else {
            console.warn("Hệ thống Web Speech API không hỗ trợ trình duyệt này.");
        }
    }

    // Phát âm thanh an toàn từ thư mục assets
    playAudio(fileName) {
        const audio = new Audio(`${this.audioPath}${fileName}`);
        audio.play().catch(e => console.log("Chờ tương tác người dùng để phát âm thanh: " + fileName));
    }

    // Tiện ích xáo trộn mảng ngẫu nhiên
    shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    // KỊCH BẢN 5 VÒNG CHƠI KHÉP KÍN
    buildGameFlow() {
        // Trộn ngẫu nhiên dữ liệu gốc đầu vào để cá nhân hóa lượt chơi
        const vocabShuffled = this.shuffle([...this.data.vocabulary]);
        const grammarShuffled = this.shuffle([...this.data.grammar]);
        const dialogueShuffled = this.shuffle([...this.data.dialogue]);

        // VÒNG 1: TRẮC NGHIỆM HÌNH ẢNH (Bốc 3 từ ngẫu nhiên)
        vocabShuffled.slice(0, 3).forEach(v => {
            this.gameFlow.push({ round: 1, type: 'quiz', data: v });
        });

        // VÒNG 1.5: THỬ THÁCH SẮP XẾP CHỮ (Bốc 2 từ ngẫu nhiên)
        vocabShuffled.slice(3, 5).forEach(v => {
            this.gameFlow.push({ round: 1.5, type: 'spelling', data: v });
        });

        // VÒNG 2: BÉ TẬP PHÁT ÂM (Bốc 2 từ ngẫu nhiên)
        vocabShuffled.slice(5, 7).forEach(v => {
            this.gameFlow.push({ round: 2, type: 'speaking', data: v });
        });

        // VÒNG 2.5: TRẮC NGHIỆM ĐIỀN KHUYẾT (Lấy 2 câu cấu trúc ngữ pháp)
        grammarShuffled.slice(0, 2).forEach(g => {
            this.gameFlow.push({ round: 2.5, type: 'cloze', data: g });
        });

        // VÒNG 3: ĐÓNG VAI ĐỐI THOẠI (Lấy 1 phân cảnh đối thoại)
        dialogueShuffled.slice(0, 1).forEach(d => {
            this.gameFlow.push({ round: 3, type: 'dialogue', data: d });
        });
    }

    // ĐIỀU HƯỚNG VÒNG CHƠI (GAME FLOW LOGIC)
    executeChallenge() {
        if (this.currentIndex >= this.gameFlow.length) {
            this.showScreen('screen-end');
            this.playAudio('khen_hoanthanh.mp3');
            return;
        }

        const current = this.gameFlow[this.currentIndex];
        this.updateProgress();

        // Tái lập trạng thái ẩn hiện cấu trúc HTML
        document.getElementById('cloze-text').style.display = 'none';
        document.getElementById('quiz-img').style.display = 'block';
        document.getElementById('skip-speaking').style.display = 'none';
        this.speechAttempts = 0;

        switch (current.type) {
            case 'quiz':
                this.showScreen('screen-quiz');
                this.renderQuiz(current.data);
                break;
            case 'spelling':
                this.showScreen('screen-spelling');
                this.renderSpelling(current.data);
                break;
            case 'speaking':
                this.showScreen('screen-speaking');
                this.renderSpeaking(current.data);
                break;
            case 'cloze':
                this.showScreen('screen-quiz'); // Dùng chung giao diện trắc nghiệm tối ưu diện tích màn hình
                this.renderCloze(current.data);
                break;
            case 'dialogue':
                this.showScreen('screen-dialogue');
                this.renderDialogue(current.data);
                break;
        }
    }

    // VÒNG 1: TRẮC NGHIỆM HÌNH ẢNH
    renderQuiz(item) {
        document.getElementById('quiz-heading').innerText = "Vòng 1: Trắc nghiệm hình ảnh";
        document.getElementById('quiz-img').src = item.image;
        this.playAudio(item.audio);

        const options = this.generateDistractors(item.word, 'vocabulary', 'word');
        this.renderOptionButtons(options, item.word);
    }

    // VÒNG 2.5: TRẮC NGHIỆM ĐIỀN KHUYẾT
    renderCloze(item) {
        document.getElementById('quiz-heading').innerText = "Vòng 2.5: Trắc nghiệm điền khuyết";
        document.getElementById('quiz-img').style.display = 'none';
        const textEl = document.getElementById('cloze-text');
        textEl.style.display = 'block';
        textEl.innerText = item.blank_sentence;

        const options = this.shuffle([item.answer, ...item.distractors]);
        this.renderOptionButtons(options, item.answer);
    }

    renderOptionButtons(options, correctAnswer) {
        const container = document.getElementById('quiz-options');
        container.innerHTML = "";
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-option';
            btn.innerText = opt;
            btn.onclick = () => {
                if (opt === correctAnswer) {
                    this.playAudio('khen_dung.mp3');
                    this.nextChallenge();
                } else {
                    this.playAudio('khen_sai.mp3');
                    btn.style.backgroundColor = '#e63946';
                    btn.style.color = 'white';
                }
            };
            container.appendChild(btn);
        });
    }

    // VÒNG 1.5: THỬ THÁCH SẮP XẾP CHỮ
    renderSpelling(item) {
        document.getElementById('spelling-img').src = item.image;
        this.currentSpellingAnswer = item.word.replace(/\s+/g, '').toLowerCase(); 
        this.currentSpellingInput = [];

        this.resetSpelling();
    }

    resetSpelling() {
        this.currentSpellingInput = [];
        const slotsContainer = document.getElementById('spelling-slots');
        slotsContainer.innerHTML = "";
        for (let i = 0; i < this.currentSpellingAnswer.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slotsContainer.appendChild(slot);
        }

        const letters = this.shuffle(this.currentSpellingAnswer.split(''));
        const lettersContainer = document.getElementById('spelling-letters');
        lettersContainer.innerHTML = "";
        letters.forEach((letter, idx) => {
            const btn = document.createElement('button');
            btn.className = 'letter-btn';
            btn.innerText = letter.toUpperCase();
            btn.onclick = () => {
                this.handleSpellingClick(btn, letter);
            };
            lettersContainer.appendChild(btn);
        });
    }

    handleSpellingClick(btn, letter) {
        btn.style.visibility = 'hidden';
        const slots = document.querySelectorAll('#spelling-slots .slot');
        slots[this.currentSpellingInput.length].innerText = letter.toUpperCase();
        this.currentSpellingInput.push(letter);

        if (this.currentSpellingInput.length === this.currentSpellingAnswer.length) {
            const finalWord = this.currentSpellingInput.join('');
            if (finalWord === this.currentSpellingAnswer) {
                this.playAudio('khen_dung.mp3');
                setTimeout(() => this.nextChallenge(), 1000);
            } else {
                this.playAudio('khen_sai.mp3');
                setTimeout(() => this.resetSpelling(), 1000);
            }
        }
    }

    // VÒNG 2: BÉ TẬP PHÁT ÂM
    renderSpeaking(item) {
        document.getElementById('speaking-img').src = item.image;
        const target = document.getElementById('speaking-target');
        target.innerText = item.word;
        document.getElementById('speaking-feedback').innerText = "Bấm nút Micro bên dưới và đọc to nhé!";
        this.playAudio(item.audio);
    }

    startListening() {
        if (!this.recognition) return alert("Microphone không khả dụng hoặc chưa cấp quyền!");
        const micBtn = document.getElementById('mic-btn');
        micBtn.classList.add('listening');
        this.recognition.start();

        this.recognition.onresult = (event) => {
            micBtn.classList.remove('listening');
            const resultText = event.results[0][0].transcript;
            const targetText = document.getElementById('speaking-target').innerText;
            
            const score = this.calculateHybridMatch(resultText, targetText);
            const feedback = document.getElementById('speaking-feedback');

            if (score >= 55) {
                feedback.innerHTML = `❤️ Chính xác! (${Math.round(score)}%) - Nghe được: "${resultText}"`;
                this.playAudio('khen_dung.mp3');
                setTimeout(() => this.nextChallenge(), 1500);
            } else {
                this.speechAttempts++;
                feedback.innerHTML = `❌ Thử lại con nhé! (${Math.round(score)}%) - Nghe được: "${resultText}"`;
                this.playAudio('khen_sai.mp3');
                
                if (this.speechAttempts >= 3) {
                    document.getElementById('skip-speaking').style.display = 'block';
                }
            }
        };

        this.recognition.onerror = () => micBtn.classList.remove('listening');
    }

    // VÒNG 3: ĐÓNG VAI ĐỐI THOẠI
    async renderDialogue(item) {
        const bubble = document.getElementById('dialogue-subtitle');
        const avA = document.getElementById('avatar-a');
        const avB = document.getElementById('avatar-b');
        const mic = document.getElementById('dialogue-mic');
        
        mic.style.display = 'none';

        // Bước 1: Máy phát file thoại nhân vật A
        avA.classList.add('talking');
        bubble.innerHTML = `🤖 <b>A nói:</b> "${item.speaker_m}"`;
        this.playAudio(item.audio_m);

        // Chờ máy dứt lời (Giả định trung bình 4 giây hội thoại)
        await new Promise(res => setTimeout(res, 4000));
        avA.classList.remove('talking');

        // Bước 2: Máy tự động phát âm thanh đọc mẫu của nhân vật B
        avB.classList.add('talking');
        bubble.innerHTML = `👶 <b>Nghe mẫu B:</b> "${item.speaker_u}"`;
        this.playAudio(item.audio_u);

        await new Promise(res => setTimeout(res, 4500));
        avB.classList.remove('talking');

        // Bước 3: Bật Micro lắng nghe người học
        bubble.innerHTML = `👉 <b>Đến lượt con đọc lời thoại của B:</b> <br>"${item.speaker_u}"`;
        mic.style.display = 'block';
        this.currentDialogueTarget = item.speaker_u;
    }

    startDialogueListening() {
        const mic = document.getElementById('dialogue-mic');
        mic.classList.add('listening');
        this.recognition.start();

        this.recognition.onresult = (event) => {
            mic.classList.remove('listening');
            const resultText = event.results[0][0].transcript;
            const score = this.calculateHybridMatch(resultText, this.currentDialogueTarget);
            const bubble = document.getElementById('dialogue-subtitle');

            if (score >= 55) {
                bubble.innerHTML = `🎉 Tuyệt vời! Con đối thoại rất tốt. (${Math.round(score)}%)`;
                this.playAudio('khen_dung.mp3');
                setTimeout(() => this.nextChallenge(), 2000);
            } else {
                bubble.innerHTML = `❌ Chưa chính xác lắm (${Math.round(score)}%). Con bấm Micro nói lại câu của B nhé!`;
                this.playAudio('khen_sai.mp3');
            }
        };
        this.recognition.onerror = () => mic.classList.remove('listening');
    }

    // THUẬT TOÁN ĐO ĐỘ TƯƠNG ĐỒNG LAI (HYBRID SPEECH MATCHING)
    calculateHybridMatch(s1, s2) {
        s1 = s1.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        s2 = s2.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");

        const words1 = s1.split(/\s+/);
        const words2 = s2.split(/\s+/);

        // Khớp từ đơn: Tính khoảng cách Levenshtein
        if (words2.length <= 1) {
            const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
            for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
            for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
            for (let j = 1; j <= s2.length; j += 1) {
                for (let i = 1; i <= s1.length; i += 1) {
                    const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                    track[j][i] = Math.min(track[j - 1][i] + 1, track[j][i - 1] + 1, track[j - 1][i - 1] + indicator);
                }
            }
            const distance = track[s2.length][s1.length];
            return ((Math.max(s1.length, s2.length) - distance) / Math.max(s1.length, s2.length)) * 100;
        } 
        
        // Khớp câu dài: Chỉ số tương đồng Jaccard
        else {
            const set1 = new Set(words1);
            const set2 = new Set(words2);
            const intersection = new Set([...set1].filter(x => set2.has(x)));
            const union = new Set([...set1, ...set2]);
            return (intersection.size / union.size) * 100;
        }
    }

    // Tiện ích sinh đáp án nhiễu ngẫu nhiên không trùng với đáp án đúng
    generateDistractors(correct, key, subKey) {
        const list = this.data[key].map(item => item[subKey]).filter(val => val !== correct);
        const shuffled = this.shuffle(list);
        return this.shuffle([correct, ...shuffled.slice(0, 3)]);
    }

    nextChallenge() {
        this.currentIndex++;
        setTimeout(() => this.executeChallenge(), 800);
    }

    updateProgress() {
        const pct = (this.currentIndex / this.gameFlow.length) * 100;
        document.getElementById('progress-bar').style.width = `${pct}%`;
        
        const currentChallenge = this.gameFlow[this.currentIndex];
        if(currentChallenge) {
            document.getElementById('round-indicator').innerText = `Vòng ${currentChallenge.round}/3`;
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }
}

const gameEngine = new EducationalGameEngine();