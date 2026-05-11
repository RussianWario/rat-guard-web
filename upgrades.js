// upgrades.js — Актуальная логика с защитой от сброса цен

const UPGRADE_CONFIG = {
    multitap:   { base: 100,   mult: 1.5, label: "Мультитап" },
    rat_helper: { base: 500,   mult: 1.6, label: "Дрессированная крыса" },
    factory:    { base: 2500,  mult: 1.7, label: "Сырная мануфактура" },
    syndicate:  { base: 15000, mult: 1.8, label: "Крысиный синдикат" }
};

// Глобальный объект уровней
window.userUpgrades = {
    multitap: 1,
    rat_helper: 0,
    factory: 0,
    syndicate: 0
};

// Расчет цены на основе уровня
function calculateUpgradeCost(type, currentLevel) {
    const cfg = UPGRADE_CONFIG[type];
    if (!cfg) return 0;
    // Для мультитапа уровень 1 — это база, для остальных 0
    const power = (type !== 'multitap' && currentLevel === 0) ? 0 : currentLevel;
    return Math.floor(cfg.base * Math.pow(cfg.mult, power));
}

// Открытие меню с предварительной загрузкой данных
async function openUpgrades() {
    if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    // ШАГ 1: Синхронизируем уровни с сервером, чтобы цены были верными
    await syncUpgradesFromServer();

    // ШАГ 2: Проверяем, загружена ли модалка
    if (!document.getElementById('upgrades-overlay')) {
        try {
            const response = await fetch('upgrades_modal.html');
            if (!response.ok) throw new Error();
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            console.error("Ошибка загрузки модалки улучшений");
            return;
        }
    }

    const overlay = document.getElementById('upgrades-overlay');
    const sheet = document.getElementById('upgrades-sheet');
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        if (sheet) sheet.style.transform = 'translateY(0)';
    }, 10);

    updateAllUpgradesUI();
}

// Функция синхронизации (чтобы цены не «откатывались»)
async function syncUpgradesFromServer() {
    const currentUserId = typeof user !== 'undefined' ? (user?.user_id || user?.id) : null;
    if (!currentUserId || !window.BACKEND_URL) return;

    try {
        const response = await fetch(`${window.BACKEND_URL}/get_profile/${currentUserId}`);
        if (response.ok) {
            const data = await response.json();
            // Обновляем глобальный объект данными из базы
            window.userUpgrades.multitap = data.multitap_level || 1;
            window.userUpgrades.rat_helper = data.rat_helper_level || 0;
            window.userUpgrades.factory = data.factory_level || 0;
            window.userUpgrades.syndicate = data.syndicate_level || 0;
        }
    } catch (e) {
        console.error("Ошибка синхронизации уровней:", e);
    }
}

// Функция покупки
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
            // Мгновенно обновляем локальный уровень
            window.userUpgrades[type] = data.new_level;
            
            // Обновляем баланс на экране
            pointsSpan.innerText = Math.floor(data.points).toLocaleString('ru-RU');
            
            // Перерисовываем карточки (цены и уровни)
            updateAllUpgradesUI();
            
            // Сигнализируем квестам, что прогресс изменился
            window.dispatchEvent(new CustomEvent('updateQuests', { detail: { type, level: data.new_level } }));

            if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        }
    } catch (err) {
        console.error("Ошибка при покупке:", err);
    }
}

function updateAllUpgradesUI() {
    Object.keys(UPGRADE_CONFIG).forEach(type => {
        const lvl = window.userUpgrades[type] || 0;
        let label = "";
        if (type === 'multitap') label = `Сила клика: +${lvl}`;
        if (type === 'rat_helper') label = `Пассив: +${lvl * 2}/сек`;
        if (type === 'factory') label = `Цех: +${lvl * 15}/сек`;
        if (type === 'syndicate') label = `Синдикат: +${lvl * 70}/сек`;
        
        updateSingleCardUI(type, lvl, label);
    });
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

function closeUpgradesModal() {
    const overlay = document.getElementById('upgrades-overlay');
    const sheet = document.getElementById('upgrades-sheet');
    if (!overlay) return;

    overlay.style.opacity = '0';
    if (sheet) sheet.style.transform = 'translateY(100%)';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
}
