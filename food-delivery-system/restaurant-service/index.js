import express from 'express';
import RabbitMQConnection from '../shared/rabbitmq.js';
import { QUEUES, EXCHANGES, ROUTING_KEYS, ORDER_STATUS } from '../shared/constants.js';
import { generateId, Logger, calculateEstimatedDeliveryTime, generateRandomTime } from '../shared/utils.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const rabbitMQ = new RabbitMQConnection();

const orders = new Map();
const restaurants = new Map();

restaurants.set('rest-1', {
  id: 'rest-1',
  name: 'Osh Markazi',
  cuisine: 'Ozbek oshxonasi',
  averagePreparationTime: 30
});

restaurants.set('rest-2', {
  id: 'rest-2',
  name: 'Pizza Palace',
  cuisine: 'Italyan',
  averagePreparationTime: 20
});

async function setupRabbitMQ() {
  try {
    await rabbitMQ.connect();
    await rabbitMQ.createExchange(EXCHANGES.ORDERS, 'topic');
    await rabbitMQ.createQueue(QUEUES.NEW_ORDERS);
    await rabbitMQ.createQueue(QUEUES.KITCHEN_ORDERS);
    Logger.success('RESTAURANT-SERVICE', 'RabbitMQ muvaffaqiyatli sozlandi');
  } catch (error) {
    Logger.error('RESTAURANT-SERVICE', 'RabbitMQ sozlashda xato', error);
    process.exit(1);
  }
}

app.post('/api/orders', async (req, res) => {
  try {
    const { restaurantId, customerId, customerName, items, deliveryAddress, phoneNumber } = req.body;

    if (!restaurantId || !customerId || !items || !deliveryAddress) {
      return res.status(400).json({ error: 'Barcha kerakli malumotlarni kiriting' });
    }

    const restaurant = restaurants.get(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant topilmadi' });
    }

    const orderId = generateId();
    const preparationTime = restaurant.averagePreparationTime;
    const deliveryTime = generateRandomTime(15, 30);
    const estimatedDeliveryTime = calculateEstimatedDeliveryTime(preparationTime, deliveryTime);

    const order = {
      orderId,
      restaurantId,
      restaurantName: restaurant.name,
      customerId,
      customerName,
      items,
      deliveryAddress,
      phoneNumber,
      status: ORDER_STATUS.PENDING,
      preparationTime,
      estimatedDeliveryTime: estimatedDeliveryTime.toISOString(),
      createdAt: new Date().toISOString(),
      totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    };

    orders.set(orderId, order);

    await rabbitMQ.publishToExchange(
      EXCHANGES.ORDERS,
      ROUTING_KEYS.ORDER_CREATED,
      order
    );

    Logger.success('RESTAURANT-SERVICE', `Yangi buyurtma yaratildi: ${orderId}`, {
      orderId,
      restaurant: restaurant.name,
      items: items.length
    });

    res.status(201).json({
      success: true,
      message: 'Buyurtma qabul qilindi',
      order: {
        orderId,
        status: order.status,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    Logger.error('RESTAURANT-SERVICE', 'Buyurtma yaratishda xato', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.get('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.get(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Buyurtma topilmadi' });
  }
  res.json({ success: true, order });
});

app.get('/api/orders', (req, res) => {
  const allOrders = Array.from(orders.values());
  res.json({ 
    success: true, 
    total: allOrders.length,
    orders: allOrders 
  });
});

app.delete('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = orders.get(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
    }

    if (![ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(order.status)) {
      return res.status(400).json({ 
        error: `${order.status} statusdagi buyurtmani bekor qilib bolmaydi` 
      });
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.cancelledAt = new Date().toISOString();

    await rabbitMQ.publishToExchange(
      EXCHANGES.ORDERS,
      ROUTING_KEYS.ORDER_CANCELLED,
      order
    );

    Logger.info('RESTAURANT-SERVICE', `Buyurtma bekor qilindi: ${orderId}`);

    res.json({ 
      success: true, 
      message: 'Buyurtma bekor qilindi',
      order 
    });
  } catch (error) {
    Logger.error('RESTAURANT-SERVICE', 'Buyurtmani bekor qilishda xato', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.get('/api/restaurants', (req, res) => {
  const restaurantList = Array.from(restaurants.values());
  res.json({ success: true, restaurants: restaurantList });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'restaurant-service',
    timestamp: new Date().toISOString()
  });
});

async function start() {
  try {
    await setupRabbitMQ();
    app.listen(PORT, () => {
      Logger.success('RESTAURANT-SERVICE', `Server ${PORT} portda ishlamoqda`);
      console.log(`\nAPI Endpoints:`);
      console.log(`   POST   http://localhost:${PORT}/api/orders`);
      console.log(`   GET    http://localhost:${PORT}/api/orders/:orderId`);
      console.log(`   GET    http://localhost:${PORT}/api/orders`);
      console.log(`   DELETE http://localhost:${PORT}/api/orders/:orderId`);
      console.log(`   GET    http://localhost:${PORT}/api/restaurants`);
      console.log(`   GET    http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    Logger.error('RESTAURANT-SERVICE', 'Serverni ishga tushirishda xato', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  Logger.info('RESTAURANT-SERVICE', 'Shutting down...');
  await rabbitMQ.close();
  process.exit(0);
});

start();