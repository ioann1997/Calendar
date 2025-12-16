// Данные приложения
let currentDate = new Date();
let dailyRituals = [];
let weeklyRituals = [];
let tasks = [];
let completions = {}; // { "date-ritualId": true }

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeNotifications();
    renderCalendar();
    renderRituals();
    setupEventListeners();
    startReminderCheck();
});

// Загрузка данных из localStorage
function loadData() {
    const saved = localStorage.getItem('ritualsData');
    if (saved) {
        const data = JSON.parse(saved);
        dailyRituals = data.dailyRituals || [];
        weeklyRituals = data.weeklyRituals || [];
        tasks = data.tasks || [];
        completions = data.completions || {};
    }
}

// Сохранение данных в localStorage
function saveData() {
    const data = {
        dailyRituals,
        weeklyRituals,
        tasks,
        completions
    };
    localStorage.setItem('ritualsData', JSON.stringify(data));
}

// Инициализация уведомлений
function initializeNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Показ уведомления
function showNotification(title, body, icon = '📅') {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: icon,
            badge: icon,
            tag: 'ritual-reminder'
        });
    }
}

// Проверка напоминаний
function startReminderCheck() {
    // Проверяем каждую минуту
    setInterval(() => {
        checkReminders();
    }, 60000);
    
    // Первая проверка сразу
    checkReminders();
}

function checkReminders() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const today = formatDate(now);
    const dayOfWeek = now.getDay();

    // Проверка ежедневных ритуалов
    dailyRituals.forEach(ritual => {
        if (ritual.time) {
            const [hours, minutes] = ritual.time.split(':');
            const ritualTime = parseInt(hours) * 60 + parseInt(minutes);
            const reminderKey = `${today}-daily-${ritual.id}`;
            
            // Напоминание за 5 минут до времени
            if (currentTime >= ritualTime - 5 && currentTime < ritualTime) {
                if (!localStorage.getItem(`reminded-${reminderKey}`)) {
                    showNotification(
                        '⏰ Напоминание о ритуале',
                        `Через 5 минут: ${ritual.name}`,
                        '⏰'
                    );
                    localStorage.setItem(`reminded-${reminderKey}`, 'true');
                }
            }
            
            // Напоминание в точное время
            if (currentTime >= ritualTime && currentTime < ritualTime + 1) {
                const completionKey = `${today}-daily-${ritual.id}`;
                if (!completions[completionKey]) {
                    showNotification(
                        '📅 Время ритуала!',
                        `${ritual.name}${ritual.description ? ': ' + ritual.description : ''}`,
                        '📅'
                    );
                }
            }
        }
    });

    // Проверка еженедельных ритуалов
    weeklyRituals.forEach(ritual => {
        if (ritual.days && ritual.days.includes(dayOfWeek.toString())) {
            if (ritual.time) {
                const [hours, minutes] = ritual.time.split(':');
                const ritualTime = parseInt(hours) * 60 + parseInt(minutes);
                const reminderKey = `${today}-weekly-${ritual.id}`;
                
                if (currentTime >= ritualTime - 5 && currentTime < ritualTime) {
                    if (!localStorage.getItem(`reminded-${reminderKey}`)) {
                        showNotification(
                            '⏰ Напоминание о еженедельном ритуале',
                            `Через 5 минут: ${ritual.name}`,
                            '⏰'
                        );
                        localStorage.setItem(`reminded-${reminderKey}`, 'true');
                    }
                }
                
                if (currentTime >= ritualTime && currentTime < ritualTime + 1) {
                    const completionKey = `${today}-weekly-${ritual.id}`;
                    if (!completions[completionKey]) {
                        showNotification(
                            '📅 Время еженедельного ритуала!',
                            `${ritual.name}${ritual.description ? ': ' + ritual.description : ''}`,
                            '📅'
                        );
                    }
                }
            }
        }
    });

    // Проверка задач от хозяина
    tasks.forEach(task => {
        if (task.date) {
            const taskDate = new Date(task.date);
            const taskTime = taskDate.getHours() * 60 + taskDate.getMinutes();
            const taskDateStr = formatDate(taskDate);
            
            if (taskDateStr === today) {
                if (taskTime > 0) {
                    if (currentTime >= taskTime - 5 && currentTime < taskTime) {
                        const reminderKey = `${today}-task-${task.id}`;
                        if (!localStorage.getItem(`reminded-${reminderKey}`)) {
                            showNotification(
                                '⏰ Напоминание о задаче',
                                `Через 5 минут: ${task.name}`,
                                '⏰'
                            );
                            localStorage.setItem(`reminded-${reminderKey}`, 'true');
                        }
                    }
                    
                    if (currentTime >= taskTime && currentTime < taskTime + 1) {
                        const completionKey = `${today}-task-${task.id}`;
                        if (!completions[completionKey]) {
                            showNotification(
                                '📋 Задача от хозяина!',
                                `${task.name}${task.description ? ': ' + task.description : ''}`,
                                '📋'
                            );
                        }
                    }
                } else {
                    // Задача на весь день
                    const completionKey = `${today}-task-${task.id}`;
                    if (!completions[completionKey] && currentTime === 0) {
                        showNotification(
                            '📋 Задача на сегодня',
                            `${task.name}${task.description ? ': ' + task.description : ''}`,
                            '📋'
                        );
                    }
                }
            }
        }
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация по месяцам
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Кнопки добавления
    document.getElementById('addDailyRitual').addEventListener('click', () => {
        openModal('daily');
    });

    document.getElementById('addWeeklyRitual').addEventListener('click', () => {
        openModal('weekly');
    });

    document.getElementById('addTask').addEventListener('click', () => {
        openModal('task');
    });

    // Модальное окно
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Форма
    document.getElementById('ritualForm').addEventListener('submit', handleFormSubmit);
    deleteBtn.addEventListener('click', handleDelete);

    // Запрос разрешения на уведомления при первом клике
    document.addEventListener('click', () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, { once: true });
}

// Открытие модального окна
function openModal(type, id = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const ritualType = document.getElementById('ritualType');
    const ritualId = document.getElementById('ritualId');
    const weeklyDaysContainer = document.getElementById('weeklyDaysContainer');
    const taskDateContainer = document.getElementById('taskDateContainer');
    const deleteBtn = document.getElementById('deleteBtn');

    ritualType.value = type;
    ritualId.value = id || '';

    // Очистка формы
    document.getElementById('ritualName').value = '';
    document.getElementById('ritualTime').value = '';
    document.getElementById('ritualDescription').value = '';
    document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('taskDate').value = '';

    // Настройка заголовка
    const titles = {
        'daily': 'Добавить ежедневный ритуал',
        'weekly': 'Добавить еженедельный ритуал',
        'task': 'Добавить задачу от хозяина'
    };
    modalTitle.textContent = id ? 'Редактировать' : titles[type];

    // Показать/скрыть нужные поля
    weeklyDaysContainer.style.display = type === 'weekly' ? 'block' : 'none';
    taskDateContainer.style.display = type === 'task' ? 'block' : 'none';
    deleteBtn.style.display = id ? 'block' : 'none';

    // Заполнение формы при редактировании
    if (id) {
        let item;
        if (type === 'daily') {
            item = dailyRituals.find(r => r.id === id);
        } else if (type === 'weekly') {
            item = weeklyRituals.find(r => r.id === id);
            if (item && item.days) {
                item.days.forEach(day => {
                    const checkbox = document.querySelector(`.day-checkbox[value="${day}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        } else if (type === 'task') {
            item = tasks.find(t => t.id === id);
            if (item && item.date) {
                document.getElementById('taskDate').value = item.date;
            }
        }

        if (item) {
            document.getElementById('ritualName').value = item.name || '';
            document.getElementById('ritualTime').value = item.time || '';
            document.getElementById('ritualDescription').value = item.description || '';
        }
    }

    modal.style.display = 'block';
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Обработка отправки формы
function handleFormSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('ritualType').value;
    const id = document.getElementById('ritualId').value;
    const name = document.getElementById('ritualName').value;
    const time = document.getElementById('ritualTime').value;
    const description = document.getElementById('ritualDescription').value;

    const item = {
        id: id || generateId(),
        name,
        time,
        description
    };

    if (type === 'daily') {
        if (id) {
            const index = dailyRituals.findIndex(r => r.id === id);
            if (index !== -1) dailyRituals[index] = item;
        } else {
            dailyRituals.push(item);
        }
    } else if (type === 'weekly') {
        const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked'))
            .map(cb => cb.value);
        item.days = selectedDays;
        
        if (id) {
            const index = weeklyRituals.findIndex(r => r.id === id);
            if (index !== -1) weeklyRituals[index] = item;
        } else {
            weeklyRituals.push(item);
        }
    } else if (type === 'task') {
        const date = document.getElementById('taskDate').value;
        item.date = date;
        
        if (id) {
            const index = tasks.findIndex(t => t.id === id);
            if (index !== -1) tasks[index] = item;
        } else {
            tasks.push(item);
        }
    }

    saveData();
    renderCalendar();
    renderRituals();
    closeModal();
}

// Обработка удаления
function handleDelete() {
    const type = document.getElementById('ritualType').value;
    const id = document.getElementById('ritualId').value;

    if (confirm('Вы уверены, что хотите удалить?')) {
        if (type === 'daily') {
            dailyRituals = dailyRituals.filter(r => r.id !== id);
        } else if (type === 'weekly') {
            weeklyRituals = weeklyRituals.filter(r => r.id !== id);
        } else if (type === 'task') {
            tasks = tasks.filter(t => t.id !== id);
        }

        // Удалить все связанные отметки выполнения
        Object.keys(completions).forEach(key => {
            if (key.includes(`${type}-${id}`)) {
                delete completions[key];
            }
        });

        saveData();
        renderCalendar();
        renderRituals();
        closeModal();
    }
}

// Генерация ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Форматирование даты
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Рендеринг календаря
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';

    // Заголовки дней недели
    const dayHeaders = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    // Получаем первый день месяца и количество дней
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Понедельник = 0

    // Обновляем заголовок месяца
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    document.getElementById('currentMonth').textContent = 
        `${monthNames[month]} ${year}`;

    // Пустые ячейки до первого дня
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }

    // Дни месяца
    const today = new Date();
    const todayStr = formatDate(today);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const dayOfWeek = date.getDay();

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (dateStr === todayStr) {
            dayElement.classList.add('today');
        }

        // Номер дня
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        if (dateStr === todayStr) {
            dayNumber.classList.add('today');
        }
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        // События дня
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events';

        // Ежедневные ритуалы
        dailyRituals.forEach(ritual => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-item daily';
            eventElement.textContent = ritual.name;
            eventElement.title = ritual.description || ritual.name;
            
            const completionKey = `${dateStr}-daily-${ritual.id}`;
            if (completions[completionKey]) {
                eventElement.classList.add('completed');
            }
            
            eventElement.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCompletion(completionKey, eventElement);
            });
            
            eventsContainer.appendChild(eventElement);
        });

        // Еженедельные ритуалы
        weeklyRituals.forEach(ritual => {
            if (ritual.days && ritual.days.includes(dayOfWeek.toString())) {
                const eventElement = document.createElement('div');
                eventElement.className = 'event-item weekly';
                eventElement.textContent = ritual.name;
                eventElement.title = ritual.description || ritual.name;
                
                const completionKey = `${dateStr}-weekly-${ritual.id}`;
                if (completions[completionKey]) {
                    eventElement.classList.add('completed');
                }
                
                eventElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleCompletion(completionKey, eventElement);
                });
                
                eventsContainer.appendChild(eventElement);
            }
        });

        // Задачи от хозяина
        tasks.forEach(task => {
            if (task.date === dateStr) {
                const eventElement = document.createElement('div');
                eventElement.className = 'event-item task';
                eventElement.textContent = task.name;
                eventElement.title = task.description || task.name;
                
                const completionKey = `${dateStr}-task-${task.id}`;
                if (completions[completionKey]) {
                    eventElement.classList.add('completed');
                }
                
                eventElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleCompletion(completionKey, eventElement);
                });
                
                eventsContainer.appendChild(eventElement);
            }
        });

        dayElement.appendChild(eventsContainer);
        calendarGrid.appendChild(dayElement);
    }

    // Пустые ячейки после последнего дня
    const totalCells = startingDayOfWeek + daysInMonth;
    const remainingCells = 42 - totalCells; // 6 недель * 7 дней
    for (let i = 0; i < remainingCells && i < 7; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
}

// Переключение выполнения
function toggleCompletion(completionKey, element) {
    if (completions[completionKey]) {
        delete completions[completionKey];
        element.classList.remove('completed');
    } else {
        completions[completionKey] = true;
        element.classList.add('completed');
    }
    saveData();
}

// Рендеринг списка ритуалов
function renderRituals() {
    // Ежедневные ритуалы
    const dailyList = document.getElementById('dailyRituals');
    dailyList.innerHTML = '';
    dailyRituals.forEach(ritual => {
        const li = createRitualItem(ritual, 'daily');
        dailyList.appendChild(li);
    });

    // Еженедельные ритуалы
    const weeklyList = document.getElementById('weeklyRituals');
    weeklyList.innerHTML = '';
    weeklyRituals.forEach(ritual => {
        const li = createRitualItem(ritual, 'weekly');
        weeklyList.appendChild(li);
    });

    // Задачи
    const tasksList = document.getElementById('tasks');
    tasksList.innerHTML = '';
    tasks.forEach(task => {
        const li = createRitualItem(task, 'task');
        tasksList.appendChild(li);
    });
}

// Создание элемента ритуала в списке
function createRitualItem(item, type) {
    const li = document.createElement('li');
    li.className = `ritual-item ${type}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'ritual-item-name';
    nameSpan.textContent = item.name;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'ritual-item-time';
    if (type === 'task' && item.date) {
        const date = new Date(item.date);
        timeSpan.textContent = date.toLocaleDateString('ru-RU');
    } else if (item.time) {
        timeSpan.textContent = item.time;
    } else {
        timeSpan.textContent = '';
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-ritual-btn';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteItem(type, item.id);
    });
    
    li.appendChild(nameSpan);
    li.appendChild(timeSpan);
    li.appendChild(deleteBtn);
    
    li.addEventListener('click', () => {
        openModal(type, item.id);
    });
    
    return li;
}

// Удаление элемента
function handleDeleteItem(type, id) {
    if (confirm('Вы уверены, что хотите удалить?')) {
        if (type === 'daily') {
            dailyRituals = dailyRituals.filter(r => r.id !== id);
        } else if (type === 'weekly') {
            weeklyRituals = weeklyRituals.filter(r => r.id !== id);
        } else if (type === 'task') {
            tasks = tasks.filter(t => t.id !== id);
        }

        // Удалить все связанные отметки выполнения
        Object.keys(completions).forEach(key => {
            if (key.includes(`${type}-${id}`)) {
                delete completions[key];
            }
        });

        saveData();
        renderCalendar();
        renderRituals();
    }
}

