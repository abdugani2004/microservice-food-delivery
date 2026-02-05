import RabbitMQConnection from '../shared/rabbitmq.js';
import { QUEUES, EXCHANGES, ROUTING_KEYS, ORDER_STATUS, NOTIFICATION_TYPES } from '../shared/constants.js';
import { Logger, formatTime } from '../shared/utils.js';

const rabbitMQ = new RabbitMQConnection();
const notificationHistory = [];

async function setupRabbitMQ() {
  try {
    await rabbitMQ.connect();
    await rabbitMQ.createExchange(EXCHANGES.ORDERS, 'topic');
    await rabbitMQ.createQueue(QUEUES.NOTIFICATIONS);
    
    const routingKeys = [
      ROUTING_KEYS.ORDER_CREATED,
      ROUTING_KEYS.ORDER_CONFIRMED,
      ROUTING_KEYS.ORDER_PREPARING,
      ROUTING_KEYS.ORDER_READY,
      ROUTING_KEYS.ORDER_PICKED_UP,
      ROUTING_KEYS.ORDER_DELIVERED,
      ROUTING_KEYS.ORDER_CANCELLED
    ];

    for (const key of routingKeys) {
      await rabbitMQ.bindQueue(QUEUES.NOTIFICATIONS, EXCHANGES.ORDERS, key);
    }
    
    Logger.success('NOTIFICATION-SERVICE', 'RabbitMQ muvaffaqiyatli sozlandi');
  } catch (error) {
    Logger.error('NOTIFICATION-SERVICE', 'RabbitMQ sozlashda xato', error);
    throw error;
  }
}

async function sendSMS(phoneNumber, message) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`\nSMS yuborildi: ${phoneNumber}`);
      console.log(`   Xabar: ${message}\n`);
      resolve({ success: true, channel: 'SMS' });
    }, 500);
  });
}

async function sendEmail(email, subject, message) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`\nEmail yuborildi: ${email}`);
      console.log(`   Mavzu: ${subject}`);
      console.log(`   Xabar: ${message}\n`);
      resolve({ success: true, channel: 'EMAIL' });
    }, 500);
  });
}

async function sendPushNotification(userId, title, message) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`\nPush Notification: ${userId}`);
      console.log(`   ${title}`);
      console.log(`   ${message}\n`);
      resolve({ success: true, channel: 'PUSH' });
    }, 300);
  });
}

async function createAndSendNotification(order, eventType) {
  try {
    const notifications = [];
    
    switch (order.status) {
      case ORDER_STATUS.PENDING:
      case ORDER_STATUS.CONFIRMED:
        notifications.push({
          type: NOTIFICATION_TYPES.SMS,
          to: order.phoneNumber,
          message: `Assalomu alaykum ${order.customerName}! Buyurtmangiz #${order.orderId.slice(0, 8)} qabul qilindi. ${order.restaurantName} tayyorlamoqda.`
        });
        notifications.push({
          type: NOTIFICATION_TYPES.PUSH,
          to: order.customerId,
          title: 'Buyurtma qabul qilindi',
          message: `${order.restaurantName} buyurtmangizni tayyorlayapti`
        });
        break;

      case ORDER_STATUS.PREPARING:
        notifications.push({
          type: NOTIFICATION_TYPES.PUSH,
          to: order.customerId,
          title: 'Buyurtma tayyorlanmoqda',
          message: `Oshpazlarimiz buyurtmangiz ustida ishlamoqda`
        });
        break;

      case ORDER_STATUS.READY:
        notifications.push({
          type: NOTIFICATION_TYPES.SMS,
          to: order.phoneNumber,
          message: `Buyurtmangiz #${order.orderId.slice(0, 8)} tayyor! Kuryer yo'lda.`
        });
        notifications.push({
          type: NOTIFICATION_TYPES.PUSH,
          to: order.customerId,
          title: 'Buyurtma tayyor!',
          message: 'Kuryer yo\'lda. Tez orada yetib boradi.'
        });
        break;

      case ORDER_STATUS.PICKED_UP:
        notifications.push({
          type: NOTIFICATION_TYPES.SMS,
          to: order.phoneNumber,
          message: `${order.driver.name} buyurtmangizni oldi va yo'lga chiqdi.`
        });
        notifications.push({
          type: NOTIFICATION_TYPES.PUSH,
          to: order.customerId,
          title: 'Yo\'lda!',
          message: `Kuryer: ${order.driver.name} (${order.driver.vehicleType})`
        });
        break;

      case ORDER_STATUS.DELIVERED:
        notifications.push({
          type: NOTIFICATION_TYPES.SMS,
          to: order.phoneNumber,
          message: `Buyurtmangiz yetkazildi! Rahmat!`
        });
        notifications.push({
          type: NOTIFICATION_TYPES.EMAIL,
          to: order.customerId + '@example.com',
          subject: 'Buyurtma yetkazildi',
          message: `Hurmatli ${order.customerName}, buyurtmangiz muvaffaqiyatli yetkazildi.`
        });
        break;

      case ORDER_STATUS.CANCELLED:
        notifications.push({
          type: NOTIFICATION_TYPES.SMS,
          to: order.phoneNumber,
          message: `Buyurtmangiz #${order.orderId.slice(0, 8)} bekor qilindi.`
        });
        notifications.push({
          type: NOTIFICATION_TYPES.PUSH,
          to: order.customerId,
          title: 'Buyurtma bekor qilindi',
          message: 'Buyurtmangiz bekor qilindi'
        });
        break;
    }

    for (const notification of notifications) {
      let result;
      if (notification.type === NOTIFICATION_TYPES.SMS) result = await sendSMS(notification.to, notification.message);
      else if (notification.type === NOTIFICATION_TYPES.EMAIL) result = await sendEmail(notification.to, notification.subject, notification.message);
      else if (notification.type === NOTIFICATION_TYPES.PUSH) result = await sendPushNotification(notification.to, notification.title, notification.message);

      notificationHistory.push({
        orderId: order.orderId,
        status: order.status,
        type: notification.type,
        sentAt: new Date().toISOString(),
        ...result
      });

      Logger.success('NOTIFICATION-SERVICE', `${notification.type} yuborildi`, { orderId: order.orderId.slice(0, 8) });
    }
  } catch (error) {
    Logger.error('NOTIFICATION-SERVICE', 'Notification yuborishda xato', error);
  }
}

async function consumeOrderEvents() {
  try {
    await rabbitMQ.consume(QUEUES.NOTIFICATIONS, async (order) => {
      Logger.info('NOTIFICATION-SERVICE', `Event qabul qilindi: ${order.status}`, { orderId: order.orderId.slice(0, 8) });
      await createAndSendNotification(order, order.status);
    });
    Logger.success('NOTIFICATION-SERVICE', 'Eventlarni tinglash boshlandi');
  } catch (error) {
    Logger.error('NOTIFICATION-SERVICE', 'Eventlarni consume qilishda xato', error);
    throw error;
  }
}

function showStats() {
  setInterval(() => {
    if (notificationHistory.length > 0) {
      console.log('\nNOTIFICATION STATISTICS:');
      console.log(`   Jami: ${notificationHistory.length}`);
      console.log(`   SMS: ${notificationHistory.filter(n => n.type === 'SMS').length} | Email: ${notificationHistory.filter(n => n.type === 'EMAIL').length} | Push: ${notificationHistory.filter(n => n.type === 'PUSH').length}\n`);
    }
  }, 60000);
}

async function start() {
  try {
    await setupRabbitMQ();
    await consumeOrderEvents();
    showStats();
    Logger.success('NOTIFICATION-SERVICE', 'Servis ishga tushdi');
  } catch (error) {
    Logger.error('NOTIFICATION-SERVICE', 'Serverni ishga tushirishda xato', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await rabbitMQ.close();
  process.exit(0);
});

start();