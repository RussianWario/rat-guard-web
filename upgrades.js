// upgrades.js — Динамическая логика улучшений кликера, завязанная на квесты и глобальный уровень

const UPGRADE_CONFIG = {
    multitap:   { base: 100,   mult: 2.0, label: "Мультитап" },
    rat_helper: { base: 500,   mult: 2.2, label: "Дрессированная крыса" },
    factory:    { base: 2500,  mult: 2.5, label: "Сырная мануфактура" },
    syndicate:  { base: 15000, mult: 3.0, label: "Крысиный синдикат" }
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
    
    const lvl = currentLevel < 1 ? 1 : currentLevel;
    const power = (type !== 'multitap' && currentLevel === 0) ? 0 : lvl;
    
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

function closeUpgradesModal() {
    const overlay = document.getElementById('upgrades-overlay');
    const sheet = document.getElementById('upgrades-sheet');
    if (!overlay) return;

    overlay.style.opacity = '0';
    sheet.style.transform = 'translateY(100%)';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
}

function updateAllUpgradesUI() {
    const mt = window.userUpgrades.multitap || 1;
    updateSingleCardUI('multitap', mt, `Увеличивает силу тапа. Клик: +${mt}`);
    
    const rh = window.userUpgrades.rat_helper || 0;
    updateSingleCardUI('rat_helper', rh, `Пассивный сбор сыра. Приносит: +${rh * 2} 🧀/сек`);
    
    const fc = window.userUpgrades.factory || 0;
    updateSingleCardUI('factory', fc, `Подпольный цех в подвале. Приносит: +${fc * 15} 🧀/сек`);
    
    const sd = window.userUpgrades.syndicate || 0;
    updateSingleCardUI('syndicate', sd, `Глобальная сырная сеть. Приносит: +${sd * 70} 🧀/сек`);
}

function updateSingleCardUI(type, currentLevel, descriptionText) {
    const costBtn = document.getElementById(`${type}-cost-btn`);
    const textLevel = document.getElementById(`${type}-level-text`);
    
    if (costBtn && textLevel) {
        const nextCost = calculateUpgradeCost(type, currentLevel);
        textLevel.innerText = `${descriptionText} (Ур. ${currentLevel})`;
        costBtn.innerText = `Прокачать за 🧀 ${nextCost.toLocaleString('ru-RU')}`;
    }
}

async function buyUpgrade(type) {
    const pointsSpan = document.getElementById('points');
    const levelSpan = document.getElementById('lbl-level'); 
    const ratBtn = document.getElementById('rat-button');
    const currentUserId = typeof user !== 'undefined' ? (user?.user_id || user?.id) : null;
    const activeUrl = window.BACKEND_URL;
    
    if (!pointsSpan || !currentUserId || !activeUrl) return;
    
    let currentPoints = parseInt(pointsSpan.innerText.replace(/\s/g, '')) || 0;
    let currentLevel = window.userUpgrades[type] !== undefined ? window.userUpgrades[type] : 0;
    const cost = calculateUpgradeCost(type, currentLevel);
    
    if (currentPoints < cost) {
        if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        alert("🚨 Недостаточно сыра 🧀!");
        return;
    }
    
    currentPoints -= cost;
    pointsSpan.innerText = currentPoints.toLocaleString('ru-RU');
    
    try {
        const response = await fetch(`${activeUrl}/upgrade/${type}/${currentUserId}`, { method: 'POST' });
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        if (data.status === "ok") {
            pointsSpan.innerText = Math.floor(data.points).toLocaleString('ru-RU');
            
            if (data.global_level !== undefined && levelSpan) {
                levelSpan.innerText = data.global_level;
            }
            
            if (data.new_level !== undefined) {
                window.userUpgrades[type] = data.new_level;
            }
            
            if (type === 'multitap') {
                ratBtn?.setAttribute('data-multitap-level', data.new_level);
            }

            updateAllUpgradesUI();
            
            if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            alert("Ошибка базы: " + data.message);
            if (typeof loadProfile === 'function') loadProfile(); 
        }
    } catch (err) {
        console.error(`Upgrade error for ${type}:`, err);
        alert("Логово не ответило на запрос покупки");
        if (typeof loadProfile === 'function') loadProfile();
    }
}

async function buyMultitap() {
    await buyUpgrade('multitap');
}

if (typeof handleTap === 'function') {
    handleTap = async function(e) {
        const pointsSpan = document.getElementById('points');
        const levelSpan = document.getElementById('lbl-level');
        const starsSpan = document.getElementById('lbl-stars');
        const currentUserId = typeof user !== 'undefined' ? (user?.user_id || user?.id) : null;
        const activeUrl = window.BACKEND_URL;
        
        if (!pointsSpan || !currentUserId || !activeUrl) return;

        let currentMultitapLevel = window.userUpgrades.multitap || 1;
        let currentPoints = parseInt(pointsSpan.innerText.replace(/\s/g, '')) || 0;
        
        pointsSpan.innerText = (currentPoints + currentMultitapLevel).toLocaleString('ru-RU');
        
        if (typeof spawnCheese === 'function') spawnCheese(e);
        if (typeof tg !== 'undefined' && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

        try {
            const res = await fetch(`${activeUrl}/click/${currentUserId}`, { method: 'POST' });
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            if (data.points !== undefined) {
                pointsSpan.innerText = Math.floor(data.points).toLocaleString('ru-RU');
                if (levelSpan) levelSpan.innerText = data.level || 1;
                if (starsSpan) starsSpan.innerText = (data.stars || 0).toLocaleString('ru-RU');
            }
        } catch (err) {
            console.error("Ошибка синхронизации клика с Логовом");
        }
    };
}

const originalLoadProfile = window.loadProfile;
if (typeof originalLoadProfile === 'function') {
    window.loadProfile = async function() {
        const currentUserId = typeof user !== 'undefined' ? (user?.user_id || user?.id) : null;
        const activeUrl = window.BACKEND_URL;
        if (currentUserId && activeUrl) {
            try {
                const tgUsername = user.username || 'rat_user';
                const response = await fetch(`${activeUrl}/get_profile/${currentUserId}?username=${tgUsername}&t=${Date.now()}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    window.userUpgrades.multitap = data.multitap_level || 1;
                    window.userUpgrades.rat_helper = data.rat_helper_level || 0;
                    window.userUpgrades.factory = data.factory_level || 0;
                    window.userUpgrades.syndicate = data.syndicate_level || 0;
                    
                    document.getElementById('rat-button')?.setAttribute('data-multitap-level', window.userUpgrades.multitap);
                    
                    if (document.getElementById('upgrades-overlay')?.style.display === 'flex') {
                        updateAllUpgradesUI();
                    }
                }
            } catch (e) {
                console.error("Ошибка синхронизации уровней улучшений", e);
            }
        }
        await originalLoadProfile();
    };
}
