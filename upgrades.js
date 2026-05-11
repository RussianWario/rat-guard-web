// quests.js — Финальная версия, полностью синхронизированная с твоим upgrades.js

// 1. СЛУШАТЕЛЬ СОБЫТИЙ: Принимает сигналы от кликов и апгрейдов из upgrades.js
window.addEventListener('updateQuests', (event) => {
    const modal = document.getElementById('quests-overlay');
    
    // Обновляем список, только если окно квестов открыто, чтобы не спамить запросами в фоне
    if (modal && modal.style.display !== 'none' && modal.style.opacity === '1') {
        console.log("Синхронизация квестов:", event.detail);
        loadQuestsList(); 
    }
});

async function openQuests() {
    if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    // Проверка наличия модалки в DOM
    if (!document.getElementById('quests-overlay')) {
        try {
            const response = await fetch('quests_modal.html');
            if (!response.ok) throw new Error("Файл quests_modal.html не найден");
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            console.error("Ошибка загрузки интерфейса квестов:", err);
            return;
        }
    }

    const overlay = document.getElementById('quests-overlay');
    const sheet = document.getElementById('quests-sheet');
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        if (sheet) sheet.style.transform = 'translateY(0)';
    }, 10);

    loadQuestsList();
}

function closeQuestsModal() {
    const overlay = document.getElementById('quests-overlay');
    const sheet = document.getElementById('quests-sheet');
    if (!overlay) return;

    overlay.style.opacity = '0';
    if (sheet) sheet.style.transform = 'translateY(100%)';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
}

async function loadQuestsList() {
    const container = document.getElementById('quests-list-container');
    const currentUserId = typeof user !== 'undefined' ? (user?.user_id || user?.id) : null;
    const activeUrl = window.BACKEND_URL;

    if (!container || !currentUserId || !activeUrl) return;

    try {
        const response = await fetch(`${activeUrl}/quests/${currentUserId}`);
        const quests = await response.json();

        container.innerHTML = ''; 

        quests.forEach(quest => {
            // Расчет прогресса для полоски
            const progressPercent = Math.min(100, (quest.current_progress / quest.target) * 100);
            
            const questHtml = `
                <div class="quest-card ${quest.is_completed ? 'completed' : ''}">
                    <div class="quest-info">
                        <div class="quest-title">${quest.title}</div>
                        <div class="quest-desc">${quest.description}</div>
                        <div class="quest-progress-container">
                            <div class="quest-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="quest-status-text">${quest.current_progress} / ${quest.target}</div>
                    </div>
                    <button 
                        class="claim-btn ${quest.can_claim && !quest.is_completed ? 'active' : ''}" 
                        onclick="claimReward('${quest.id}')"
                        ${!quest.can_claim || quest.is_completed ? 'disabled' : ''}>
                        ${quest.is_completed ? 'Выполнено' : (quest.can_claim ? 'Забрать' : 'В процессе')}
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', questHtml);
        });
    } catch (err) {
        console.error("Ошибка обновления списка квестов");
    }
}

async function claimReward(questId) {
    const currentUserId = typeof user !== 'undefined' ? (user?.user_id || user?.id) : null;
    if (!currentUserId) return;

    try {
        const response = await fetch(`${window.BACKEND_URL}/quests/claim/${questId}/${currentUserId}`, { method: 'POST' });
        const data = await response.json();

        if (data.status === "ok") {
            if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            loadQuestsList(); // Сразу обновляем список
            if (typeof loadProfile === 'function') loadProfile(); // Обновляем общий баланс (сыр, звезды)
        }
    } catch (err) {
        console.error("Ошибка при получении награды");
    }
}
