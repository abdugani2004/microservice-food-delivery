import RabbitMQConnection from '../shared/rabbitmq.js';
import { QUEUES, EXCHANGES, ROUTING_KEYS, ORDER_STATUS } from '../shared/constants.js';
import { Logger, delay, generateRandomTime, generateId } from '../shared/utils.js';

const rabbitMQ = new RabbitMQConnection();
const activeDeliveries = new Map();
const drivers = new Map();

const sampleDrivers = [
  { id: 'driver-1', name: 'Aziz Rahimov', phone: '+998901234567', vehicleType: 'Mototsikl', rating: 4.8 },
  { id: 'driver-2', name: 'Bobur Karimov', phone: '+998902345678', vehicleType: 'Mashina', rating: 4.9 },
  { id: 'driver-3', name: 'Dilshod Toshmatov', phone: '+998903456789', vehicleType: 'Mototsikl', rating: 4.7 },
  { id: 'driver-4', name: 'Eldor Sharipov', phone: '+998904567890', vehicleType: 'Velosiped', rating: 4.6 }
];

sampleDrivers.forEach(driver => {
  drivers.set(driver.id, { ...driver, isAvailable: true, currentOrder: null });
});

async function setupRabbitMQ() {
  try {
    await rabbitMQ.connect();
    await rabbitMQ.createExchange(EXCHANGES.ORDERS, 'topic');
    await rabbitMQ.createQueue(QUEUES.DELIVERY_ORDERS);
    
    await rabbitMQ.bindQueue(QUEUES.DELIVERY_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_READY);
    await rabbitMQ.bindQueue(QUEUES.DELIVERY_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_CANCELLED);
    
    Logger.success('DELIVERY-SERVICE', 'RabbitMQ muvaffaqiyatli sozlandi');
  } catch (error) {
    Logger.error('DELIVERY-SERVICE', 'RabbitMQ sozlashda xato', error);
    throw error;
  }
}

function findAvailableDriver() {
  for (const [driverId, driver] of drivers.entries()) {
    if (driver.isAvailable) return driver;
  }
  return null;
}

function assignDriver(order) {
  const driver = findAvailableDriver();
  if (!driver) {
    Logger.error('DELIVERY-SERVICE', 'Bosh driver topilmadi!');
    return null;
  }
  driver.isAvailable = false;
  driver.currentOrder = order.orderId;
  return driver;
}

async function deliverOrder(order, driver) {
  try {
    order.status = ORDER_STATUS.PICKED_UP;
    order.pickedUpAt = new Date().toISOString();
    order.driver = {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      rating: driver.rating
    };

    Logger.info('DELIVERY-SERVICE', `Buyurtma olinmoqda: ${order.orderId}`, {
      driver: driver.name,
      vehicle: driver.vehicleType
    });

    await rabbitMQ.publishToExchange(EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_PICKED_UP, order);
    await delay(3000);

    order.status = ORDER_STATUS.ON_THE_WAY;
    order.onTheWayAt = new Date().toISOString();

    Logger.info('DELIVERY-SERVICE', `Yolda: ${order.orderId}`, {
      destination: order.deliveryAddress.address
    });

    const deliveryTimeSeconds = generateRandomTime(15, 30);
    const totalSteps = 5;
    const stepDelay = (deliveryTimeSeconds * 1000) / totalSteps;

    const locations = [
      'Restaurantdan chiqildi',
      'Shahar markazidan otmoqda',
      'Manzilga yaqinlashmoqda',
      'Manzilga 5 daqiqa qoldi',
      'Manzilga yetib kelindi'
    ];

    for (let i = 0; i < locations.length; i++) {
      await delay(stepDelay);
      Logger.info('DELIVERY-SERVICE', `${order.orderId}: ${locations[i]}`);
    }

    order.status = ORDER_STATUS.DELIVERED;
    order.deliveredAt = new Date().toISOString();
    
    Logger.success('DELIVERY-SERVICE', `Buyurtma yetkazildi: ${order.orderId}`);

    await rabbitMQ.publishToExchange(EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_DELIVERED, order);

    driver.isAvailable = true;
    driver.currentOrder = null;
    activeDeliveries.delete(order.orderId);

  } catch (error) {
    Logger.error('DELIVERY-SERVICE', `Yetkazib berishda xato: ${order.orderId}`, error);
    driver.isAvailable = true;
    driver.currentOrder = null;
  }
}

async function consumeOrders() {
  try {
    await rabbitMQ.consume(QUEUES.DELIVERY_ORDERS, async (order) => {
      if (order.status === ORDER_STATUS.CANCELLED) {
        Logger.info('DELIVERY-SERVICE', `Bekor qilingan buyurtma: ${order.orderId}`);
        if (activeDeliveries.has(order.orderId)) {
          const delivery = activeDeliveries.get(order.orderId);
          const driver = drivers.get(delivery.driverId);
          if (driver) {
            driver.isAvailable = true;
            driver.currentOrder = null;
          }
          activeDeliveries.delete(order.orderId);
          Logger.info('DELIVERY-SERVICE', `Yetkazib berish toxtatildi: ${order.orderId}`);
        }
        return;
      }

      Logger.success('DELIVERY-SERVICE', `Tayyor buyurtma qabul qilindi: ${order.orderId}`);
      const driver = assignDriver(order);

      if (!driver) {
        Logger.error('DELIVERY-SERVICE', 'Driver topilmadi, buyurtma navbatda qoladi');
        return;
      }

      activeDeliveries.set(order.orderId, {
        orderId: order.orderId,
        driverId: driver.id,
        startedAt: new Date().toISOString()
      });

      deliverOrder(order, driver);
    });
    Logger.success('DELIVERY-SERVICE', 'Tayyor buyurtmalarni tinglash boshlandi');
  } catch (error) {
    Logger.error('DELIVERY-SERVICE', 'Buyurtmalarni consume qilishda xato', error);
    throw error;
  }
}

function showDriverStats() {
  setInterval(() => {
    console.log('\nDRIVER STATUS:');
    drivers.forEach((driver) => {
      const status = driver.isAvailable ? 'Bosho' : `Band (${driver.currentOrder})`;
      console.log(`   - ${driver.name} (${driver.vehicleType}): ${status}`);
    });
    console.log('');
  }, 30000);
}

async function start() {
  try {
    await setupRabbitMQ();
    await consumeOrders();
    showDriverStats();
    Logger.success('DELIVERY-SERVICE', 'Servis ishga tushdi');
  } catch (error) {
    Logger.error('DELIVERY-SERVICE', 'Serverni ishga tushirishda xato', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await rabbitMQ.close();
  process.exit(0);
});

start();