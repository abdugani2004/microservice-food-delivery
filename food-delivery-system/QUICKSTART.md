Food Delivery Microservices: Quick Start Guide
This guide provides the necessary steps to configure and launch the food delivery microservices environment efficiently.

1. Prerequisites
Ensure the following software is installed on your local machine:

Node.js: v18.0.0 or higher

NPM: v8.0.0 or higher

RabbitMQ: v3.12+ (standard installation or via Docker)

2. Project Setup
Navigate to the project directory and install the required dependencies:

Bash
cd food-delivery-system
npm install
3. Launching RabbitMQ
RabbitMQ acts as the backbone for inter-service communication. Using Docker is the recommended method for rapid deployment:

Bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3.12-management
Management UI: http://localhost:15672 (Default Credentials: guest / guest)

4. Starting the Services
To enable the full system workflow, run the following commands in four separate terminal windows:

Restaurant Service: npm run restaurant (Runs on Port 3001)

Kitchen Service: npm run kitchen

Delivery Service: npm run delivery

Notification Service: npm run notification

5. Testing the System
Create an Order
Use a separate terminal to send a test order via a POST request:

Bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest-1",
    "customerId": "cust-123",
    "items": [{"name": "Steak", "quantity": 1, "price": 45000}],
    "deliveryAddress": {"address": "123 Tech Avenue, Tashkent"}
  }'
Monitoring the Workflow
Once the order is submitted, you can observe the following sequence in your terminals:

Restaurant: Confirms order creation and publication to RabbitMQ.

Kitchen: Displays preparation progress from 25% to 100%.

Delivery: Assigns an available driver and simulates transit stages.

Notification: Logs the dispatch of SMS, Email, and Push notifications.

6. Essential API Endpoints
List All Orders: GET http://localhost:3001/api/orders

Check Order Status: GET http://localhost:3001/api/orders/{id}

Cancel Order: DELETE http://localhost:3001/api/orders/{id}

Health Check: GET http://localhost:3001/health

7. Troubleshooting
Connection Error (ECONNREFUSED): Ensure the RabbitMQ container is active ( docker ps).

Port Conflict: If port 3001 is already in use, terminate the process using lsof -ti:3001 | xargs kill -9.

Missing Events: Verify that the necessary Queues and Exchanges are visible in the RabbitMQ Management UI.

8. Shutting Down
To stop the services, press Ctrl + Cin each terminal. To stop the RabbitMQ container:

Bash
docker stop rabbitmq
For detailed technical specifications regarding the event-driven logic, please refer to ARCHITECTURE.md.