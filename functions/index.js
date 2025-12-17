const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
admin.initializeApp();

// Функция, которая запускается каждую минуту и проверяет напоминания
exports.checkAndSendReminders = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'Europe/Moscow', // ⚠️ ИЗМЕНИ НА СВОЙ ЧАСОВОЙ ПОЯС (например: 'Europe/Moscow', 'America/New_York')
    memory: '256MiB',
    maxInstances: 1
  },
  async (event) => {
    console.log('🦉 Проверка напоминаний...');
    
    const db = admin.firestore();
    const now = new Date();
    
    // Получаем текущее время в формате HH:MM
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Получаем текущий день недели
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    
    console.log(`⏰ Текущее время: ${currentTime}, День: ${currentDay}`);
    
    try {
      // Получаем все календари
      const calendarsSnapshot = await db.collection('calendars').get();
      
      if (calendarsSnapshot.empty) {
        console.log('📭 Нет календарей');
        return null;
      }
      
      let totalSent = 0;
      
      // Проходим по всем календарям
      for (const calendarDoc of calendarsSnapshot.docs) {
        const calendarId = calendarDoc.id;
        const data = calendarDoc.data();
        
        // Получаем FCM токены для этого календаря
        const fcmTokens = data.fcmTokens || [];
        
        if (fcmTokens.length === 0) {
          console.log(`📱 Календарь ${calendarId}: нет FCM токенов (пользователь не установил приложение)`);
          continue;
        }
        
        // Проверяем ежедневные ритуалы
        const daily = data.daily || [];
        for (const item of daily) {
          if (item.reminder && item.time === currentTime && !item.completed) {
            const message = {
              notification: {
                title: '🦉 Напоминание',
                body: `Ежедневный ритуал: ${item.name}`
              },
              tokens: fcmTokens
            };
            
            try {
              const response = await admin.messaging().sendMulticast(message);
              console.log(`✅ Ежедневный ритуал "${item.name}": отправлено ${response.successCount} уведомлений`);
              totalSent += response.successCount;
              
              if (response.failureCount > 0) {
                console.log(`❌ Ошибок: ${response.failureCount}`);
              }
            } catch (error) {
              console.error('❌ Ошибка отправки ежедневного ритуала:', error);
            }
          }
        }
        
        // Проверяем задачи от Господина
        const master = data.master || [];
        for (const item of master) {
          if (item.reminder && item.time === currentTime && !item.completed) {
            const message = {
              notification: {
                title: '🦉 Напоминание',
                body: `Задача от Господина: ${item.name}`
              },
              tokens: fcmTokens
            };
            
            try {
              const response = await admin.messaging().sendMulticast(message);
              console.log(`✅ Задача от Господина "${item.name}": отправлено ${response.successCount} уведомлений`);
              totalSent += response.successCount;
            } catch (error) {
              console.error('❌ Ошибка отправки задачи от Господина:', error);
            }
          }
        }
        
        // Проверяем еженедельные ритуалы
        const weekly = data.weekly || [];
        for (const item of weekly) {
          if (item.reminder && item.day === currentDay && item.time === currentTime && !item.completed) {
            const message = {
              notification: {
                title: '🦉 Напоминание',
                body: `Еженедельный ритуал: ${item.name}`
              },
              tokens: fcmTokens
            };
            
            try {
              const response = await admin.messaging().sendMulticast(message);
              console.log(`✅ Еженедельный ритуал "${item.name}": отправлено ${response.successCount} уведомлений`);
              totalSent += response.successCount;
            } catch (error) {
              console.error('❌ Ошибка отправки еженедельного ритуала:', error);
            }
          }
        }
      }
      
      if (totalSent > 0) {
        console.log(`🎉 Всего отправлено уведомлений: ${totalSent}`);
      } else {
        console.log('✅ Проверка завершена, напоминаний нет');
      }
      
      return null;
    } catch (error) {
      console.error('❌ Критическая ошибка:', error);
      return null;
    }
  }
);
