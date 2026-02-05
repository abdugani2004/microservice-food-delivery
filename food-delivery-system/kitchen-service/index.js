import RabbitMQConnection from '../shared/rabbitmq.js';
import { QUEUES, EXCHANGES, ROUTING_KEYS, ORDER_STATUS } from '../shared/constants.js';
import { Logger, delay } from '../shared/utils.js';

const rabbitMQ = new RabbitMQConnection();
const activeOrders = new Map();

async function setupRabbitMQ() {
  try {
    await rabbitMQ.connect();
    
    await rabbitMQ.createExchange(EXCHANGES.ORDERS, 'topic');
    await rabbitMQ.createQueue(QUEUES.KITCHEN_ORDERS);
    await rabbitMQ.createQueue(QUEUES.READY_ORDERS);
    
    await rabbitMQ.bindQueue(
      QUEUES.KITCHEN_ORDERS,
      EXCHANGES.ORDERS,
      ROUTING_KEYS.ORDER_CREATED
    );

    await rabbitMQ.bindQueue(
      QUEUES.KITCHEN_ORDERS,
      EXCHANGES.ORDERS,
      ROUTING_KEYS.ORDER_CANCELLED
    );
    
    Logger.success('KITCHEN-SERVICE', 'RabbitMQ muvaffaqiyatli sozlandi');
  } catch (error) {
    Logger.error('KITCHEN-SERVICE', 'RabbitMQ sozlashda xato', error);
    throw error;
  }
}

async function prepareOrder(order) {
  try {
    Logger.info('KITCHEN-SERVICE', `Buyurtma tayyorlanmoqda: ${order.orderId}`, {
      restaurant: order.restaurantName,
      preparationTime: `${order.preparationTime} daqiqa`
    });

    order.status = ORDER_STATUS.PREPARING;
    order.preparingStartedAt = new Date().toISOString();
    
    await rabbitMQ.publishToExchange(
      EXCHANGES.ORDERS,
      ROUTING_KEYS.ORDER_PREPARING,
      order
    );

    const preparationTimeMs = order.preparationTime * 1000; 
    const checkpoints = [25, 50, 75];

    for (const checkpoint of checkpoints) {
      await delay(preparationTimeMs * checkpoint / 100);
      Logger.info('KITCHEN-SERVICE', `Buyurtma ${order.orderId}: ${checkpoint}% tayyor`);
    }

    await delay(preparationTimeMs * 25 / 100);

    order.status = ORDER_STATUS.READY;
    order.readyAt = new Date().toISOString();
    
    Logger.success('KITCHEN-SERVICE', `Buyurtma tayyor: ${order.orderId}`);

    await rabbitMQ.publishToExchange(
      EXCHANGES.ORDERS,
      ROUTING_KEYS.ORDER_READY,
      order
    );

    activeOrders.delete(order.orderId);

  } catch (error) {
    Logger.error('KITCHEN-SERVICE', `Buyurtma tayyorlashda xato: ${order.orderId}`, error);
  }
}

async function consumeOrders() {
  try {
    await rabbitMQ.consume(QUEUES.KITCHEN_ORDERS, async (order) => {
      
      if (order.status === ORDER_STATUS.CANCELLED) {
        Logger.info('KITCHEN-SERVICE', `Bekor qilingan buyurtma: ${order.orderId}`);
        if (activeOrders.has(order.orderId)) {
          activeOrders.delete(order.orderId);
          Logger.info('KITCHEN-SERVICE', `Tayyorlash toxtatildi: ${order.orderId}`);
        }
        return;
      }

      order.status = ORDER_STATUS.CONFIRMED;
      order.confirmedAt = new Date().toISOString();
      
      activeOrders.set(order.orderId, order);

      Logger.success('KITCHEN-SERVICE', `Yangi buyurtma qabul qilindi: ${order.orderId}`);

      await rabbitMQ.publishToExchange(
        EXCHANGES.ORDERS,
        ROUTING_KEYS.ORDER_CONFIRMED,
        order
      );

      prepareOrder(order);
    });

    Logger.success('KITCHEN-SERVICE', 'Buyurtmalarni tinglash boshlandi');
  } catch (error) {
    Logger.error('KITCHEN-SERVICE', 'Buyurtmalarni consume qilishda xato', error);
    throw error;
  }
}

function showActiveOrders() {
  setInterval(() => {
    if (activeOrders.size > 0) {
      console.log('\nACTIVE ORDERS:');
      activeOrders.forEach((order, orderId) => {
        console.log(`   - ${orderId}: ${order.status} (${order.restaurantName})`);
      });
      console.log('');
    }
  }, 30000);
}

async function start() {
  try {
    await setupRabbitMQ();
    await consumeOrders();
    showActiveOrders();
    Logger.success('KITCHEN-SERVICE', 'Servis ishga tushdi va buyurtmalarni kutmoqda');
  } catch (error) {
    Logger.error('KITCHEN-SERVICE', 'Serverni ishga tushirishda xato', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await rabbitMQ.close();
  process.exit(0);
});

start();