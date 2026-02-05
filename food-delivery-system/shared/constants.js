export const QUEUES = {
  NEW_ORDERS: 'new_orders_queue',
  KITCHEN_ORDERS: 'kitchen_orders_queue',
  READY_ORDERS: 'ready_orders_queue',
  DELIVERY_ORDERS: 'delivery_orders_queue',
  NOTIFICATIONS: 'notifications_queue'
};

export const EXCHANGES = {
  ORDERS: 'orders_exchange',
  NOTIFICATIONS: 'notifications_exchange'
};

export const ROUTING_KEYS = {
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_PREPARING: 'order.preparing',
  ORDER_READY: 'order.ready',
  ORDER_PICKED_UP: 'order.picked_up',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  NOTIFY_CUSTOMER: 'notify.customer',
  NOTIFY_DRIVER: 'notify.driver',
  NOTIFY_RESTAURANT: 'notify.restaurant'
};

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  ON_THE_WAY: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

export const NOTIFICATION_TYPES = {
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  PUSH: 'PUSH'
};

export default {
  QUEUES,
  EXCHANGES,
  ROUTING_KEYS,
  ORDER_STATUS,
  NOTIFICATION_TYPES
};