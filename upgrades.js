// upgrades.js - Изолированная логика улучшений

// Базовые настройки для Мультитапа
const MULTITAP_BASE_COST = 100; // Цена 2-го уровня
const MULTITAP_COST_MULTIPLIER = 2; // Каждая покупка удваивает цену

/**
 * Рассчитывает стоимость следующего уровня мультитапа
 * Формула: BASE_COST * (MULTIPLIER ^ (current_level - 1))
 */
function calculateUpgradeCost(currentLevel) {
    if (currentLevel < 1) currentLevel = 1;
    return MULTITAP_BASE_COST * Math.pow(MULTITAP_COST_MULTIPLIER, currentLevel - 1);
}

/**
 * Функция прокачки мультитапа
 * Вызывается из интерфейса улучшений
 */
async function buyMultitap() {
    // 1. Получаем текущие очки со страницы кликера
    const pointsSpan = document.getElementById('points');
    const levelSpan = document.getElementById('lbl-level');
    
    if (!pointsSpan) return;
    
    let currentPoints = parseInt(pointsSpan.innerText.replace(/\s/g, '')) || 0;
    // Предполагаем, что уровень мы можем хранить в data-атрибуте или брать из lbl-level
    let currentMultitapLevel = parseInt(document.getElementById('rat-button').getAttribute('data-multitap-level')) || 1;
    
    const cost = calculateUpgradeCost(currentMultitapLevel);
    
    // Проверка на стороне фронтенда, хватает ли сыра
    if (currentPoints < cost) {
        alert("🚨 Недостаточно сыра 🧀 для прокачки!");
        return;
    }
    
    // Оптимистичный апдейт баланса на экране (чтобы не ждало ответа сервера)
    currentPoints -= cost;
    pointsSpan.innerText = currentPoints.toLocaleString('ru-RU');
    
    try {
        // 2. Отправляем запрос на бэкенд (этот эндпоинт мы настроим в FastAPI)
        const response = await fetch(`${BACKEND_URL}/upgrade/multitap/${user.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error("Ошибка при покупке");
        
        const data = await response.json();
        
        if (data.status === "ok") {
            // Обновляем данные на экране актуальными значениями от бэка
            pointsSpan.innerText = Math.floor(data.points).toLocaleString('ru-RU');
            if (levelSpan) levelSpan.innerText = data.level || 1;
            
            // Запоминаем новый уровень мультитапа в кнопке
            document.getElementById('rat-button').setAttribute('data-multitap-level', data.multitap_level);
            
            // Если открыто модальное окно — обновляем в нем ценник
            updateUpgradeUI(data.multitap_level);
            
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            alert("Ошибка: " + data.message);
            // Возвращаем баланс назад в случае ошибки базы данных
            loadProfile(); 
        }
        
    } catch (err) {
        console.error("Upgrade error:", err);
        alert("Не удалось связаться с логовом для покупки");
        loadProfile();
    }
}

/**
 * Обновляет текст кнопки и цену в меню улучшений
 */
function updateUpgradeUI(currentLevel) {
    const costBtn = document.getElementById('multitap-cost-btn');
    const textLevel = document.getElementById('multitap-level-text');
    
    if (costBtn && textLevel) {
        const nextCost = calculateUpgradeCost(currentLevel);
        textLevel.innerText = `Текущий уровень: ${currentLevel} (Клик: +${currentLevel})`;
        costBtn.innerText = `Купить за 🧀 ${nextCost.toLocaleString('ru-RU')}`;
    }
}
