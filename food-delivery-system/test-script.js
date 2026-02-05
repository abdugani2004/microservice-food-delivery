#!/usr/bin/env node

/**
 * Test Script - Food Delivery System
 * Bu script tizimni test qilish uchun sample buyurtmalar yaratadi
 */

const API_URL = 'http://localhost:3001';


const sampleOrders = [
  {
    restaurantId: 'rest-1',
    customerId: 'cust-001',
    customerName: 'Alisher Navoiy',
    phoneNumber: '+998901234567',
    items: [
      { name: 'Osh', quantity: 2, price: 25000 },
      { name: 'Somsa', quantity: 3, price: 5000 }
    ],
    deliveryAddress: {
      address: 'Toshkent sh., Yunusobod t., Amir Temur ko\'chasi 123',
      latitude: 41.311081,
      longitude: 69.240562
    }
  },
  {
    restaurantId: 'rest-2',
    customerId: 'cust-002',
    customerName: 'Bobur Mirzo',
    phoneNumber: '+998902345678',
    items: [
      { name: 'Pepperoni Pizza', quantity: 1, price: 65000 },
      { name: 'Caesar Salad', quantity: 1, price: 25000 },
      { name: 'Coca Cola 1L', quantity: 2, price: 8000 }
    ],
    deliveryAddress: {
      address: 'Toshkent sh., Chilonzor t., Bunyodkor ko\'chasi 45',
      latitude: 41.275432,
      longitude: 69.203167
    }
  },
  {
    restaurantId: 'rest-1',
    customerId: 'cust-003',
    customerName: 'Zarina Saidova',
    phoneNumber: '+998903456789',
    items: [
      { name: 'Lag\'mon', quantity: 2, price: 22000 },
      { name: 'Manti', quantity: 10, price: 3000 }
    ],
    deliveryAddress: {
      address: 'Toshkent sh., Mirzo Ulug\'bek t., Mustaqillik ko\'chasi 78',
      latitude: 41.323782,
      longitude: 69.289051
    }
  }
];


async function createOrder(orderData) {
  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(` Buyurtma yaratildi: ${data.order.orderId}`);
      console.log(`   Mijoz: ${orderData.customerName}`);
      console.log(`   Restaurant: ${orderData.restaurantId}`);
      console.log(`   Summa: ${data.order.totalAmount} so'm`);
      console.log(`   Status: ${data.order.status}\n`);
      return data.order;
    } else {
      console.error(` Xato: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌Network xato: ${error.message}`);
    return null;
  }
}


async function getAllOrders() {
  try {
    const response = await fetch(`${API_URL}/api/orders`);
    const data = await response.json();
    
    console.log(`\n📊 Jami buyurtmalar: ${data.total}`);
    data.orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ID: ${order.orderId}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Mijoz: ${order.customerName}`);
      console.log(`   Restaurant: ${order.restaurantName}`);
    });
  } catch (error) {
    console.error(` Xato: ${error.message}`);
  }
}


async function cancelOrder(orderId) {
  try {
    const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(` Buyurtma bekor qilindi: ${orderId}\n`);
    } else {
      console.error(`Xato: ${data.error}\n`);
    }
  } catch (error) {
    console.error(`Xato: ${error.message}\n`);
  }
}


function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function runTests() {
  console.log(' Food Delivery System Test Boshlandi\n');
  console.log('=' .repeat(60) + '\n');

  
  console.log(' Test 1: Buyurtmalar yaratish\n');
  const createdOrders = [];
  
  for (const orderData of sampleOrders) {
    const order = await createOrder(orderData);
    if (order) {
      createdOrders.push(order);
    }
    await delay(2000); // 2 sekund kutish
  }

  
  console.log('\n' + '='.repeat(60));
  console.log(' Test 2: Barcha buyurtmalarni ko\'rish');
  await getAllOrders();
  
  console.log('\n' + '='.repeat(60));
  console.log(' Test 3: Buyurtmalar bekor qilish');
  for (const order of createdOrders) {
    await cancelOrder(order.orderId);
  }

  console.log('\n' + '='.repeat(60));
  console.log(' Testlar tugadi!\n');
  console.log(' Maslahat: Servislar loglarini kuzatib, jarayonni ko\'ring\n');
}


console.log('⏳ Restaurant Service ga ulanish kutilmoqda...\n');


setTimeout(() => {
  runTests().catch(error => {
    console.error(' Test xatosi:', error);
    process.exit(1);
  });
}, 3000);
