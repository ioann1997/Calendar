// Service Worker для PWA и Firebase Cloud Messaging
// Версия кэша - обновляй при изменении файлов
const CACHE_NAME = 'sovinaya-napominalka-v6';
const RUNTIME_CACHE = 'runtime-cache-v5';

// Определяем базовый путь автоматически (для GitHub Pages)
// Если sw.js находится в /calendar/sw.js, то BASE_PATH будет /calendar
const BASE_PATH = (() => {
  let path = self.location.pathname.split('/sw.js')[0] || '';
  // Убираем завершающий слэш, если он есть (кроме корня)
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
})();

// Файлы для кэширования при установке
const STATIC_CACHE_URLS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/styles.css',
  BASE_PATH + '/script.js',
  BASE_PATH + '/firebase-config.js',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/icon-192.png',
  BASE_PATH + '/icon-512.png',
  // FullCalendar CSS не нужен - стили встроены в JS файл
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js'
];

// Импорт Firebase для Cloud Messaging
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

// Обработка фоновых сообщений от Firebase
messaging.onBackgroundMessage((payload) => {
    console.log('[FCM] Получено фоновое сообщение:', payload);
    
    // Извлекаем данные из payload
    // Firebase отправляет данные в формате: { notification: { title, body }, data: {...} }
    const notification = payload.notification || {};
    const data = payload.data || {};
    
    // Используем данные из notification (правильный текст из getRandomReminderMessage)
    // или из data, если notification нет
    const notificationTitle = notification.title || data.title || '🦉 Напоминание';
    const notificationBody = notification.body || data.body || 'Не забудь о важном!';
    
    console.log('[FCM] Показываем уведомление:', {
        title: notificationTitle,
        body: notificationBody,
        hasNotification: !!notification.body,
        hasData: !!data.body
    });
    
    const notificationOptions = {
        body: notificationBody,
        icon: notification.icon || BASE_PATH + '/icon-192.png',
        badge: BASE_PATH + '/icon-192.png',
        tag: data.tag || 'reminder',
        data: data,
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

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Установка Service Worker, BASE_PATH:', BASE_PATH);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кэширование статических файлов');
        // Кэшируем файлы по одному, чтобы ошибка одного не блокировала остальные
        return Promise.allSettled(
          STATIC_CACHE_URLS.map(url => {
            const request = new Request(url, { cache: 'reload' });
            return fetch(request)
              .then(response => {
                if (response.ok) {
                  return cache.put(request, response);
                } else {
                  console.warn('[SW] Не удалось загрузить:', url, response.status);
                }
              })
              .catch(error => {
                console.warn('[SW] Ошибка загрузки:', url, error);
              });
          })
        );
      })
      .catch((error) => {
        console.error('[SW] Ошибка кэширования:', error);
      })
  );
  self.skipWaiting(); // Активируем сразу
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Удаляем старые кэши
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Берем контроль над всеми страницами
});

// Перехват запросов (стратегия: Network First, Fallback to Cache)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем запросы к Firebase и другим внешним API
  if (url.origin.includes('firebase') || url.origin.includes('googleapis')) {
    return; // Используем сеть напрямую
  }

  // Для статических файлов используем Network First с проверкой обновлений
  if (STATIC_CACHE_URLS.some(staticUrl => request.url.includes(staticUrl.split('/').pop()))) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          // Всегда используем свежий ответ из сети
          if (response.status === 200) {
            // Обновляем кэш в фоне
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Только если сеть недоступна, используем кэш
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse;
          });
        })
    );
    return;
  }

  // Для HTML страниц используем Network First с проверкой обновлений
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          // Всегда используем свежий HTML из сети
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Если сеть недоступна, используем кэш
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Если нет в кэше, возвращаем офлайн страницу
            return caches.match(BASE_PATH + '/index.html');
          });
        })
    );
    return;
  }

  // Для остальных запросов - Network First с проверкой обновлений
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        // Всегда используем свежий ответ из сети
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Используем кэш только при ошибке сети
        return caches.match(request);
      })
  );
});

// Обработка push-уведомлений
// ПРИМЕЧАНИЕ: Firebase Cloud Messaging обрабатывается через onBackgroundMessage
// Этот обработчик может срабатывать для других типов push-уведомлений
// Но если onBackgroundMessage не сработал, этот обработчик должен правильно извлечь данные
self.addEventListener('push', (event) => {
  console.log('[SW] Получено push-уведомление');
  
  // Если это Firebase Cloud Messaging, оно должно обрабатываться через onBackgroundMessage
  // Но на всякий случай обрабатываем и здесь
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Данные push-уведомления:', data);
      
      // Извлекаем данные из Firebase Cloud Messaging формата
      // Firebase отправляет данные в формате: { notification: { title, body }, data: {...} }
      const notification = data.notification || {};
      
      // Если есть поле notification, Firebase должен показать уведомление автоматически
      // Но если по какой-то причине это не произошло, показываем вручную
      if (notification.title || notification.body) {
        const notificationData = {
          title: notification.title || '🦉 Напоминание',
          body: notification.body || 'Не забудь о важном!',
          icon: notification.icon || BASE_PATH + '/icon-192.png',
          badge: BASE_PATH + '/icon-192.png',
          tag: data.data?.tag || 'reminder',
          data: data.data || {},
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
        
        console.log('[SW] Показываем уведомление из push-обработчика:', notificationData);
        event.waitUntil(
          self.registration.showNotification(notificationData.title, notificationData)
        );
        return;
      }
    } catch (e) {
      console.error('[SW] Ошибка обработки push-уведомления:', e);
    }
  }
  
  // Если данные не распарсились или нет notification, не показываем дефолтное уведомление
  // Firebase должен показать уведомление автоматически через onBackgroundMessage
  console.log('[SW] Push-уведомление обработано, но не показано (ожидается обработка через onBackgroundMessage)');
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Клик по уведомлению');
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Если есть открытое окно, фокусируемся на нем
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Если нет открытого окна, открываем новое
        if (clients.openWindow) {
          return clients.openWindow(BASE_PATH + '/');
        }
      })
  );
});

// Обработка сообщений от основного потока
self.addEventListener('message', (event) => {
  console.log('[SW] Получено сообщение:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});
