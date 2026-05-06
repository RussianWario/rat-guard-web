// quests.js — Чистая игровая логика квестов кликера

async function openQuests() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    if (!document.getElementById('quests-overlay')) {
        try {
            const response = await fetch('quests_modal.html');
            if (!response.ok) throw new Error();
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            console.error("Не удалось загрузить интерфейс квестов");
            return;
        }
    }

    const overlay = document.getElementById('quests-overlay');
    const sheet = document.getElementById('quests-sheet');
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';
    }, 10);

    renderQuests();
}

function closeQuestsModal() {
    const overlay = document.getElementById('quests-overlay');
    const sheet = document.getElementById('quests-sheet');
    if (!overlay) return;

    overlay.style.opacity = '0';
    sheet.style.transform = 'translateY(100%)';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
}

async function renderQuests() {
    const listContainer = document.getElementById('quests-list');
    // Страховка на случай, если на фронте ключ называется user_id или id
    const currentUserId = user?.user_id || user?.id;
    
    if (!listContainer || !currentUserId) return;

    try {
        const response = await fetch(`${BACKEND_URL}/quests/${currentUserId}`);
        if (!response.ok) throw new Error();
        const quests = await response.json();

        listContainer.innerHTML = '';

        if (quests.length === 0) {
            listContainer.innerHTML = '<p style="color:#666; text-align:center;">Доступных задач пока нет.</p>';
            return;
        }

        quests.forEach(quest => {
            const card = document.createElement('div');
            card.className = 'quest-card';

            let rewardText = `🎁 +${quest.reward_points} 🧀`;
            if (quest.reward_stars > 0) rewardText += ` +${quest.reward_stars} ⭐`;

            card.innerHTML = `
                <div class="quest-info">
                    <h4>${quest.title}</h4>
                    <p>${quest.description || ''}</p>
                    <div class="quest-reward">${rewardText}</div>
                </div>
                <div>
                    ${quest.is_completed 
                        ? `<button class="quest-btn completed" disabled>Получено</button>` 
                        : `<button class="quest-btn" onclick="claimQuest(${quest.id})">Проверить</button>`
                    }
                </div>
            `;
            listContainer.appendChild(card);
        });

    } catch (err) {
        listContainer.innerHTML = '<p style="color:#e74c3c; text-align:center;">Ошибка загрузки квестов</p>';
    }
}

async function claimQuest(questId) {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    const currentUserId = user?.user_id || user?.id;

    if (!currentUserId) return;

    try {
        const response = await fetch(`${BACKEND_URL}/quests/claim/${currentUserId}/${questId}`, { method: 'POST' });
        if (!response.ok) throw new Error();
        const data = await response.json();

        if (data.status === 'ok') {
            alert(data.message);
            
            // Синхронизируем баланс на основном экране
            const pointsSpan = document.getElementById('points');
            const starsSpan = document.getElementById('lbl-stars');
            if (pointsSpan) pointsSpan.innerText = Math.floor(data.points).toLocaleString('ru-RU');
            if (starsSpan) starsSpan.innerText = (data.stars || 0).toLocaleString('ru-RU');
            
            // Обновляем список, чтобы кнопка сменилась на "Получено"
            renderQuests();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error("Quest error:", err);
        alert("Не удалось проверить условия квеста");
    }
}
