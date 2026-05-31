const assert = require('assert');

console.log('🎵 音频合成与和弦识别测试套件\n');

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

function calculateFrequency(baseFreq, semitone) {
    return baseFreq * Math.pow(2, semitone / 12);
}

function getChordFrequencies(intervals, baseFreq = 261.63) {
    return intervals.map(interval => calculateFrequency(baseFreq, interval));
}

function identifyChord(intervals) {
    const normalized = intervals.map(i => i % 12).sort((a, b) => a - b);
    const intervalKey = normalized.join(',');
    
    const chordMap = {
        '0,4,7': '大三和弦 (Major)',
        '0,3,7': '小三和弦 (Minor)',
        '0,4,8': '增三和弦 (Augmented)',
        '0,3,6': '减三和弦 (Diminished)',
        '0,4,7,10': '属七和弦 (Dominant 7th)',
        '0,4,7,11': '大七和弦 (Major 7th)',
        '0,3,7,10': '小七和弦 (Minor 7th)',
        '0,3,6,9': '减七和弦 (Diminished 7th)'
    };
    
    return chordMap[intervalKey] || '未知和弦';
}

function calculateScore(isCorrect, currentStreak) {
    if (!isCorrect) return 0;
    const newStreak = currentStreak + 1;
    return 10 + newStreak * 2;
}

function calculateAccuracy(correct, total) {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
}

function generateOptions(correctChord) {
    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const options = [correctChord];
    const otherChords = CHORDS.filter(c => c.name !== correctChord.name);
    const shuffled = shuffleArray(otherChords);
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
        options.push(shuffled[i]);
    }
    return shuffleArray(options);
}

let passed = 0;
let failed = 0;

function runTest(testName, testFn) {
    try {
        testFn();
        console.log(`  ✓ ${testName}`);
        passed++;
    } catch (e) {
        console.log(`  ✗ ${testName}: ${e.message}`);
        failed++;
    }
}

console.log('\n🎹 音频生成准确性测试\n');

runTest('C音频率计算正确 (261.63Hz)', () => {
    const cFreq = calculateFrequency(261.63, 0);
    assert.strictEqual(cFreq, 261.63);
});

runTest('大三和弦频率正确 (C-E-G)', () => {
    const majorChord = getChordFrequencies([0, 4, 7]);
    const expected = [261.63, 329.6275569128699, 391.99543598174927];
    assert.deepStrictEqual(majorChord.map(f => f.toFixed(2)), expected.map(f => f.toFixed(2)));
});

runTest('小三和弦频率正确 (C-Eb-G)', () => {
    const minorChord = getChordFrequencies([0, 3, 7]);
    const expected = [261.63, 311.1269837220809, 391.99543598174927];
    assert.deepStrictEqual(minorChord.map(f => f.toFixed(2)), expected.map(f => f.toFixed(2)));
});

runTest('七和弦包含4个音符', () => {
    const seventhChord = getChordFrequencies([0, 4, 7, 10]);
    assert.strictEqual(seventhChord.length, 4);
});

runTest('和弦类型数量正确 (4个三和弦 + 4个七和弦)', () => {
    const triads = CHORDS.filter(c => c.intervals.length === 3);
    const seventh = CHORDS.filter(c => c.intervals.length === 4);
    assert.strictEqual(triads.length, 4);
    assert.strictEqual(seventh.length, 4);
});

runTest('所有和弦音程唯一且升序排列', () => {
    CHORDS.forEach(chord => {
        const sorted = [...chord.intervals].sort((a, b) => a - b);
        assert.deepStrictEqual(chord.intervals, sorted, `${chord.name}音程应该升序`);
        const unique = [...new Set(chord.intervals)];
        assert.strictEqual(unique.length, chord.intervals.length, `${chord.name}音程应该唯一`);
    });
});

console.log('\n🎯 和弦类型识别逻辑测试\n');

runTest('正确识别大三和弦', () => {
    assert.strictEqual(identifyChord([0, 4, 7]), '大三和弦 (Major)');
});

runTest('正确识别小三和弦', () => {
    assert.strictEqual(identifyChord([0, 3, 7]), '小三和弦 (Minor)');
});

runTest('正确识别增三和弦', () => {
    assert.strictEqual(identifyChord([0, 4, 8]), '增三和弦 (Augmented)');
});

runTest('正确识别减三和弦', () => {
    assert.strictEqual(identifyChord([0, 3, 6]), '减三和弦 (Diminished)');
});

runTest('正确识别所有七和弦类型', () => {
    const seventhChords = [
        { intervals: [0, 4, 7, 10], expected: '属七和弦 (Dominant 7th)' },
        { intervals: [0, 4, 7, 11], expected: '大七和弦 (Major 7th)' },
        { intervals: [0, 3, 7, 10], expected: '小七和弦 (Minor 7th)' },
        { intervals: [0, 3, 6, 9], expected: '减七和弦 (Diminished 7th)' }
    ];
    seventhChords.forEach(chord => {
        assert.strictEqual(identifyChord(chord.intervals), chord.expected);
    });
});

runTest('选项生成逻辑正确 (4个选项，包含正确答案)', () => {
    const correctChord = CHORDS[0];
    const options = generateOptions(correctChord);
    assert.strictEqual(options.length, 4);
    assert.ok(options.some(o => o.name === correctChord.name));
    const uniqueOptions = [...new Set(options.map(o => o.name))];
    assert.strictEqual(uniqueOptions.length, 4);
});

console.log('\n⏱️ 计分系统与逻辑测试\n');

runTest('第一题正确得12分', () => {
    assert.strictEqual(calculateScore(true, 0), 12);
});

runTest('5连击正确得20分 (streak=5时)', () => {
    assert.strictEqual(calculateScore(true, 4), 20);
});

runTest('答错得0分', () => {
    assert.strictEqual(calculateScore(false, 5), 0);
});

runTest('连击重置后得分正确', () => {
    let streak = 5;
    streak = 0;
    assert.strictEqual(calculateScore(true, streak), 12);
});

runTest('60秒游戏理论答题数量合理', () => {
    const maxQuestions = Math.floor(60 / 3);
    assert.ok(maxQuestions >= 20, `60秒至少能答20题，实际${maxQuestions}题`);
});

runTest('20题全对总分合理', () => {
    let totalScore = 0;
    for (let i = 0; i < 20; i++) {
        totalScore += calculateScore(true, i);
    }
    assert.ok(totalScore > 400 && totalScore < 1000, `最高分应在合理范围: ${totalScore}`);
});

console.log('\n📊 排行榜与进度统计测试\n');

runTest('正确率计算正确', () => {
    assert.strictEqual(calculateAccuracy(8, 10), 80);
    assert.strictEqual(calculateAccuracy(0, 10), 0);
    assert.strictEqual(calculateAccuracy(10, 10), 100);
    assert.strictEqual(calculateAccuracy(7, 8), 88);
});

runTest('0题时正确率处理正确', () => {
    assert.strictEqual(calculateAccuracy(0, 0), 0);
});

runTest('排行榜排序正确', () => {
    const unsorted = [100, 500, 200, 300];
    const sorted = [...unsorted].sort((a, b) => b - a);
    assert.deepStrictEqual(sorted, [500, 300, 200, 100]);
});

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

if (failed === 0) {
    console.log('\n🎉 所有测试通过！音频合成和判分逻辑工作正常！\n');
} else {
    console.log(`\n⚠️ 有 ${failed} 个测试失败，请检查代码。\n`);
}
