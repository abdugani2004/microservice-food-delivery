import { randomUUID } from 'crypto';

export function generateId() {
  return randomUUID();
}

export function generateRandomTime(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateEstimatedDeliveryTime(preparationTime, deliveryTime) {
  const currentTime = new Date();
  const totalMinutes = preparationTime + deliveryTime;
  currentTime.setMinutes(currentTime.getMinutes() + totalMinutes);
  return currentTime;
}

export function formatTime(date) {
  return date.toLocaleTimeString('uz-UZ', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export class Logger {
  static log(service, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${service}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  static error(service, message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${service}] ❌ ${message}`);
    if (error) {
      console.error(error);
    }
  }

  static success(service, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${service}] ✅ ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  static info(service, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${service}] ℹ️  ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  generateId,
  generateRandomTime,
  calculateEstimatedDeliveryTime,
  formatTime,
  Logger,
  delay
};