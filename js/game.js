// ========== ЛОГИКА ИГРЫ ==========

let currentPlayer = {
    id: null,
    name: '',
    class: '',
    score: 0
};

const levels = ['easy', 'medium', 'hard'];
const levelNames = {
    easy: 'Легкий',
    medium: 'Средний',
    hard: 'Сложный'
};
const levelPoints = {
    easy: 2,
    medium: 3,
    hard: 5
};

let currentLevelIndex = 0;
let currentQuestions = [];
let answeredQuestions = [];
let currentQuestion = null;
let answerLocked = false;
let questions = { easy: [], medium: [], hard: [] };

// ========== ФУНКЦИИ ЗАГРУЗКИ ==========

function showLoading(text) {
    document.getElementById('loadingText').textContent = text || 'Загрузка...';
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

async function loadQuestions() {
    showLoading('Загрузка вопросов...');
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();
        
        // Проверяем структуру данных
        if (data && typeof data === 'object') {
            questions = data;
        } else {
            throw new Error('Неправильный формат данных');
        }
        
        console.log('Вопросы загружены:', questions);
        console.log('Легкие вопросы:', questions.easy?.length || 0);
        console.log('Средние вопросы:', questions.medium?.length || 0);
        console.log('Сложные вопросы:', questions.hard?.length || 0);
        
        // Проверяем наличие вопросов для всех уровней
        if (!questions.easy || questions.easy.length === 0) {
            console.error('Нет вопросов для легкого уровня');
        }
        if (!questions.medium || questions.medium.length === 0) {
            console.error('Нет вопросов для среднего уровня');
        }
        if (!questions.hard || questions.hard.length === 0) {
            console.error('Нет вопросов для сложного уровня');
        }
        
        hideLoading();
        startLevel();
    } catch (error) {
        console.error('Ошибка загрузки вопросов:', error);
        document.getElementById('loadingText').textContent = 'Ошибка загрузки. Проверьте консоль.';
        hideLoading();
    }
}

// ========== ЛОГИН ИГРОКА ==========

function login() {
    const fullInput = document.getElementById('playerName').value.trim();
    const errorDiv = document.getElementById('loginError');

    if (!fullInput) {
        errorDiv.style.display = 'block';
        return;
    }

    errorDiv.style.display = 'none';

    const parts = fullInput.split(' ');
    let playerClass = '?';
    let playerName = fullInput;

    if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.match(/^\d+[А-Яа-я]?$/)) {
            playerClass = lastPart;
            playerName = parts.slice(0, -1).join(' ');
        }
    }

    currentPlayer = {
        id: 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: playerName,
        class: playerClass,
        score: 0
    };

    db.ref('players/' + currentPlayer.id).set({
        id: currentPlayer.id,
        name: currentPlayer.name,
        class: currentPlayer.class,
        score: 0,
        lastUpdate: Date.now()
    });

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('playerInfo').textContent = `👤 ${playerName} (${playerClass})`;

    loadLeaderboard();
    loadQuestions();
}

// ========== ЛОГИКА УРОВНЕЙ ==========

function startLevel() {
    const levelKey = levels[currentLevelIndex];
    
    // Проверяем, есть ли вопросы для этого уровня
    if (!questions[levelKey] || questions[levelKey].length === 0) {
        console.warn(`Вопросы для уровня ${levelKey} не загружены:`, questions);
        showLoading('Загрузка вопросов...');
        // Пытаемся перезагрузить вопросы
        setTimeout(() => {
            loadQuestions();
        }, 500);
        return;
    }
    
    currentQuestions = [...questions[levelKey]];
    answeredQuestions = [];

    document.getElementById('currentLevelName').textContent = levelNames[levelKey] + ' уровень';
    const badge = document.getElementById('currentLevelBadge');
    badge.className = `level-badge level-${levelKey}`;
    badge.textContent = levelKey === 'easy' ? '⭐' : levelKey === 'medium' ? '⭐⭐' : '⭐⭐⭐';

    document.getElementById('nextLevelBtn').style.display = 'none';
    
    // Восстанавливаем HTML контейнера фото - ВАЖНО!
    const photoContainer = document.getElementById('photoContainer');
    if (photoContainer) {
        photoContainer.innerHTML = '<img id="gameImage" src="" alt="Загрузка...">';
        console.log('photoContainer восстановлен');
    } else {
        console.error('photoContainer не найден!');
    }

    showLoading('Подготовка фотографий...');

    setTimeout(() => {
        hideLoading();
        console.log('Вызываем loadRandomQuestion для уровня', levelKey);
        loadRandomQuestion();
    }, 800);
}

function loadRandomQuestion() {
    if (!currentQuestions || currentQuestions.length === 0) {
        document.getElementById('photoContainer').innerHTML =
            '<div style="text-align: center; padding: 50px; font-size: 24px; color: #f44336;">❌ Нет вопросов для этого уровня</div>';
        document.getElementById('optionsContainer').innerHTML = '';
        return;
    }
    
    if (answeredQuestions.length >= currentQuestions.length) {
        showLevelComplete();
        return;
    }

    const availableQuestions = currentQuestions.filter((_, index) => !answeredQuestions.includes(index));
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const questionIndex = currentQuestions.indexOf(availableQuestions[randomIndex]);

    currentQuestion = {
        ...availableQuestions[randomIndex],
        index: questionIndex
    };

    document.getElementById('progressText').textContent =
        `Отвечено ${answeredQuestions.length} из ${currentQuestions.length}`;

    // gameImage должен быть всегда в DOM после startLevel
    const gameImage = document.getElementById('gameImage');
    if (gameImage) {
        gameImage.src = currentQuestion.image;
    } else {
        // Если вдруг нет, покажем ошибку и не будем пытаться восстанавливать
        console.error('Элемент gameImage не найден в DOM. Проверьте вызов startLevel!');
        return;
    }

    preloadNextImage();

    let options = [...currentQuestion.options];
    if (!options.includes(currentQuestion.correct)) {
        options.push(currentQuestion.correct);
    }
    options = shuffleArray(options);

    let html = '';
    options.forEach(opt => {
        html += `<button class="option-btn" onclick="checkAnswer('${opt.replace(/'/g, "\\'")}')">${opt}</button>`;
    });
    document.getElementById('optionsContainer').innerHTML = html;

    answerLocked = false;
}

function preloadNextImage() {
    if (answeredQuestions.length < currentQuestions.length - 1) {
        const nextAvailable = currentQuestions.filter((_, index) => !answeredQuestions.includes(index) && index !== currentQuestion.index);
        if (nextAvailable.length > 0) {
            const nextImg = new Image();
            nextImg.src = nextAvailable[0].image;
        }
    }
}

// ========== ПРОВЕРКА ОТВЕТОВЗ ==========

function checkAnswer(selected) {
    if (answerLocked) return;

    answerLocked = true;
    const isCorrect = (selected === currentQuestion.correct);

    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
        if (btn.textContent === currentQuestion.correct) {
            btn.classList.add('correct');
        }
        if (btn.textContent === selected && !isCorrect) {
            btn.classList.add('wrong');
        }
    });

    if (isCorrect) {
        const levelKey = levels[currentLevelIndex];
        const points = levelPoints[levelKey];
        currentPlayer.score += points;
        document.getElementById('score').textContent = currentPlayer.score;
        db.ref('players/' + currentPlayer.id).update({
            score: currentPlayer.score,
            lastUpdate: Date.now()
        });
    }

    db.ref('gameResults/' + Date.now()).set({
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        playerClass: currentPlayer.class,
        level: levels[currentLevelIndex],
        questionImage: currentQuestion.image,
        selectedAnswer: selected,
        correctAnswer: currentQuestion.correct,
        isCorrect: isCorrect,
        score: currentPlayer.score,
        timestamp: Date.now()
    });

    answeredQuestions.push(currentQuestion.index);

    setTimeout(() => {
        if (answeredQuestions.length >= currentQuestions.length) {
            showLevelComplete();
        } else {
            loadRandomQuestion();
        }
    }, 1500);
}

function showLevelComplete() {
    document.getElementById('photoContainer').innerHTML =
        '<div style="text-align: center; padding: 50px; font-size: 48px; animation: slideIn 0.5s ease;">🎉 Уровень пройден!</div>';
    document.getElementById('optionsContainer').innerHTML = '';
    document.getElementById('progressText').textContent =
        `Пройдено ${currentQuestions.length} из ${currentQuestions.length}`;

    if (currentLevelIndex < levels.length - 1) {
        const nextLevelName = levelNames[levels[currentLevelIndex + 1]];
        document.getElementById('nextLevelBtn').textContent = `Дальше → ${nextLevelName} уровень`;
        document.getElementById('nextLevelBtn').style.display = 'block';
    } else {
        document.getElementById('photoContainer').innerHTML =
            '<div style="text-align: center; padding: 50px; font-size: 48px; animation: slideIn 0.5s ease;">🏆 Игра пройдена!</div>';
    }
}

function goToNextLevel() {
    currentLevelIndex++;
    startLevel();
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function loadLeaderboard() {
    db.ref('players').orderByChild('score').limitToLast(100).on('value', (snapshot) => {
        const players = [];
        snapshot.forEach(child => {
            players.push(child.val());
        });
        
        // Сортируем по баллам в убывающем порядке
        players.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        // Берем только топ-10
        const top10 = players.slice(0, 10);

        let html = '';
        if (top10.length === 0) {
            html = '<div class="leaderboard-item empty-leaderboard"><div>Пока нет рекордов</div></div>';
        } else {
            top10.forEach((p, index) => {
                const isCurrentPlayer = currentPlayer.id === p.id ? ' current-player' : '';
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                html += `<div class="leaderboard-item${isCurrentPlayer}">
                    <div><span class="leaderboard-rank">${medal ? medal + ' ' : ''}#${index + 1}</span><span>${p.name}</span> <span class="badge badge-primary">${p.class}</span></div>
                    <span class="leaderboard-score">${p.score || 0}</span>
                </div>`;
            });
        }

        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList) {
            leaderboardList.innerHTML = html;
        }
    }, (error) => {
        console.error('Ошибка при загрузке лидерборда:', error);
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('Игра инициализирована');
});
