// upgrades.js — Динамическая логика улучшений кликера, завязанная на квесты и глобальный уровень

// Конфигурация цен и пассивного дохода для каждого типа апгрейда
const UPGRADE_CONFIG = {
    multitap:   { base: 100,   mult: 2.0, label: "Мультитап" },
    rat_helper: { base: 500,   mult: 2.2, label: "Дрессированная крыса" },
    factory:    { base: 2500,  mult: 2.5, label: "Сырная мануфактура" },
    syndicate:  { base: 15000, mult: 3.0, label: "Крысиный синдикат" }
};

// Глобальный кэш уровней для интерфейса модалки (заполняется при старте игры)
window.userUpgrades = {
    multitap: 1,
    rat_helper: 0,
    factory: 0,
    syndicate: 0
};

// Универсальный расчёт стоимости апгрейда
function calculateUpgradeCost(type, currentLevel) {
    const cfg = UPGRADE_CONFIG[type];
    if (!cfg) return 0;
    
    // Для мультитапа стартовый левел 1, для пассивок — 0
    const lvl = currentLevel < 1 ? 1 : currentLevel;
    const power = (type !== 'multitap' && currentLevel === 0) ? 0 : lvl;
    
    return Math.floor(cfg.base * Math.pow(cfg.mult, power));
}

// Открытие модалки
async function openUpgrades() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

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

    // Рисуем актуальные цены на основе закэшированных уровней
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

// Функция обновления текстов и кнопок для всех 4 карточек
function updateAllUpgradesUI() {
    // 1. Мультитап
    const mt = window.userUpgrades.multitap || 1;
    updateSingleCardUI('multitap', mt, `Увеличивает силу тапа. Клик: +${mt}`);
    
    // 2. Дрессированная крыса (дает, к примеру, +2 сыра/сек за левел)
    const rh = window.userUpgrades.rat_helper || 0;
    updateSingleCardUI('rat_helper', rh, `Пассивный сбор сыра. Приносит: +${rh * 2} 🧀/сек`);
    
    // 3. Фабрика (дает +15 сыра/сек за левел)
    const fc = window.userUpgrades.factory || 0;
    updateSingleCardUI('factory', fc, `Подпольный цех в подвале. Приносит: +${fc * 15} 🧀/сек`);
    
    // 4. Синдикат (дает +70 сыра/сек за левел)
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

// Универсальная функция покупки любого апгрейда
async function buyUpgrade(type) {
    const pointsSpan = document.getElementById('points');
    const levelSpan = document.getElementById('lbl-level'); // Глобальный уровень аккаунта для квестов
    const ratBtn = document.getElementById('rat-button');
    const currentUserId = user?.user_id || user?.id;
    
    if (!pointsSpan || !currentUserId) return;
    
    let currentPoints = parseInt(pointsSpan.innerText.replace(/\s/g, '')) || 0;
    let currentLevel = window.userUpgrades[type] !== undefined ? window.userUpgrades[type] : 0;
    const cost = calculateUpgradeCost(type, currentLevel);
    
    if (currentPoints < cost) {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        alert("🚨 Недостаточно сыра 🧀!");
        return;
    }
    
    // Оптимистичное списание на фронте для моментального отклика UI
    currentPoints -= cost;
    pointsSpan.innerText = currentPoints.toLocaleString('ru-RU');
    
    try {
        // Динамический URL в зависимости от типа апгрейда: /upgrade/multitap/{id}, /upgrade/factory/{id} и т.д.
        const response = await fetch(`${BACKEND_URL}/upgrade/${type}/${currentUserId}`, { method: 'POST' });
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        if (data.status === "ok") {
            // Обновляем сыр из актуального ответа базы данных
            pointsSpan.innerText = Math.floor(data.points).toLocaleString('ru-RU');
            
            // ВАЖНО: Если бэкенд пересчитал глобальный уровень (level) — сразу обновляем его на главном экране
            if (data.global_level !== undefined && levelSpan) {
                levelSpan.innerText = data.global_level;
            }
            
            // Сохраняем новый уровень апгрейда в наш глобальный кэш
            if (data.new_level !== undefined) {
                window.userUpgrades[type] = data.new_level;
            }
            
            // Для совместимости со старыми хуками кликов дублируем левел мультитапа в дата-атрибут главной кнопки
            if (type === 'multitap') {
                ratBtn?.setAttribute('data-multitap-level', data.new_level);
            }

            // Перерисовываем тексты кнопок в модалке
            updateAllUpgradesUI();
            
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
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

// Старая обертка buyMultitap, чтобы не сломался старый HTML, если ты забудешь сменить onclick в модалке
async function buyMultitap() {
    await buyUpgrade('multitap');
}

// ====================================================================
// ДИНАМИЧЕСКИЙ ПЕРЕХВАТ КЛИКОВ (Считывает актуальный мультитап из кэша)
// ====================================================================
if (typeof handleTap === 'function') {
    handleTap = async function(e) {
        const pointsSpan = document.getElementById('points');
        const levelSpan = document.getElementById('lbl-level');
        const starsSpan = document.getElementById('lbl-stars');
        const currentUserId = user?.user_id || user?.id;
        
        if (!pointsSpan || !currentUserId) return;

        // Забираем уровень тапа напрямую из кэша апгрейдов
        let currentMultitapLevel = window.userUpgrades.multitap || 1;
        let currentPoints = parseInt(pointsSpan.innerText.replace(/\s/g, '')) || 0;
        
        pointsSpan.innerText = (currentPoints + currentMultitapLevel).toLocaleString('ru-RU');
        
        if (typeof spawnCheese === 'function') spawnCheese(e);
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

        try {
            const res = await fetch(`${BACKEND_URL}/click/${currentUserId}`, { method: 'POST' });
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

// ====================================================================
// МОДИФИЦИРОВАННЫЙ ХУК ЗАГРУЗКИ ПРОФИЛЯ
// ====================================================================
const originalLoadProfile = window.loadProfile;
if (typeof originalLoadProfile === 'function') {
    window.loadProfile = async function() {
        const currentUserId = user?.user_id || user?.id;
        if (currentUserId) {
            try {
                const tgUsername = user.username || 'rat_user';
                // Дёргаем твой стандартный эндпоинт профиля, чтобы забрать уровни пассивок при входе
                const response = await fetch(`${BACKEND_URL}/get_profile/${currentUserId}?username=${tgUsername}&t=${Date.now()}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    // Парсим и раскладываем уровни из базы в оперативку фронта
                    window.userUpgrades.multitap = data.multitap_level || 1;
                    window.userUpgrades.rat_helper = data.rat_helper_level || 0;
                    window.userUpgrades.factory = data.factory_level || 0;
                    window.userUpgrades.syndicate = data.syndicate_level || 0;
                    
                    // Синхронизируем старый дата-атрибут кнопки крысы
                    document.getElementById('rat-button')?.setAttribute('data-multitap-level', window.userUpgrades.multitap);
                    
                    // Если игрок открыл модалку до того, как прилетел ответ — обновляем её на лету
                    if (document.getElementById('upgrades-overlay')?.style.display === 'flex') {
                        updateAllUpgradesUI();
                    }
                }
            } catch (e) {
                console.error("Ошибка синхронизации уровней улучшений", e);
            }
        }
        
        // Вызываем твой стандартный рендер страницы профиля
        await originalLoadProfile();
    };
}
