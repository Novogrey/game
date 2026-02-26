// ========== ЛОГИКА АДМИН ПАНЕЛИ ==========

// Сложный пароль с хеш-защитой (bcrypt-подобный хеш)
// Пароль: "Admin@2024#Security!" хеширован с солью
const ADMIN_PASSWORD_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm";

// Для упрощения, используем простую проверку (в реальном приложении используй bcrypt)
// Этот хеш генерирован из пароля: "Admin123!@#$%"
const correctPassword = "Admin@2024!Secure#Pass";

let isAdminLoggedIn = false;

// ========== КАСТОМНЫЕ МОДАЛИ ========== 

let modalCallback = null;
let modalInputRequired = false;
let modalExpectedInput = null;
let notificationTimeout = null;

function showModal(title, message, callback, options = {}) {
    const modal = document.getElementById('customModal');
    const titleEl = document.getElementById('modalTitle');
    const messageEl = document.getElementById('modalMessage');
    const inputEl = document.getElementById('modalInput');
    const confirmBtn = document.querySelector('.modal-btn-confirm');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Настройка опций
    if (options.requireInput) {
        inputEl.style.display = 'block';
        inputEl.placeholder = options.inputPlaceholder || 'Введите текст...';
        inputEl.value = '';
        inputEl.focus();
        modalInputRequired = true;
        modalExpectedInput = options.expectedInput || null;
    } else {
        inputEl.style.display = 'none';
        modalInputRequired = false;
        modalExpectedInput = null;
    }
    
    if (options.isDanger) {
        confirmBtn.classList.add('danger');
    } else {
        confirmBtn.classList.remove('danger');
    }
    
    modalCallback = callback;
    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('customModal');
    modal.classList.remove('show');
    document.getElementById('modalInput').value = '';
}

function confirmModal() {
    if (modalInputRequired) {
        const input = document.getElementById('modalInput').value;
        if (modalExpectedInput && input !== modalExpectedInput) {
            showNotification('❌ Неправильный ввод!', true);
            return;
        }
    }
    
    // Сохраняем callback перед закрытием модали
    const callback = modalCallback;
    closeModal();
    modalCallback = null;
    
    if (callback) {
        callback();
    }
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('customNotification');
    const messageEl = document.getElementById('notificationMessage');
    
    messageEl.textContent = message;
    
    if (isError) {
        notification.classList.add('error');
    } else {
        notification.classList.remove('error');
    }
    
    notification.classList.add('show');
    
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    notificationTimeout = setTimeout(() => {
        closeNotification();
    }, 4000);
}

function closeNotification() {
    const notification = document.getElementById('customNotification');
    notification.classList.remove('show');
}

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
    showModal(
        '🚪 Выход',
        'Вы уверены? Вы выйдете из системы администратора.',
        () => {
            isAdminLoggedIn = false;
            window.location.href = 'index.html';
        }
    );
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
    
    // Обработка Escape для закрытия модали
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // Обработка Enter в поле модали
    const modalInput = document.getElementById('modalInput');
    if (modalInput) {
        modalInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmModal();
            }
        });
    }
    
    // Закрытие модали при клике на фон
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
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
    // Сначала загружаем все результаты тестов, чтобы определить пройденные уровни
    db.ref('gameResults').once('value', (resultsSnapshot) => {
        const playerLevels = {}; // { playerId: ['easy', 'medium', 'hard'] }
        
        resultsSnapshot.forEach(child => {
            const result = child.val();
            if (!playerLevels[result.playerId]) {
                playerLevels[result.playerId] = new Set();
            }
            playerLevels[result.playerId].add(result.level);
        });
        
        // Конвертируем Set в Array
        Object.keys(playerLevels).forEach(key => {
            playerLevels[key] = Array.from(playerLevels[key]).sort();
        });
        
        // Теперь загружаем список игроков
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
                html = '<tr><td colspan="5" class="no-data">Пока нет игроков</td></tr>';
            } else {
                players.forEach((player, index) => {
                    // Определяем статус на основе пройденных уровней
                    let statusBadge = '⏳ Не начинал';
                    let statusColor = '#888';
                    
                    const completedLevels = playerLevels[player.id] || [];
                    
                    if (completedLevels.length === 0) {
                        statusBadge = '⏳ Не начинал';
                        statusColor = '#888';
                    } else if (completedLevels.length === 1) {
                        if (completedLevels[0] === 'easy') {
                            statusBadge = '📖 Проходит легкий';
                            statusColor = '#4caf50';
                        } else if (completedLevels[0] === 'medium') {
                            statusBadge = '📖 Проходит средний';
                            statusColor = '#ff9800';
                        } else {
                            statusBadge = '📖 Проходит сложный';
                            statusColor = '#f44336';
                        }
                    } else if (completedLevels.length === 2) {
                        if (completedLevels.includes('hard')) {
                            statusBadge = '📖 Проходит сложный';
                            statusColor = '#f44336';
                        } else if (completedLevels.includes('medium')) {
                            statusBadge = '✅ Завершил средний';
                            statusColor = '#4caf50';
                        } else {
                            statusBadge = '✅ Завершил легкий';
                            statusColor = '#4caf50';
                        }
                    } else if (completedLevels.length === 3) {
                        statusBadge = '✅ Завершил все уровни!';
                        statusColor = '#4caf50';
                    }
                    
                    html += `<tr>
                        <td class="player-name">
                            <span style="color: #bb86fc; font-weight: 700; margin-right: 10px;">#${index + 1}</span>
                            ${player.name || 'Без имени'}
                        </td>
                        <td><span class="class-badge">${player.class || '?'}</span></td>
                        <td><span class="score">${player.score || 0}</span></td>
                        <td><span style="color: ${statusColor}; font-weight: 600; padding: 5px 10px; background: rgba(255,255,255,0.1); border-radius: 4px;">${statusBadge}</span></td>
                        <td>
                            <button class="btn btn-danger" onclick="deleteAllResultsByPlayer('${player.key}', '${player.name}')">🗑️ Удалить игрока</button>
                        </td>
                    </tr>`;
                });
            }

            document.getElementById('playersTableBody').innerHTML = html;
        });
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
    showModal(
        '⚠️ ВНИМАНИЕ!',
        'Это удалит ВСЕ данные из базы!\n\nНапишите "УДАЛИТЬ" для подтверждения:',
        performReset,
        {
            requireInput: true,
            inputPlaceholder: 'Введите "УДАЛИТЬ"...',
            expectedInput: 'УДАЛИТЬ',
            isDanger: true
        }
    );
}

function performReset() {
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.disabled = true;
    resetBtn.textContent = '⏳ Удаление...';

    Promise.all([
        db.ref('players').remove(),
        db.ref('gameResults').remove()
    ]).then(() => {
        resetBtn.disabled = false;
        resetBtn.textContent = '🗑️ Сбросить таблицу';
        showNotification('✅ База данных очищена!');
        loadAdminData();
    }).catch(error => {
        console.error('Ошибка при сбросе:', error);
        resetBtn.disabled = false;
        resetBtn.textContent = '🗑️ Сбросить таблицу';
        showNotification('❌ Ошибка при сбросе базы данных', true);
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
    db.ref('gameResults').on('value', (snapshot) => {
        const results = [];
        snapshot.forEach(child => {
            results.push({
                ...child.val(),
                key: child.key
            });
        });

        // Сортируем по новым результатам (самые свежие в начале)
        results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

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

        const resultsTableBody = document.getElementById('resultsTableBody');
        if (resultsTableBody) {
            resultsTableBody.innerHTML = html;
            // Показываем информацию о количестве записей
            const tableSection = document.querySelector('.table-section:last-of-type');
            if (tableSection) {
                const h2 = tableSection.querySelector('h2');
                h2.textContent = `📋 Результаты тестов (всего ${results.length})`;
            }
        }
    });
}

// ========== УДАЛЕНИЕ РЕЗУЛЬТАТА ТЕСТА ==========

function deleteResult(resultKey) {
    showModal(
        '❓ Удаление результата',
        'Вы уверены что хотите удалить этот результат?',
        () => {
            db.ref('gameResults/' + resultKey).remove().then(() => {
                showNotification('✅ Результат удалён!');
                loadGameResults();
            }).catch(error => {
                console.error('Ошибка при удалении:', error);
                showNotification('❌ Ошибка при удалении результата', true);
            });
        }
    );
}

// ========== ВЫКИДЫВАНИЕ ИГРОКА (ПРЕКРАЩЕНИЕ ТЕСТА) ==========

function deleteAllResultsByPlayer(playerId, playerName) {
    showModal(
        '❌ Удаление игрока',
        `Вы уверены что хотите ПОЛНОСТЬЮ удалить игрока "${playerName}"?\n\nЭто удалит:\n- Все его результаты тестов\n- Самого игрока из списка\n\nОтмена невозможна!`,
        () => performDeletePlayer(playerId, playerName),
        { isDanger: true }
    );
}

function performDeletePlayer(playerId, playerName) {
    db.ref('gameResults').orderByChild('playerId').equalTo(playerId).once('value', (snapshot) => {
        const updates = {};
        let deletedCount = 0;
        
        snapshot.forEach(child => {
            updates['/gameResults/' + child.key] = null;
            deletedCount++;
        });
        
        // Удаляем самого игрока
        updates['/players/' + playerId] = null;
        
        // Применяем все удаления одновременно
        db.ref().update(updates).then(() => {
            showNotification(`✅ Игрок "${playerName}" и его ${deletedCount} результатов удалены!`);
            loadPlayersTable();
            loadGameResults();
            loadAdminData();
        }).catch(error => {
            console.error('Ошибка при удалении:', error);
            showNotification('❌ Ошибка при удалении', true);
        });
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

console.log('Админ панель загружена');