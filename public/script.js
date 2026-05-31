const CHORDS = [
    { name: '大三和弦 (Major)', intervals: [0, 4, 7], shortName: '大三和弦' },
    { name: '小三和弦 (Minor)', intervals: [0, 3, 7], shortName: '小三和弦' },
    { name: '增三和弦 (Augmented)', intervals: [0, 4, 8], shortName: '增三和弦' },
    { name: '减三和弦 (Diminished)', intervals: [0, 3, 6], shortName: '减三和弦' },
    { name: '属七和弦 (Dominant 7th)', intervals: [0, 4, 7, 10], shortName: '属七和弦' },
    { name: '大七和弦 (Major 7th)', intervals: [0, 4, 7, 11], shortName: '大七和弦' },
    { name: '小七和弦 (Minor 7th)', intervals: [0, 3, 7, 10], shortName: '小七和弦' },
    { name: '减七和弦 (Diminished 7th)', intervals: [0, 3, 6, 9], shortName: '减七和弦' }
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_FREQUENCIES = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
};

const PIANO_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#'];
const KEYBOARD_MAP = { 'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E', 'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A', 'u': 'A#', 'j': 'B' };

let audioContext = null;
let activeAudioNodes = [];
let activeTimeouts = [];

let gameState = {
    isPlaying: false,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    timeLeft: 60,
    currentChord: null,
    timer: null
};

let dailyChallenge = {
    current: 0,
    target: 5,
    completed: false,
    reward: 50
};

let earTrainingState = {
    active: false,
    progression: [],
    currentIndex: 0,
    userAnswers: []
};

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playNote(frequency, duration = 0.5, startTime = null) {
    initAudio();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = frequency;
    osc.type = 'sine';
    
    const start = startTime || audioContext.currentTime;
    gain.gain.setValueAtTime(0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
    
    osc.start(start);
    osc.stop(start + duration);
}

function playChord(intervals, baseFreq = 261.63, duration = 1.5) {
    initAudio();
    const now = audioContext.currentTime;
    intervals.forEach(interval => {
        const freq = baseFreq * Math.pow(2, interval / 12);
        playNote(freq, duration, now);
    });
}

function playChordByName(chordName) {
    const chord = CHORDS.find(c => c.name === chordName || c.shortName === chordName);
    if (chord) {
        playChord(chord.intervals);
    }
}

function getRandomChord() {
    return CHORDS[Math.floor(Math.random() * CHORDS.length)];
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function generateOptions(correctChord) {
    const options = [correctChord];
    const otherChords = CHORDS.filter(c => c.name !== correctChord.name);
    const shuffled = shuffleArray(otherChords);
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
        options.push(shuffled[i]);
    }
    return shuffleArray(options);
}

function displayOptions(options) {
    const grid = document.getElementById('optionsGrid');
    grid.innerHTML = '';
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option.name;
        btn.onclick = () => checkAnswer(option);
        grid.appendChild(btn);
    });
}

function disableOptions() {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);
}

function showFeedback(message, isCorrect) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = `feedback ${isCorrect ? 'correct' : 'wrong'}`;
}

function updateStats() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('streak').textContent = gameState.streak;
    document.getElementById('timer').textContent = gameState.timeLeft;
    document.getElementById('playerScore').value = gameState.score;
}

function updateChallengeProgress() {
    const progress = (dailyChallenge.current / dailyChallenge.target) * 100;
    document.getElementById('challengeProgress').style.width = `${Math.min(progress, 100)}%`;
    document.getElementById('challengeText').textContent = `${dailyChallenge.current}/${dailyChallenge.target}`;
}

async function checkAnswer(selectedChord) {
    if (!gameState.isPlaying) return;
    
    disableOptions();
    const isCorrect = selectedChord.name === gameState.currentChord.name;
    
    if (isCorrect) {
        gameState.streak++;
        gameState.correctCount++;
        gameState.score += 10 + gameState.streak * 2;
        if (gameState.streak > gameState.maxStreak) {
            gameState.maxStreak = gameState.streak;
        }
        
        dailyChallenge.current++;
        updateChallengeProgress();
        
        if (dailyChallenge.current >= dailyChallenge.target && !dailyChallenge.completed) {
            dailyChallenge.completed = true;
            gameState.score += dailyChallenge.reward;
            showChallengeModal();
        }
        
        showFeedback(`正确! +${10 + (gameState.streak - 1) * 2}分`, true);
    } else {
        gameState.streak = 0;
        showFeedback(`错误! 正确答案是: ${gameState.currentChord.name}`, false);
        
        try {
            await fetch('/api/wrong-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chordName: gameState.currentChord.name })
            });
            await loadWrongAnswers();
        } catch (e) {
            console.error('保存错题失败', e);
        }
    }
    
    try {
        await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correct: isCorrect, streak: gameState.streak, score: gameState.score })
        });
        await loadProgress();
    } catch (e) {
        console.error('保存进度失败', e);
    }
    
    updateStats();
    
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => {
        if (btn.textContent === gameState.currentChord.name) {
            btn.classList.add('correct');
        } else if (btn.textContent === selectedChord.name && !isCorrect) {
            btn.classList.add('wrong');
        }
    });
    
    setTimeout(nextRound, 1500);
}

function nextRound() {
    if (!gameState.isPlaying) return;
    gameState.currentChord = getRandomChord();
    const options = generateOptions(gameState.currentChord);
    displayOptions(options);
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback';
}

function startGame() {
    gameState = {
        isPlaying: true,
        score: 0,
        streak: 0,
        maxStreak: 0,
        correctCount: 0,
        timeLeft: 60,
        currentChord: null,
        timer: null
    };
    
    updateStats();
    document.getElementById('startBtn').disabled = true;
    document.getElementById('playBtn').disabled = false;
    
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        document.getElementById('timer').textContent = gameState.timeLeft;
        if (gameState.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    nextRound();
}

function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timer);
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('playBtn').disabled = true;
    disableOptions();
    
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalCorrect').textContent = gameState.correctCount;
    document.getElementById('finalStreak').textContent = gameState.maxStreak;
    
    document.getElementById('gameOverModal').classList.add('show');
}

function showChallengeModal() {
    document.getElementById('challengeReward').textContent = `挑战完成! 获得奖励: +${dailyChallenge.reward}分`;
    document.getElementById('challengeModal').classList.add('show');
}

function closeChallengeModal() {
    document.getElementById('challengeModal').classList.remove('show');
}

async function loadProgress() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        document.getElementById('totalGames').textContent = data.totalGames;
        document.getElementById('lbTotalGames').textContent = data.totalGames;
        const accuracy = data.totalGames > 0 ? Math.round((data.correctAnswers / data.totalGames) * 100) : 0;
        document.getElementById('accuracy').textContent = accuracy + '%';
        document.getElementById('lbAccuracy').textContent = accuracy + '%';
        document.getElementById('bestStreak').textContent = data.bestStreak;
        document.getElementById('lbBestStreak').textContent = data.bestStreak;
        document.getElementById('userRank').textContent = '#' + data.rank;
        document.getElementById('lbRank').textContent = '#' + data.rank;
    } catch (e) {
        console.error('加载进度失败', e);
    }
}

async function loadWrongAnswers() {
    try {
        const res = await fetch('/api/wrong-answers');
        const data = await res.json();
        const list = document.getElementById('wrongAnswersList');
        list.innerHTML = '';
        
        if (data.length === 0) {
            list.innerHTML = '<p style="color:#999;text-align:center;">暂无错题</p>';
            return;
        }
        
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'wrong-item';
            div.innerHTML = `
                <span class="chord-name">${item.chordName}</span>
                <button class="delete-btn" onclick="deleteWrongAnswer(${item.id})">✕</button>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('加载错题失败', e);
    }
}

async function deleteWrongAnswer(id) {
    try {
        await fetch(`/api/wrong-answers/${id}`, { method: 'DELETE' });
        await loadWrongAnswers();
    } catch (e) {
        console.error('删除错题失败', e);
    }
}

async function loadLeaderboard() {
    try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        const list = document.getElementById('leaderboardList');
        list.innerHTML = '';
        
        data.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-item';
            let medal = '';
            if (index === 0) medal = '🥇';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            
            div.innerHTML = `
                <span class="rank">${medal || (index + 1)}</span>
                <div class="player-info">
                    <div class="player-name">${item.name}</div>
                    <div class="player-date">${item.date}</div>
                </div>
                <span class="player-score">${item.score}</span>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('加载排行榜失败', e);
    }
}

async function submitScore() {
    const name = document.getElementById('playerName').value.trim();
    if (!name) {
        alert('请输入你的名字!');
        return;
    }
    
    try {
        await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, score: gameState.score })
        });
        await loadLeaderboard();
        alert('分数已提交!');
    } catch (e) {
        console.error('提交分数失败', e);
    }
}

async function loadDailyChallenge() {
    try {
        const res = await fetch('/api/daily-challenge');
        const data = await res.json();
        document.getElementById('challengeName').textContent = data.name;
        document.getElementById('challengeDesc').textContent = data.description;
        dailyChallenge.target = data.target;
        dailyChallenge.reward = data.reward;
        updateChallengeProgress();
    } catch (e) {
        console.error('加载每日挑战失败', e);
    }
}

async function loadProgressions() {
    try {
        const res = await fetch('/api/progressions');
        const data = await res.json();
        const select = document.getElementById('progressionSelect');
        select.innerHTML = '';
        
        data.forEach(prog => {
            const option = document.createElement('option');
            option.value = prog.id;
            option.textContent = `${prog.name} (${prog.difficulty})`;
            option.dataset.chords = JSON.stringify(prog.chords);
            select.appendChild(option);
        });
    } catch (e) {
        console.error('加载和弦进行失败', e);
    }
}

async function saveProgression() {
    const name = document.getElementById('progressionName').value.trim();
    if (!name) {
        alert('请输入名称!');
        return;
    }
    
    const chords = [
        document.getElementById('chord1').value,
        document.getElementById('chord2').value,
        document.getElementById('chord3').value,
        document.getElementById('chord4').value
    ];
    
    try {
        await fetch('/api/progressions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, chords, difficulty: '自定义' })
        });
        await loadProgressions();
        alert('和弦进行已保存!');
    } catch (e) {
        console.error('保存和弦进行失败', e);
    }
}

function playSelectedProgression() {
    const select = document.getElementById('progressionSelect');
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption) return;
    
    const chords = JSON.parse(selectedOption.dataset.chords);
    chords.forEach((chordName, index) => {
        setTimeout(() => {
            playChordByName(chordName);
        }, index * 1000);
    });
}

function startEarTraining() {
    const select = document.getElementById('progressionSelect');
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption) {
        alert('请先选择一个和弦进行!');
        return;
    }
    
    const chords = JSON.parse(selectedOption.dataset.chords);
    earTrainingState = {
        active: true,
        progression: chords,
        currentIndex: 0,
        userAnswers: []
    };
    
    chords.forEach((chordName, index) => {
        setTimeout(() => {
            playChordByName(chordName);
        }, index * 1000);
    });
    
    setTimeout(() => {
        showEarTrainingUI();
    }, chords.length * 1000 + 500);
}

function showEarTrainingUI() {
    const area = document.getElementById('earTrainingArea');
    area.innerHTML = `
        <p style="margin-bottom: 15px; font-weight: bold;">请按顺序选择你听到的和弦:</p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
            ${CHORDS.map(c => `
                <button class="option-btn" onclick="selectEarAnswer('${c.shortName}')">
                    ${c.shortName}
                </button>
            `).join('')}
        </div>
        <div id="earAnswers" style="text-align: center; padding: 10px; background: #f8f9ff; border-radius: 8px;">
            已选择: 
        </div>
        <button onclick="checkEarAnswers()" class="start-btn" style="margin-top: 15px; width: 100%;">
            检查答案
        </button>
    `;
}

function selectEarAnswer(chordName) {
    if (earTrainingState.userAnswers.length < earTrainingState.progression.length) {
        earTrainingState.userAnswers.push(chordName);
        document.getElementById('earAnswers').textContent = '已选择: ' + earTrainingState.userAnswers.join(' → ');
    }
}

function checkEarAnswers() {
    if (earTrainingState.userAnswers.length !== earTrainingState.progression.length) {
        alert(`请选择 ${earTrainingState.progression.length} 个和弦!`);
        return;
    }
    
    let correct = 0;
    earTrainingState.progression.forEach((chord, index) => {
        if (chord === earTrainingState.userAnswers[index]) correct++;
    });
    
    alert(`听力训练结果: ${correct}/${earTrainingState.progression.length} 正确!\n正确顺序: ${earTrainingState.progression.join(' → ')}\n你的答案: ${earTrainingState.userAnswers.join(' → ')}`);
    
    earTrainingState.active = false;
    earTrainingState.userAnswers = [];
    document.getElementById('earTrainingArea').innerHTML = '';
}

function initPiano() {
    const pianoContainer = document.getElementById('pianoKeys');
    
    PIANO_NOTES.forEach(note => {
        const key = document.createElement('div');
        key.className = 'white-key';
        key.dataset.note = note;
        key.onclick = () => playPianoNote(note);
        pianoContainer.appendChild(key);
    });
    
    BLACK_KEYS.forEach(note => {
        const key = document.createElement('div');
        key.className = 'black-key';
        key.dataset.note = note;
        key.onclick = () => playPianoNote(note);
        pianoContainer.appendChild(key);
    });
    
    document.addEventListener('keydown', (e) => {
        const note = KEYBOARD_MAP[e.key.toLowerCase()];
        if (note) {
            playPianoNote(note);
            const keyElement = document.querySelector(`[data-note="${note}"]`);
            if (keyElement) {
                keyElement.classList.add('active');
                setTimeout(() => keyElement.classList.remove('active'), 200);
            }
        }
    });
}

function playPianoNote(note) {
    const freq = NOTE_FREQUENCIES[note];
    if (freq) {
        playNote(freq, 0.5);
        document.getElementById('currentNotes').textContent = note;
    }
}

function playSelectedChord() {
    const chordType = document.getElementById('chordTypeSelect').value;
    const chordMap = {
        'major': [0, 4, 7],
        'minor': [0, 3, 7],
        'augmented': [0, 4, 8],
        'diminished': [0, 3, 6],
        'dominant7': [0, 4, 7, 10],
        'major7': [0, 4, 7, 11],
        'minor7': [0, 3, 7, 10]
    };
    if (chordMap[chordType]) {
        playChord(chordMap[chordType]);
    }
}

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            
            if (tab.dataset.tab === 'leaderboard') {
                loadLeaderboard();
            }
        };
    });
}

window.onload = () => {
    initTabs();
    initPiano();
    loadProgress();
    loadWrongAnswers();
    loadLeaderboard();
    loadDailyChallenge();
    loadProgressions();
    document.getElementById('playBtn').disabled = true;
    
    document.getElementById('playBtn').onclick = () => {
        if (gameState.currentChord) {
            playChord(gameState.currentChord.intervals);
        }
    };
    document.getElementById('startBtn').onclick = startGame;
    document.getElementById('restartBtn').onclick = () => {
        document.getElementById('gameOverModal').classList.remove('show');
        startGame();
    };
    document.getElementById('resetBtn').onclick = () => {
        if (confirm('确定要重置所有学习进度吗?')) location.reload();
    };
    document.getElementById('submitScoreBtn').onclick = submitScore;
    document.getElementById('submitToLeaderboard').onclick = submitScore;
    document.getElementById('submitAndRestartBtn').onclick = async () => {
        await submitScore();
        document.getElementById('gameOverModal').classList.remove('show');
        startGame();
    };
    document.getElementById('playSelectedChord').onclick = playSelectedChord;
    document.getElementById('clearNotes').onclick = () => {
        document.getElementById('currentNotes').textContent = '-';
    };
    document.getElementById('playProgression').onclick = playSelectedProgression;
    document.getElementById('saveProgression').onclick = saveProgression;
    document.getElementById('startEarTraining').onclick = startEarTraining;
};
