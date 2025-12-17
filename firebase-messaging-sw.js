// Service Worker для Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Конфигурация Firebase (должна совпадать с firebase-config.js)
const firebaseConfig = {
    apiKey: "AIzaSyDO51kaGWiPumsy6dB45bU9PjTUKJz7rtA",
    authDomain: "calendar-b87ed.firebaseapp.com",
    projectId: "calendar-b87ed",
    storageBucket: "calendar-b87ed.firebasestorage.app",
    messagingSenderId: "1034174840328",
    appId: "1:1034174840328:web:c9efffff44fbbe69d39bbd",
    measurementId: "G-2QVV1VDYEP"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Инициализация Firebase Cloud Messaging
const messaging = firebase.messaging();

// Обработка фоновых сообщений
messaging.onBackgroundMessage((payload) => {
    console.log('[FCM] Получено фоновое сообщение:', payload);
    
    const notificationTitle = payload.notification?.title || 'Напоминание';
    const notificationOptions = {
        body: payload.notification?.body || 'Не забудь о важном!',
        icon: payload.notification?.icon || '/calendar/icon-192.png',
        badge: '/calendar/icon-192.png',
        tag: payload.data?.tag || 'reminder',
        data: payload.data || {},
        requireInteraction: false,
        vibrate: [200, 100, 200],
        actions: [
            {
                action: 'open',
                title: 'Открыть'
            },
            {
                action: 'close',
                title: 'Закрыть'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
    console.log('[FCM] Клик по уведомлению:', event);
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Если есть открытое окно, фокусируемся на нем
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes('/calendar') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Если нет открытого окна, открываем новое
                if (clients.openWindow) {
                    return clients.openWindow('/calendar/');
                }
            })
    );
});
