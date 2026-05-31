const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let userProgress = {
  totalGames: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  streak: 0,
  bestStreak: 0,
  totalScore: 0,
  gamesToday: 0,
  lastPlayDate: null
};

let wrongAnswers = [];

let leaderboard = [
  { name: '音乐达人', score: 2580, date: '2026-05-10' },
  { name: '和弦大师', score: 2150, date: '2026-05-11' },
  { name: '耳朵灵敏', score: 1890, date: '2026-05-09' },
  { name: '初学者', score: 1200, date: '2026-05-08' },
  { name: '音乐爱好者', score: 980, date: '2026-05-07' }
];

let customProgressions = [
  { id: 1, name: '经典流行进行', chords: ['大三和弦', '下属和弦', '属七和弦', '主和弦'], difficulty: '简单' },
  { id: 2, name: '爵士布鲁斯', chords: ['属七和弦', '小七和弦', '减七和弦', '大七和弦'], difficulty: '中等' },
  { id: 3, name: '浪漫古典', chords: ['大三和弦', '小三和弦', '增三和弦', '大七和弦'], difficulty: '困难' }
];

const dailyChallenges = {
  easy: { name: '新手挑战', description: '连续答对5题', target: 5, reward: 50 },
  medium: { name: '进阶挑战', description: '60秒内获得100分', target: 100, reward: 100 },
  hard: { name: '大师挑战', description: '达成10连击', target: 10, reward: 200 }
};

function getDailyChallenge() {
  const today = new Date().toDateString();
  const dayOfWeek = new Date().getDay();
  const difficulties = ['easy', 'medium', 'hard'];
  const difficulty = difficulties[dayOfWeek % 3];
  return { ...dailyChallenges[difficulty], difficulty, date: today };
}

app.get('/api/progress', (req, res) => {
  res.json(userProgress);
});

app.post('/api/progress', (req, res) => {
  const { correct, streak, score } = req.body;
  const today = new Date().toDateString();
  
  userProgress.totalGames++;
  if (userProgress.lastPlayDate !== today) {
    userProgress.gamesToday = 0;
    userProgress.lastPlayDate = today;
  }
  userProgress.gamesToday++;
  
  if (correct) {
    userProgress.correctAnswers++;
    userProgress.streak = streak;
    if (streak > userProgress.bestStreak) {
      userProgress.bestStreak = streak;
    }
  } else {
    userProgress.wrongAnswers++;
    userProgress.streak = 0;
  }
  if (score) userProgress.totalScore += score;
  
  res.json(userProgress);
});

app.get('/api/wrong-answers', (req, res) => {
  res.json(wrongAnswers);
});

app.post('/api/wrong-answers', (req, res) => {
  const { chordName, timestamp } = req.body;
  
  wrongAnswers.push({
    chordName,
    timestamp: timestamp || new Date().toISOString(),
    id: Date.now()
  });
  
  res.json({ success: true });
});

app.delete('/api/wrong-answers/:id', (req, res) => {
  const { id } = req.params;
  wrongAnswers = wrongAnswers.filter(item => item.id !== parseInt(id));
  res.json({ success: true });
});

app.get('/api/leaderboard', (req, res) => {
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
  res.json(sorted);
});

app.post('/api/leaderboard', (req, res) => {
  const { name, score } = req.body;
  
  leaderboard.push({
    name,
    score,
    date: new Date().toISOString().split('T')[0]
  });
  
  leaderboard = leaderboard.sort((a, b) => b.score - a.score).slice(0, 20);
  res.json({ success: true, leaderboard });
});

app.get('/api/progressions', (req, res) => {
  res.json(customProgressions);
});

app.post('/api/progressions', (req, res) => {
  const { name, chords, difficulty } = req.body;
  
  const newProgression = {
    id: Date.now(),
    name,
    chords,
    difficulty: difficulty || '中等'
  };
  
  customProgressions.push(newProgression);
  res.json({ success: true, progression: newProgression });
});

app.get('/api/daily-challenge', (req, res) => {
  res.json(getDailyChallenge());
});

app.post('/api/daily-challenge/complete', (req, res) => {
  const { type } = req.body;
  res.json({ success: true, message: '挑战完成！' });
});

app.get('/api/stats', (req, res) => {
  const accuracy = userProgress.totalGames > 0 
    ? Math.round((userProgress.correctAnswers / userProgress.totalGames) * 100) 
    : 0;
  
  res.json({
    ...userProgress,
    accuracy,
    rank: leaderboard.filter(p => p.score > userProgress.totalScore).length + 1
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
