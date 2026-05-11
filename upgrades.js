// upgrades.js — Обновленная логика с балансом и связью для квестов

const UPGRADE_CONFIG = {
    multitap:   { base: 100,   mult: 1.5, label: "Мультитап" },
    rat_helper: { base: 500,   mult: 1.6, label: "Дрессированная крыса" },
    factory:    { base: 2500,  mult: 1.7, label: "Сырная мануфактура" },
    syndicate:  { base: 15000, mult: 1.8, label: "Крысиный синдикат" }
};

window.userUpgrades = {
    multitap: 1,
    rat_helper: 0,
    factory: 0,
    syndicate: 0
};

function calculateUpgradeCost(type, currentLevel) {
    const cfg = UPGRADE_CONFIG[type];
    if (!cfg) return 0;
    
    // Для предметов 0 уровня первая покупка идет по базовой цене
    const power = (type !== 'multitap' && currentLevel === 0) ? 0 : currentLevel;
    return Math.floor(cfg.base * Math.pow(cfg.mult, power));
}

async function openUpgrades() {
    if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

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

    const overlay = document.getElementById('upgrades-overlay');
    const sheet = document.getElementById('upgrades-sheet');
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';
    }, 10);

    updateAllUpgradesUI();
}

function updateAllUpgradesUI() {
    const mt = window.userUpgrades.multitap || 1;
    updateSingleCardUI('multitap', mt, `Сила клика: +${mt}`);
    
    const rh = window.userUpgrades.rat_helper || 0;
    updateSingleCardUI('rat_helper', rh, `Пассив: +${rh * 2} 🧀/сек`);
    
    const fc = window.userUpgrades.factory || 0;
    updateSingleCardUI('factory', fc, `Цех: +${fc * 15} 🧀/сек`);
    
    const sd = window.userUpgrades.syndicate || 0;
    updateSingleCardUI('syndicate', sd, `Синдикат: +${sd * 70} 🧀/сек`);
}

function updateSingleCardUI(type, currentLevel, descriptionText) {
    const costBtn = document.getElementById(`${type}-cost-btn`);
    const textLevel = document.getElementById(`${type}-level-text`);
    
    if (costBtn && textLevel) {
        const nextCost = calculateUpgradeCost(type, currentLevel);
        textLevel.innerText = `${descriptionText} (Ур. ${currentLevel})`;
        costBtn.innerText = `🧀 ${nextCost.toLocaleString('ru-RU')}`;
    }
}

async function buyUpgrade(type) {
    const pointsSpan = document.getElementById('points');
    const currentUserId = typeof user !== 'undefined' ? (user?.user_id || user?.id) : null;
    
    if (!pointsSpan || !currentUserId) return;
    
    let currentLevel = window.userUpgrades[type] || 0;
    const cost = calculateUpgradeCost(type, currentLevel);
    let currentPoints = parseInt(pointsSpan.innerText.replace(/\s/g, '')) || 0;

    if (currentPoints < cost) {
        if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        return; 
    }

    try {
        const response = await fetch(`${window.BACKEND_URL}/upgrade/${type}/${currentUserId}`, { method: 'POST' });
        const data = await response.json();
        
        if (data.status === "ok") {
            // Обновляем локальные данные
            window.userUpgrades[type] = data.new_level;
            pointsSpan.innerText = Math.floor(data.points).toLocaleString('ru-RU');
            
            // Визуальное обновление
            updateAllUpgradesUI();
            
            // СИГНАЛ ДЛЯ КВЕСТОВ: уведомляем систему, что апгрейд куплен
            window.dispatchEvent(new CustomEvent('updateQuests', { detail: { type, level: data.new_level } }));

            if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        }
    } catch (err) {
        console.error("Ошибка покупки:", err);
    }
}

// Интеграция с основным кликом
if (typeof handleTap === 'function') {
    const oldTap = handleTap;
    handleTap = async function(e) {
        let currentMultitap = window.userUpgrades.multitap || 1;
        const pointsSpan = document.getElementById('points');
        let p = parseInt(pointsSpan.innerText.replace(/\s/g, '')) || 0;
        
        // Визуальный плюс
        pointsSpan.innerText = (p + currentMultitap).toLocaleString('ru-RU');
        
        // Вызов оригинальной логики (отправка на сервер)
        await oldTap(e);
        
        // Сигнал квестам о клике
        window.dispatchEvent(new CustomEvent('updateQuests', { detail: { type: 'click' } }));
    };
}
