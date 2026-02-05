Food Delivery System - Architecture Document
Overview
This system follows an Event-Driven Microservices architecture. Service communication is handled asynchronously via RabbitMQ , ensuring loose coupling and high availability.

Component Roles
Restaurant Service (API Gateway)

Acts as the entry point for customer HTTP requests.

Validates orders and publishes theorder.created event.

Provides REST endpoints for order status tracking.

Kitchen Service (Consumer)

Manages food preparation logic.

Simulates cooking progress (25% to 100%).

Publishes theorder.ready event upon completion.

Delivery Service (Consumer)

Handles logistics and automated driver assignment.

Simulates real-time transit and location updates.

Updates final order status toDELIVERED .

Notification Service (Consumer)

Listens to all routing keys (multi-channel: SMS/Email/Push).

Keeps the customer informed throughout the lifecycle.

Message Flow
Client → Restaurant Service(HTTP POST)

Restaurant Service → order.created(RabbitMQ Exchange)

Kitchen Service → Consumes event → Publicationsorder.ready

Delivery Service → Consumes event → Assigns Driver →order.delivered

Notification Service → Consumes all events in parallel to update the customer.

RabbitMQ Topology
Exchange Name: orders_exchange

Exchange Type: topic (Durable)

Routing Pattern:

order.created: Bound to Kitchen & Notification queues.

order.ready: Bound to Delivery & Notification queues.

order.*: Bound to Notification queue for full visibility.

Technology Stack
Runtime: Node.js 18+ (ES Modules)

Framework: Express.js (REST API)

Message Broker: RabbitMQ 3.12 (amqplib)

Data Layer: In-memory Maps (Scalable to MongoDB/PostgreSQL)

Key Architectural Principles
Separation of Concerns: Each service manages a single business domain.

Resilience: Implements message acknowledgement (ACK) to prevent data loss during service failures.

Horizontal Scalability: Each component is container-ready and can be scaled independently based on load.

Observability: Structured logging provides a clear audit trail of every order's lifecycle.