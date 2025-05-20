/*
 * ESP32 Forklift Controller with Mecanum Wheels
 * 
 * This sketch creates a WiFi access point and a web server to receive commands
 * from a mobile application to control a forklift with mecanum wheels.
 * 
 * The ESP32 will control:
 * - 4 motors for the mecanum wheels (allowing movement in all directions)
 * - A motor or actuator for the fork lift mechanism
 * 
 * Communication is done via WebSockets for real-time control
 */

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "ForkliftAP";
const char* password = "forklift123";

// Motor pins
// Mecanum wheels motors
const int FRONT_LEFT_MOTOR_PIN1 = 16;
const int FRONT_LEFT_MOTOR_PIN2 = 17;
const int FRONT_RIGHT_MOTOR_PIN1 = 18;
const int FRONT_RIGHT_MOTOR_PIN2 = 19;
const int REAR_LEFT_MOTOR_PIN1 = 21;
const int REAR_LEFT_MOTOR_PIN2 = 22;
const int REAR_RIGHT_MOTOR_PIN1 = 23;
const int REAR_RIGHT_MOTOR_PIN2 = 25;

// Fork lift motor pins
const int FORK_MOTOR_PIN1 = 26;
const int FORK_MOTOR_PIN2 = 27;

// PWM properties
const int FREQ = 5000;
const int RESOLUTION = 8;
const int MOTOR_CHANNEL_FL_1 = 0;
const int MOTOR_CHANNEL_FL_2 = 1;
const int MOTOR_CHANNEL_FR_1 = 2;
const int MOTOR_CHANNEL_FR_2 = 3;
const int MOTOR_CHANNEL_RL_1 = 4;
const int MOTOR_CHANNEL_RL_2 = 5;
const int MOTOR_CHANNEL_RR_1 = 6;
const int MOTOR_CHANNEL_RR_2 = 7;
const int FORK_CHANNEL_1 = 8;
const int FORK_CHANNEL_2 = 9;

// Server and WebSocket
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

// Current state
float movementX = 0.0;
float movementY = 0.0;
int forkHeight = 0;

void setup() {
  Serial.begin(115200);
  
  // Setup motor pins
  setupMotors();
  
  // Setup WiFi Access Point
  WiFi.softAP(ssid, password);
  
  Serial.println("Access Point Started");
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());
  
  // Setup WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  // Setup HTTP server
  server.on("/", HTTP_GET, handleRoot);
  server.begin();
  
  Serial.println("HTTP server started");
}

void loop() {
  webSocket.loop();
  server.handleClient();
}

void setupMotors() {
  // Configure PWM for all motor channels
  ledcSetup(MOTOR_CHANNEL_FL_1, FREQ, RESOLUTION);
  ledcSetup(MOTOR_CHANNEL_FL_2, FREQ, RESOLUTION);
  ledcSetup(MOTOR_CHANNEL_FR_1, FREQ, RESOLUTION);
  ledcSetup(MOTOR_CHANNEL_FR_2, FREQ, RESOLUTION);
  ledcSetup(MOTOR_CHANNEL_RL_1, FREQ, RESOLUTION);
  ledcSetup(MOTOR_CHANNEL_RL_2, FREQ, RESOLUTION);
  ledcSetup(MOTOR_CHANNEL_RR_1, FREQ, RESOLUTION);
  ledcSetup(MOTOR_CHANNEL_RR_2, FREQ, RESOLUTION);
  ledcSetup(FORK_CHANNEL_1, FREQ, RESOLUTION);
  ledcSetup(FORK_CHANNEL_2, FREQ, RESOLUTION);
  
  // Attach pins to channels
  ledcAttachPin(FRONT_LEFT_MOTOR_PIN1, MOTOR_CHANNEL_FL_1);
  ledcAttachPin(FRONT_LEFT_MOTOR_PIN2, MOTOR_CHANNEL_FL_2);
  ledcAttachPin(FRONT_RIGHT_MOTOR_PIN1, MOTOR_CHANNEL_FR_1);
  ledcAttachPin(FRONT_RIGHT_MOTOR_PIN2, MOTOR_CHANNEL_FR_2);
  ledcAttachPin(REAR_LEFT_MOTOR_PIN1, MOTOR_CHANNEL_RL_1);
  ledcAttachPin(REAR_LEFT_MOTOR_PIN2, MOTOR_CHANNEL_RL_2);
  ledcAttachPin(REAR_RIGHT_MOTOR_PIN1, MOTOR_CHANNEL_RR_1);
  ledcAttachPin(REAR_RIGHT_MOTOR_PIN2, MOTOR_CHANNEL_RR_2);
  ledcAttachPin(FORK_MOTOR_PIN1, FORK_CHANNEL_1);
  ledcAttachPin(FORK_MOTOR_PIN2, FORK_CHANNEL_2);
  
  // Initialize all motors to stop
  stopAllMotors();
}

void stopAllMotors() {
  // Stop wheel motors
  ledcWrite(MOTOR_CHANNEL_FL_1, 0);
  ledcWrite(MOTOR_CHANNEL_FL_2, 0);
  ledcWrite(MOTOR_CHANNEL_FR_1, 0);
  ledcWrite(MOTOR_CHANNEL_FR_2, 0);
  ledcWrite(MOTOR_CHANNEL_RL_1, 0);
  ledcWrite(MOTOR_CHANNEL_RL_2, 0);
  ledcWrite(MOTOR_CHANNEL_RR_1, 0);
  ledcWrite(MOTOR_CHANNEL_RR_2, 0);
  
  // Stop fork motor
  ledcWrite(FORK_CHANNEL_1, 0);
  ledcWrite(FORK_CHANNEL_2, 0);
}

void handleRoot() {
  String html = "<html><head><title>Forklift Controller</title></head>";
  html += "<body><h1>Forklift Controller</h1>";
  html += "<p>Use the mobile app to control the forklift.</p>";
  html += "<p>Current state:</p>";
  html += "<ul>";
  html += "<li>Movement X: " + String(movementX) + "</li>";
  html += "<li>Movement Y: " + String(movementY) + "</li>";
  html += "<li>Fork Height: " + String(forkHeight) + "</li>";
  html += "</ul>";
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      stopAllMotors();
      break;
      
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
      }
      break;
      
    case WStype_TEXT:
      {
        Serial.printf("[%u] Received text: %s\n", num, payload);
        
        // Parse JSON command
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, payload);
        
        if (error) {
          Serial.print("deserializeJson() failed: ");
          Serial.println(error.c_str());
          return;
        }
        
        // Process command
        if (doc.containsKey("movement")) {
          movementX = doc["movement"]["x"];
          movementY = doc["movement"]["y"];
          controlMecanumWheels(movementX, movementY);
        }
        
        if (doc.containsKey("fork")) {
          int direction = doc["fork"];
          controlFork(direction);
        }
        
        // Send back current state
        sendState(num);
      }
      break;
  }
}

void sendState(uint8_t clientNum) {
  DynamicJsonDocument doc(1024);
  doc["movement"]["x"] = movementX;
  doc["movement"]["y"] = movementY;
  doc["forkHeight"] = forkHeight;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  webSocket.sendTXT(clientNum, jsonString);
}

void controlMecanumWheels(float x, float y) {
  // Mecanum wheel control logic
  // x: -1 to 1 (left to right)
  // y: -1 to 1 (backward to forward)
  
  // Calculate motor speeds for mecanum wheels
  int frontLeftSpeed = (int)((y + x) * 255);
  int frontRightSpeed = (int)((y - x) * 255);
  int rearLeftSpeed = (int)((y - x) * 255);
  int rearRightSpeed = (int)((y + x) * 255);
  
  // Constrain values
  frontLeftSpeed = constrain(frontLeftSpeed, -255, 255);
  frontRightSpeed = constrain(frontRightSpeed, -255, 255);
  rearLeftSpeed = constrain(rearLeftSpeed, -255, 255);
  rearRightSpeed = constrain(rearRightSpeed, -255, 255);
  
  // Set motor directions and speeds
  setMotorSpeed(MOTOR_CHANNEL_FL_1, MOTOR_CHANNEL_FL_2, frontLeftSpeed);
  setMotorSpeed(MOTOR_CHANNEL_FR_1, MOTOR_CHANNEL_FR_2, frontRightSpeed);
  setMotorSpeed(MOTOR_CHANNEL_RL_1, MOTOR_CHANNEL_RL_2, rearLeftSpeed);
  setMotorSpeed(MOTOR_CHANNEL_RR_1, MOTOR_CHANNEL_RR_2, rearRightSpeed);
  
  Serial.printf("Motor speeds - FL: %d, FR: %d, RL: %d, RR: %d\n", 
                frontLeftSpeed, frontRightSpeed, rearLeftSpeed, rearRightSpeed);
}

void setMotorSpeed(int channelA, int channelB, int speed) {
  if (speed > 0) {
    ledcWrite(channelA, speed);
    ledcWrite(channelB, 0);
  } else if (speed < 0) {
    ledcWrite(channelA, 0);
    ledcWrite(channelB, -speed);
  } else {
    ledcWrite(channelA, 0);
    ledcWrite(channelB, 0);
  }
}

void controlFork(int direction) {
  // direction: 1 for up, -1 for down, 0 for stop
  
  if (direction > 0 && forkHeight < 10) {
    // Move fork up
    ledcWrite(FORK_CHANNEL_1, 200);
    ledcWrite(FORK_CHANNEL_2, 0);
    forkHeight++;
  } else if (direction < 0 && forkHeight > 0) {
    // Move fork down
    ledcWrite(FORK_CHANNEL_1, 0);
    ledcWrite(FORK_CHANNEL_2, 200);
    forkHeight--;
  } else {
    // Stop fork
    ledcWrite(FORK_CHANNEL_1, 0);
    ledcWrite(FORK_CHANNEL_2, 0);
  }
  
  Serial.printf("Fork height: %d\n", forkHeight);
}
