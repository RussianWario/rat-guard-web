// quests.js — Финальная синхронизированная логика

// 1. Слушаем события из upgrades.js (клики и покупки)
window.addEventListener('updateQuests', () => {
    const overlay = document.getElementById('quests-overlay');
    // Обновляем список, только если окно открыто
    if (overlay && overlay.style.display === 'flex') {
        renderQuests(); 
    }
});

async function openQuests() {
    if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    if (!document.getElementById('quests-overlay')) {
        try {
            const response = await fetch('quests_modal.html');
            if (!response.ok) throw new Error();
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            console.error("Файл quests_modal.html не найден");
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

    renderQuests();
}

function closeQuestsModal() {
    const overlay = document.getElementById('quests-overlay');
    const sheet = document.getElementById('quests-sheet');
    if (!overlay) return;

    overlay.style.opacity = '0';
    if (sheet) sheet.style.transform = 'translateY(100%)';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
}

async function renderQuests() {
    // ВАЖНО: Проверь, чтобы в quests_modal.html id был именно "quests-list"
    const listContainer = document.getElementById('quests-list');
    const currentUserId = typeof user !== 'undefined' ? (user?.user_id || user?.id) : null;
    const activeUrl = window.BACKEND_URL;
    
    if (!listContainer || !currentUserId || !activeUrl) return;

    try {
        const response = await fetch(`${activeUrl}/quests/${currentUserId}`);
        if (!response.ok) throw new Error();
        const quests = await response.json();

        listContainer.innerHTML = '';

        if (quests.length === 0) {
            listContainer.innerHTML = '<p style="color:#666; text-align:center; padding: 20px;">Задач пока нет.</p>';
            return;
        }

        quests.forEach(quest => {
            const card = document.createElement('div');
            card.className = `quest-card ${quest.is_completed ? 'completed' : ''}`;

            let rewardText = `+${quest.reward_points} 🧀`;
            if (quest.reward_stars > 0) rewardText += ` +${quest.reward_stars} ⭐`;

            card.innerHTML = `
                <div class="quest-info">
                    <h4>${quest.title}</h4>
                    <p>${quest.description || ''}</p>
                    <div class="quest-reward">Награда: ${rewardText}</div>
                </div>
                <div class="quest-action">
                    ${quest.is_completed 
                        ? `<button class="quest-btn completed" disabled>✅</button>` 
                        : `<button class="quest-btn ${quest.can_claim ? 'active' : ''}" 
                            onclick="claimQuest('${quest.id}')">
                            ${quest.can_claim ? 'Забрать' : 'Проверить'}
                           </button>`
                    }
                </div>
            `;
            listContainer.appendChild(card);
        });

    } catch (err) {
        listContainer.innerHTML = '<p style="color:#e74c3c; text-align:center;">Ошибка связи с сервером</p>';
    }
}

async function claimQuest(questId) {
    if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    const currentUserId = typeof user !== 'undefined' ? (user?.user_id || user?.id) : null;
    const activeUrl = window.BACKEND_URL;

    if (!currentUserId || !activeUrl) return;

    try {
        // Исправлен путь: сначала ID квеста, потом юзера (как обычно в API)
        const response = await fetch(`${activeUrl}/quests/claim/${questId}/${currentUserId}`, { method: 'POST' });
        const data = await response.json();

        if (data.status === 'ok') {
            const pointsSpan = document.getElementById('points');
            const starsSpan = document.getElementById('lbl-stars');
            
            if (pointsSpan) pointsSpan.innerText = Math.floor(data.points).toLocaleString('ru-RU');
            if (starsSpan) starsSpan.innerText = (data.stars || 0).toLocaleString('ru-RU');
            
            if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            
            renderQuests(); // Перерисовываем карточки
        } else {
            alert(data.message || "Условия не выполнены");
        }
    } catch (err) {
        console.error("Quest error:", err);
    }
}
