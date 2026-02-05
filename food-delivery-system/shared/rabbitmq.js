import amqp from 'amqplib';

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      this.channel = await this.connection.createChannel();
      
      console.log('RabbitMQ ga muvaffaqiyatli ulandi');
      
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection xatosi:', err.message);
      });
      
      this.connection.on('close', () => {
        console.log('RabbitMQ connection yopildi');
      });
      
      return this.channel;
    } catch (error) {
      console.error('RabbitMQ ga ulanishda xato:', error.message);
      throw error;
    }
  }

  async createQueue(queueName, options = { durable: true }) {
    await this.channel.assertQueue(queueName, options);
    console.log(`Queue yaratildi: ${queueName}`);
  }

  async createExchange(exchangeName, exchangeType = 'topic', options = { durable: true }) {
    await this.channel.assertExchange(exchangeName, exchangeType, options);
    console.log(`Exchange yaratildi: ${exchangeName}`);
  }

  async bindQueue(queueName, exchangeName, routingKey) {
    await this.channel.bindQueue(queueName, exchangeName, routingKey);
    console.log(`Queue bog'landi: ${queueName} -> ${exchangeName} [${routingKey}]`);
  }

  async sendToQueue(queueName, message) {
    const messageBuffer = Buffer.from(JSON.stringify(message));
    return this.channel.sendToQueue(queueName, messageBuffer, { persistent: true });
  }

  async publishToExchange(exchangeName, routingKey, message) {
    const messageBuffer = Buffer.from(JSON.stringify(message));
    return this.channel.publish(exchangeName, routingKey, messageBuffer, { persistent: true });
  }

  async consume(queueName, callback, options = { noAck: false }) {
    return this.channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        await callback(content, msg);
        
        if (!options.noAck) {
          this.channel.ack(msg);
        }
      }
    }, options);
  }

  async close() {
    await this.channel.close();
    await this.connection.close();
    console.log('RabbitMQ connection yopildi');
  }
}

export default RabbitMQConnection;