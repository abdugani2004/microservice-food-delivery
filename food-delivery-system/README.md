Food Delivery Microservices System
A modern backend architecture for a food delivery platform built on microservices. This system utilizes RabbitMQ as a message broker to handle asynchronous communication between services, ensuring high availability and scalability.

System Architecture
The system consists of four independent services that communicate via an event-driven model. When an order is placed, it moves through various queues until it reaches the final delivery stage.

[Infrastructure Diagram: Restaurant -> RabbitMQ -> Kitchen/Notification -> Delivery]

Service Overview
1. Restaurant Service (Producer) - Port 3001 The entry point of the system.

Receives and validates incoming customer orders.

Publishes order events to the RabbitMQ exchange.

Provides endpoints for order tracking and cancellation.

2. Kitchen Service (Consumer) Manages the food preparation lifecycle.

Consumes new orders from the queue.

Simulates the cooking process with real-time progress updates (25%, 50%, 75%, 100%).

Publishes a "Ready" event once preparation is complete.

3. Delivery Service (Consumer) Handles logistics and courier management.

Automatically assigns available drivers to ready orders.

Simulates real-time location tracking during the delivery phase.

Updates the final status once the order reaches the customer.

4. Notification Service (Consumer) The communication engine.

Monitors all order-related events across the system.

Dispatches multi-channel notifications (SMS, Email, or Push) based on status changes.

Installation and Setup
Prerequisites
Node.js (v18 or higher)

RabbitMQ (v3.12 or higher)

Package Manager: NPM or Yarn

Local Setup
Clone the repository: git clone <repository-url>

Install dependencies: npm install

RabbitMQ Configuration
If using Docker, you can spin up the RabbitMQ instance with the management UI using: docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management

Running the Services
To start the full system, run each service in a separate terminal window:

npm run restaurant

npm run kitchen

npm run delivery

npm run notification

API Documentation
Create New Order
Endpoint: POST /api/orders Sample Payload:

JSON
{
  "restaurantId": "rest-1",
  "customerId": "cust-123",
  "items": [
    {"name": "Plav", "quantity": 2, "price": 25000}
  ],
  "deliveryAddress": {
    "address": "123 Amir Temur Str, Tashkent",
    "latitude": 41.31,
    "longitude": 69.24
  }
}
Order Workflow
The system processes orders through the following state machine:

PENDING: Order submitted by the customer.

CONFIRMED: Kitchen has accepted the order.

PREPARING: Food is currently being cooked.

READY: Preparation finished; waiting for pickup.

PICKED_UP: Driver has collected the order.

ON_THE_WAY: Courier is in transit to the destination.

DELIVERED: Order successfully handed over to the customer.

Technical Features
Asynchronous Communication: Uses RabbitMQ for loose coupling, allowing services to operate independently.

Fault Tolerance: Implements message acknowledgement (ACK) to ensure no order data is lost during transit or service downtime.

Real-time Simulation: Features simulated preparation and delivery tracking to mimic real-world environments.

Scalability: Each service can be scaled horizontally to handle increased load without affecting other components.

Graceful Shutdown: Ensures that active processes are completed before a service shuts down.

Tech Stack
Runtime: Node.js

Web Framework: Express.js

Message Broker: RabbitMQ (amqplib)

Unique IDs: UUID