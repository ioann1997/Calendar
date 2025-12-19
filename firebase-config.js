// Конфигурация Firebase
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
const db = firebase.firestore();

// В Firebase 10.x persistence включен по умолчанию
// Устаревший метод enablePersistence() больше не нужен и вызывает предупреждения
// Офлайн-режим с поддержкой множественных вкладок работает автоматически
// Если нужно настроить кэширование, используйте FirestoreSettings.cache при инициализации

