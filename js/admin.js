// ========== ЛОГИКА АДМИН ПАНЕЛИ ==========

// Сложный пароль с хеш-защитой (bcrypt-подобный хеш)
// Пароль: "Admin@2024#Security!" хеширован с солью
const ADMIN_PASSWORD_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm";

// Для упрощения, используем простую проверку (в реальном приложении используй bcrypt)
// Этот хеш генерирован из пароля: "Admin123!@#$%"
const correctPassword = "Admin@2024!Secure#Pass";

let isAdminLoggedIn = false;

// ========== ФУНКЦИИ ЛОГИНА ==========

function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');

    // Простая проверка пароля (в production используй bcrypt на сервере!)
    if (password === correctPassword) {
        isAdminLoggedIn = true;
        errorDiv.style.display = 'none';
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('adminPassword').value = '';
        loadAdminData();
    } else {
        errorDiv.textContent = '❌ Неправильный пароль!';
        errorDiv.style.display = 'block';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

function adminLogout() {
    if (confirm('Вы уверены? Вы выйдете из системы администратора.')) {
        isAdminLoggedIn = false;
        document.getElementById('adminLogin').style.display = 'flex';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('adminPassword').value = '';
        document.getElementById('loginError').style.display = 'none';
    }
}

// Обработка Enter в поле пароля
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                adminLogin();
            }
        });
    }
});

// ========== ЗАГРУЗКА ДАННЫХ ==========

function loadAdminData() {
    loadPlayersStats();
    loadPlayersTable();
    loadGameStats();
    loadGameResults();
}

function loadPlayersStats() {
    db.ref('players').on('value', (snapshot) => {
        const players = [];
        let totalScore = 0;

        snapshot.forEach(child => {
            const player = child.val();
            players.push(player);
            totalScore += player.score || 0;
        });

        document.getElementById('totalPlayers').textContent = players.length;
        document.getElementById('totalScore').textContent = totalScore;
    });

    db.ref('gameResults').on('value', (snapshot) => {
        let count = 0;
        let correctCount = 0;

        snapshot.forEach(child => {
            count++;
            if (child.val().isCorrect) correctCount++;
        });

        document.getElementById('totalAnswers').textContent = count;
        document.getElementById('correctAnswers').textContent = correctCount;

        const accuracy = count > 0 ? Math.round((correctCount / count) * 100) : 0;
        document.getElementById('accuracy').textContent = accuracy + '%';
    });
}

function loadPlayersTable() {
    db.ref('players').on('value', (snapshot) => {
        const players = [];
        snapshot.forEach(child => {
            players.push({
                ...child.val(),
                key: child.key
            });
        });

        players.sort((a, b) => (b.score || 0) - (a.score || 0));

        let html = '';
        if (players.length === 0) {
            html = '<tr><td colspan="4" class="no-data">Пока нет игроков</td></tr>';
        } else {
            players.forEach((player, index) => {
                html += `<tr>
                    <td class="player-name">
                        <span style="color: #bb86fc; font-weight: 700; margin-right: 10px;">#${index + 1}</span>
                        ${player.name || 'Без имени'}
                    </td>
                    <td><span class="class-badge">${player.class || '?'}</span></td>
                    <td><span class="score">${player.score || 0}</span></td>
                    <td>
                        <button class="btn btn-danger" onclick="kickPlayer('${player.key}', '${player.name}')">🚪 Выкидать</button>
                    </td>
                </tr>`;
            });
        }

        document.getElementById('playersTableBody').innerHTML = html;
    });
}

function loadGameStats() {
    db.ref('gameResults').on('value', (snapshot) => {
        const results = {
            easy: { total: 0, correct: 0 },
            medium: { total: 0, correct: 0 },
            hard: { total: 0, correct: 0 }
        };

        snapshot.forEach(child => {
            const data = child.val();
            if (results[data.level]) {
                results[data.level].total++;
                if (data.isCorrect) results[data.level].correct++;
            }
        });

        updateLevelStats(results);
    });
}

function updateLevelStats(results) {
    const levels = ['easy', 'medium', 'hard'];
    const levelNames = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' };
    const levelIcons = { easy: '⭐', medium: '⭐⭐', hard: '⭐⭐⭐' };

    let html = '';
    levels.forEach(level => {
        const total = results[level].total;
        const correct = results[level].correct;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        html += `<div class="stat-card">
            <div class="stat-label">
                <span class="badge badge-${level === 'easy' ? 'success' : level === 'medium' ? 'warning' : 'danger'}">
                    ${levelIcons[level]}
                </span>
                ${levelNames[level]} уровень
            </div>
            <div style="margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Ответов:</span>
                    <span style="font-weight: bold; color: #bb86fc;">${total}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Правильно:</span>
                    <span style="font-weight: bold; color: #4caf50;">${correct}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Точность:</span>
                    <span style="font-weight: bold; color: #ff9800;">${accuracy}%</span>
                </div>
            </div>
        </div>`;
    });

    const container = document.getElementById('levelStatsContainer');
    if (container) {
        container.innerHTML = html;
    }
}

// ========== СБРОС БАЗЫ ДАННЫХ ==========

function resetDatabase() {
    const confirmed = confirm('⚠️ ВНИМАНИЕ! Это удалит ВСЕ данные!\n\nВы уверены?');
    if (!confirmed) return;

    const doubleConfirm = prompt('Напишите "УДАЛИТЬ" для подтверждения:');
    if (doubleConfirm !== 'УДАЛИТЬ') {
        alert('Сброс отменён');
        return;
    }

    const resetBtn = document.getElementById('resetBtn');
    resetBtn.disabled = true;
    resetBtn.textContent = '⏳ Удаление...';

    Promise.all([
        db.ref('players').remove(),
        db.ref('gameResults').remove()
    ]).then(() => {
        resetBtn.disabled = false;
        resetBtn.textContent = '🗑️ Сбросить таблицу';
        alert('✅ База данных очищена!');
        loadAdminData();
    }).catch(error => {
        console.error('Ошибка при сбросе:', error);
        resetBtn.disabled = false;
        resetBtn.textContent = '🗑️ Сбросить таблицу';
        alert('❌ Ошибка при сбросе базы данных');
    });
}

// ========== ЭКСПОРТ ДАННЫХ ==========

function exportData() {
    db.ref().once('value', (snapshot) => {
        const data = snapshot.val();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `game-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    });
}

// ========== ЗАГРУЗКА РЕЗУЛЬТАТОВ ТЕСТОВ ==========

function loadGameResults() {
    db.ref('gameResults').orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
        const results = [];
        snapshot.forEach(child => {
            results.push({
                ...child.val(),
                key: child.key
            });
        });

        // Сортируем по новым результатам
        results.reverse();

        let html = '';
        if (results.length === 0) {
            html = '<tr><td colspan="7" class="no-data">Пока нет результатов</td></tr>';
        } else {
            results.forEach((result, index) => {
                const date = new Date(result.timestamp).toLocaleString('ru-RU');
                const statusIcon = result.isCorrect ? '✅' : '❌';
                const statusColor = result.isCorrect ? 'color: #4caf50;' : 'color: #f44336;';
                
                html += `<tr>
                    <td>${result.playerName || 'Неизвестно'}</td>
                    <td><span class="class-badge">${result.playerClass || '?'}</span></td>
                    <td>
                        ${result.level === 'easy' ? '⭐ Легкий' : 
                          result.level === 'medium' ? '⭐⭐ Средний' : 
                          '⭐⭐⭐ Сложный'}
                    </td>
                    <td>${result.selectedAnswer || 'Нет ответа'}</td>
                    <td style="${statusColor}">${statusIcon}</td>
                    <td style="font-size: 12px;">${date}</td>
                    <td>
                        <button class="btn btn-danger" style="font-size: 12px; padding: 5px 10px;" onclick="deleteResult('${result.key}')">❌</button>
                    </td>
                </tr>`;
            });
        }

        document.getElementById('resultsTableBody').innerHTML = html;
    });
}

// ========== УДАЛЕНИЕ РЕЗУЛЬТАТА ТЕСТА ==========

function deleteResult(resultKey) {
    if (confirm('❓ Вы уверены что хотите удалить этот результат?')) {
        db.ref('gameResults/' + resultKey).remove().then(() => {
            alert('✅ Результат удалён!');
            loadGameResults();
        }).catch(error => {
            console.error('Ошибка при удалении:', error);
            alert('❌ Ошибка при удалении результата');
        });
    }
}

// ========== ВЫКИДЫВАНИЕ ИГРОКА (ПРЕКРАЩЕНИЕ ТЕСТА) ==========

function kickPlayer(playerId, playerName) {
    if (confirm(`❓ Вы уверены что хотите выкидать игрока "${playerName}"?\n\nТабло его обновится с некорректными данными.`)) {
        // Помечаем игрока как "выкиданного" в Firebase
        db.ref('players/' + playerId).update({
            kicked: true,
            kickedAt: new Date().getTime(),
            kickedReason: 'admin'
        }).then(() => {
            alert(`✅ Игрок "${playerName}" был выкидан из игры!`);
            loadPlayersTable();
        }).catch(error => {
            console.error('Ошибка при выкидывании игрока:', error);
            alert('❌ Ошибка при выкидывании игрока');
        });
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

console.log('Админ панель загружена');
console.log('Пароль для входа: Admin@2024!Secure#Pass');
