// upgrades.js — Изолированная логика улучшений и управления UI

const MULTITAP_BASE_COST = 100;
const MULTITAP_COST_MULTIPLIER = 2;

function calculateUpgradeCost(currentLevel) {
    if (currentLevel < 1) currentLevel = 1;
    return MULTITAP_BASE_COST * Math.pow(MULTITAP_COST_MULTIPLIER, currentLevel - 1);
}

// Динамическое открытие модалки без изменения разметки clicker.html
async function openUpgrades() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    // Если модалки еще нет на странице — скачиваем её файл и вставляем в body
    if (!document.getElementById('upgrades-overlay')) {
        try {
            const response = await fetch('upgrades_modal.html');
            if (!response.ok) throw new Error();
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            console.error("Не удалось загрузить интерфейс улучшений");
            return;
        }
    }

    // Показываем окно с анимацией
    const overlay = document.getElementById('upgrades-overlay');
    const sheet = document.getElementById('upgrades-sheet');
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';
    }, 10);

    // Запрашиваем текущий уровень мультитапа, сохраненный в кнопке крысы, и обновляем текст
    const currentMultitapLevel = parseInt(document.getElementById('rat-button').getAttribute('data-multitap-level')) || 1;
    updateUpgradeUI(currentMultitapLevel);
}

function closeUpgradesModal() {
    const overlay = document.getElementById('upgrades-overlay');
    const sheet = document.getElementById('upgrades-sheet');
    if (!overlay) return;

    overlay.style.opacity = '0';
    sheet.style.transform = 'translateY(100%)';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
}

function updateUpgradeUI(currentLevel) {
    const costBtn = document.getElementById('multitap-cost-btn');
    const textLevel = document.getElementById('multitap-level-text');
    
    if (costBtn && textLevel) {
        const nextCost = calculateUpgradeCost(currentLevel);
        textLevel.innerText = `Увеличивает силу тапа. Текущий уровень: ${currentLevel} (Клик: +${currentLevel})`;
        costBtn.innerText = `Прокачать за 🧀 ${nextCost.toLocaleString('ru-RU')}`;
    }
}

async function buyMultitap() {
    const pointsSpan = document.getElementById('points');
    const levelSpan = document.getElementById('lbl-level');
    const ratBtn = document.getElementById('rat-button');
    
    if (!pointsSpan || !ratBtn) return;
    
    let currentPoints = parseInt(pointsSpan.innerText.replace(/\s/g, '')) || 0;
    let currentMultitapLevel = parseInt(ratBtn.getAttribute('data-multitap-level')) || 1;
    const cost = calculateUpgradeCost(currentMultitapLevel);
    
    if (currentPoints < cost) {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        alert("🚨 Недостаточно сыра 🧀!");
        return;
    }
    
    // Оптимистичное списание на фронте
    currentPoints -= cost;
    pointsSpan.innerText = currentPoints.toLocaleString('ru-RU');
    
    try {
        const response = await fetch(`${BACKEND_URL}/upgrade/multitap/${user.id}`, { method: 'POST' });
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        if (data.status === "ok") {
            pointsSpan.innerText = Math.floor(data.points).toLocaleString('ru-RU');
            if (levelSpan) levelSpan.innerText = data.level || 1;
            
            // Сохраняем новый уровень в дата-атрибут кнопки
            ratBtn.setAttribute('data-multitap-level', data.multitap_level);
            updateUpgradeUI(data.multitap_level);
            
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            alert("Ошибка базы: " + data.message);
            loadProfile(); 
        }
    } catch (err) {
        console.error("Upgrade error:", err);
        alert("Логово не ответило на запрос покупки");
        loadProfile();
    }
}
