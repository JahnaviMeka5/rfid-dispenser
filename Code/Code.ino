#include <Servo.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ESP8266WebServer.h>
#include <time.h>

// --- Wi-Fi Credentials ---
const char* ssid = "Sathwik";
const char* password = "12345678";

// --- Google Apps Script URL ---
const char* appsScriptUrl = "https://script.google.com/macros/s/AKfycbxlJTFp49E9LFsB-gCxa1TVk9aDAA30QODtBJkMEYc8eVS05dTwJ7Q0-XP7-ibHtAK1/exec";

// --- Servo + IR setup ---
Servo servo1;
Servo servo2;

int irPin1 = D0;
int servoPin1 = D1;

int irPin2 = D8;
int servoPin2 = D2;

// --- RFID setup ---
#define RST_PIN D3
#define SS_PIN D4

MFRC522 mfrc522(SS_PIN, RST_PIN);
WiFiClientSecure client;
ESP8266WebServer server(80);

// --- Define card holder struct ---
struct CardHolder {
  byte uid[4];
  String medicine;
  String name;
  int dispenser;
};

// --- Define all cards ---
CardHolder cards[] = {
  {{0xC7, 0x0C, 0x81, 0xB5}, "Paracetamol", "Satwick", 1},
  {{0x47, 0x42, 0xA0, 0xB4}, "Vitamin C", "Nani", 1},
  {{0x97, 0x1C, 0x76, 0xB4}, "Ibuprofen", "Diwakar", 2}
};

// --- Global status struct for each person ---
struct UserStatus {
  String name;
  String status;
  String lastDispensedTime;
};

UserStatus userStatuses[] = {
  {"Satwick", "Ready to dispense", "N/A"},
  {"Nani", "Ready to dispense", "N/A"},
  {"Diwakar", "Ready to dispense", "N/A"}
};

// --- Global Variables ---
String serialLog = "";
const int maxLogSize = 1000;
int totalDispensed = 0;
String systemUptime = "";

// --- Function Prototypes ---
void dispense(int dispenser, String medicine, String uidString, String holderName);
void checkRfid();
void logToGoogleSheet(String uid, String holderName, String medicineName, String dispensedStatus);
void handleRoot();
void handleStatus();
void handleStats();
String formatTime();
void updateSerialLog(String message);
void setupTime();
String getSystemUptime();

void setup() {
  Serial.begin(9600);
  SPI.begin();
  mfrc522.PCD_Init();

  updateSerialLog("System initializing...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  updateSerialLog("Wi-Fi connected successfully");
  updateSerialLog("Server IP: " + WiFi.localIP().toString());

  client.setInsecure();
  setupTime();

  pinMode(irPin1, INPUT);
  pinMode(irPin2, INPUT);

  servo1.attach(servoPin1);
  servo2.attach(servoPin2);

  servo1.write(90);
  servo2.write(90);

  updateSerialLog("Hardware initialization complete");
  updateSerialLog("Smart Medicine Dispenser ready for operation");

  // --- Web Server Routes ---
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/stats", handleStats);
  server.on("/dispensed_count", handleDispensedCount); // Add this new route
  server.begin();
  updateSerialLog("Web server started on port 80");
}
void handleDispensedCount() {
  server.send(200, "text/plain", String(totalDispensed));
}

void loop() {
  server.handleClient();
  checkRfid();
  delay(300);
}

void handleRoot() {
  String html = "<!DOCTYPE html><html lang='en'>";
  html += "<head>";
  html += "<meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<title>MediDispense Pro - Smart Medicine Management</title>";
  
  html += "<style>";
  
  // CSS Reset and Base Styles
  html += "* { margin: 0; padding: 0; box-sizing: border-box; }";
  html += "body {";
  html += "  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;";
  html += "  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);";
  html += "  min-height: 100vh;";
  html += "  color: #2d3748;";
  html += "  line-height: 1.6;";
  html += "}";
  
  // Header Styles
  html += ".header {";
  html += "  background: rgba(255, 255, 255, 0.95);";
  html += "  backdrop-filter: blur(10px);";
  html += "  border-bottom: 1px solid rgba(255, 255, 255, 0.2);";
  html += "  padding: 1rem 2rem;";
  html += "  position: sticky;";
  html += "  top: 0;";
  html += "  z-index: 100;";
  html += "  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);";
  html += "}";
  
  html += ".header-content {";
  html += "  max-width: 1400px;";
  html += "  margin: 0 auto;";
  html += "  display: flex;";
  html += "  justify-content: space-between;";
  html += "  align-items: center;";
  html += "}";
  
  html += ".logo {";
  html += "  display: flex;";
  html += "  align-items: center;";
  html += "  gap: 0.75rem;";
  html += "}";
  
  html += ".logo-icon {";
  html += "  width: 40px;";
  html += "  height: 40px;";
  html += "  background: linear-gradient(135deg, #667eea, #764ba2);";
  html += "  border-radius: 10px;";
  html += "  display: flex;";
  html += "  align-items: center;";
  html += "  justify-content: center;";
  html += "  color: white;";
  html += "  font-weight: bold;";
  html += "  font-size: 1.2rem;";
  html += "}";
  
  html += ".logo-text h1 {";
  html += "  font-size: 1.5rem;";
  html += "  font-weight: 700;";
  html += "  color: #1a202c;";
  html += "}";
  
  html += ".logo-text p {";
  html += "  font-size: 0.875rem;";
  html += "  color: #718096;";
  html += "}";
  
  html += ".status-indicator {";
  html += "  display: flex;";
  html += "  align-items: center;";
  html += "  gap: 0.5rem;";
  html += "  padding: 0.5rem 1rem;";
  html += "  background: #f0fff4;";
  html += "  border: 1px solid #9ae6b4;";
  html += "  border-radius: 25px;";
  html += "  color: #22543d;";
  html += "}";
  
  html += ".status-dot {";
  html += "  width: 8px;";
  html += "  height: 8px;";
  html += "  background: #48bb78;";
  html += "  border-radius: 50%;";
  html += "  animation: pulse 2s infinite;";
  html += "}";
  
  html += "@keyframes pulse {";
  html += "  0%, 100% { opacity: 1; }";
  html += "  50% { opacity: 0.5; }";
  html += "}";
  
  // Main Container
  html += ".main-container {";
  html += "  max-width: 1400px;";
  html += "  margin: 0 auto;";
  html += "  padding: 2rem;";
  html += "}";
  
  // Stats Cards
  html += ".stats-row {";
  html += "  display: grid;";
  html += "  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));";
  html += "  gap: 1.5rem;";
  html += "  margin-bottom: 2rem;";
  html += "}";
  
  html += ".stat-card {";
  html += "  background: rgba(255, 255, 255, 0.95);";
  html += "  backdrop-filter: blur(10px);";
  html += "  padding: 1.5rem;";
  html += "  border-radius: 16px;";
  html += "  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);";
  html += "  border: 1px solid rgba(255, 255, 255, 0.2);";
  html += "  transition: transform 0.3s ease;";
  html += "}";
  
  html += ".stat-card:hover {";
  html += "  transform: translateY(-5px);";
  html += "}";
  
  html += ".stat-card h3 {";
  html += "  font-size: 0.875rem;";
  html += "  font-weight: 600;";
  html += "  color: #718096;";
  html += "  text-transform: uppercase;";
  html += "  letter-spacing: 0.5px;";
  html += "  margin-bottom: 0.5rem;";
  html += "}";
  
  html += ".stat-card .number {";
  html += "  font-size: 2rem;";
  html += "  font-weight: 700;";
  html += "  color: #1a202c;";
  html += "  margin-bottom: 0.5rem;";
  html += "}";
  
  html += ".stat-card .description {";
  html += "  font-size: 0.875rem;";
  html += "  color: #4a5568;";
  html += "}";
  
  // Dashboard Grid
  html += ".dashboard-grid {";
  html += "  display: grid;";
  html += "  grid-template-columns: 2fr 1fr;";
  html += "  gap: 2rem;";
  html += "}";
  
  // Dispensers Section
  html += ".dispensers-section {";
  html += "  background: rgba(255, 255, 255, 0.95);";
  html += "  backdrop-filter: blur(10px);";
  html += "  border-radius: 20px;";
  html += "  padding: 2rem;";
  html += "  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);";
  html += "}";
  
  html += ".section-header {";
  html += "  display: flex;";
  html += "  justify-content: space-between;";
  html += "  align-items: center;";
  html += "  margin-bottom: 2rem;";
  html += "  padding-bottom: 1rem;";
  html += "  border-bottom: 2px solid #e2e8f0;";
  html += "}";
  
  html += ".section-title {";
  html += "  font-size: 1.5rem;";
  html += "  font-weight: 700;";
  html += "  color: #1a202c;";
  html += "}";
  
  html += ".section-subtitle {";
  html += "  font-size: 0.875rem;";
  html += "  color: #718096;";
  html += "}";
  
  // Dispenser Cards
  html += ".dispenser-grid {";
  html += "  display: grid;";
  html += "  gap: 1.5rem;";
  html += "}";
  
  html += ".dispenser-card {";
  html += "  border: 2px solid #e2e8f0;";
  html += "  border-radius: 16px;";
  html += "  padding: 1.5rem;";
  html += "  transition: all 0.3s ease;";
  html += "  position: relative;";
  html += "  overflow: hidden;";
  html += "}";
  
  html += ".dispenser-card::before {";
  html += "  content: '';";
  html += "  position: absolute;";
  html += "  top: 0;";
  html += "  left: 0;";
  html += "  right: 0;";
  html += "  height: 4px;";
  html += "  background: linear-gradient(90deg, #667eea, #764ba2);";
  html += "}";
  
  html += ".dispenser-card.active {";
  html += "  border-color: #667eea;";
  html += "  background: linear-gradient(135deg, #f0f4ff, #e6f3ff);";
  html += "}";
  
  html += ".dispenser-header {";
  html += "  display: flex;";
  html += "  justify-content: space-between;";
  html += "  align-items: flex-start;";
  html += "  margin-bottom: 1rem;";
  html += "}";
  
  html += ".patient-info h4 {";
  html += "  font-size: 1.125rem;";
  html += "  font-weight: 700;";
  html += "  color: #1a202c;";
  html += "  margin-bottom: 0.25rem;";
  html += "}";
  
  html += ".patient-info .dispenser-id {";
  html += "  font-size: 0.75rem;";
  html += "  color: #718096;";
  html += "  text-transform: uppercase;";
  html += "  letter-spacing: 0.5px;";
  html += "}";
  
  html += ".status-badge {";
  html += "  padding: 0.375rem 0.75rem;";
  html += "  border-radius: 20px;";
  html += "  font-size: 0.75rem;";
  html += "  font-weight: 600;";
  html += "  text-transform: uppercase;";
  html += "  letter-spacing: 0.5px;";
  html += "}";
  
  html += ".status-ready {";
  html += "  background: #dcfce7;";
  html += "  color: #166534;";
  html += "  border: 1px solid #bbf7d0;";
  html += "}";
  
  html += ".status-active {";
  html += "  background: #dbeafe;";
  html += "  color: #1e40af;";
  html += "  border: 1px solid #93c5fd;";
  html += "}";
  
  html += ".status-error {";
  html += "  background: #fee2e2;";
  html += "  color: #dc2626;";
  html += "  border: 1px solid #fca5a5;";
  html += "}";
  
  html += ".dispenser-details {";
  html += "  display: grid;";
  html += "  grid-template-columns: 1fr 1fr;";
  html += "  gap: 1rem;";
  html += "}";
  
  html += ".detail-item {";
  html += "  display: flex;";
  html += "  flex-direction: column;";
  html += "}";
  
  html += ".detail-label {";
  html += "  font-size: 0.75rem;";
  html += "  font-weight: 600;";
  html += "  color: #718096;";
  html += "  text-transform: uppercase;";
  html += "  letter-spacing: 0.5px;";
  html += "  margin-bottom: 0.25rem;";
  html += "}";
  
  html += ".detail-value {";
  html += "  font-size: 0.875rem;";
  html += "  font-weight: 500;";
  html += "  color: #2d3748;";
  html += "}";
  
  // Activity Log Section
  html += ".activity-section {";
  html += "  background: rgba(255, 255, 255, 0.95);";
  html += "  backdrop-filter: blur(10px);";
  html += "  border-radius: 20px;";
  html += "  padding: 2rem;";
  html += "  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);";
  html += "}";
  
  html += ".activity-log {";
  html += "  max-height: 400px;";
  html += "  overflow-y: auto;";
  html += "  border: 1px solid #e2e8f0;";
  html += "  border-radius: 12px;";
  html += "  background: #f8fafc;";
  html += "}";
  
  html += ".log-entry {";
  html += "  padding: 0.75rem 1rem;";
  html += "  border-bottom: 1px solid #e2e8f0;";
  html += "  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;";
  html += "  font-size: 0.75rem;";
  html += "  line-height: 1.4;";
  html += "}";
  
  html += ".log-entry:last-child {";
  html += "  border-bottom: none;";
  html += "}";
  
  html += ".log-timestamp {";
  html += "  color: #667eea;";
  html += "  font-weight: 600;";
  html += "}";
  
  html += ".log-message {";
  html += "  color: #2d3748;";
  html += "  margin-left: 0.5rem;";
  html += "}";

  html += ".modal {";
  html += "  display: none;";
  html += "  position: fixed;";
  html += "  z-index: 200;";
  html += "  left: 0;";
  html += "  top: 0;";
  html += "  width: 100%;";
  html += "  height: 100%;";
  html += "  overflow: auto;";
  html += "  background-color: rgba(0,0,0,0.4);";
  html += "  justify-content: center;";
  html += "  align-items: center;";
  html += "}";
  html += ".modal-content {";
  html += "  background-color: #fefefe;";
  html += "  padding: 20px;";
  html += "  border-radius: 10px;";
  html += "  border: 1px solid #888;";
  html += "  width: 80%;";
  html += "  max-width: 400px;";
  html += "  text-align: center;";
  html += "  box-shadow: 0 5px 15px rgba(0,0,0,0.3);";
  html += "  animation: fadeIn 0.5s;";
  html += "}";
  html += ".close-btn {";
  html += "  color: #aaa;";
  html += "  float: right;";
  html += "  font-size: 28px;";
  html += "  font-weight: bold;";
  html += "}";
  html += ".close-btn:hover, .close-btn:focus {";
  html += "  color: black;";
  html += "  text-decoration: none;";
  html += "  cursor: pointer;";
  html += "}";
  html += "@keyframes fadeIn {";
  html += "  from { opacity: 0; transform: scale(0.9); }";
  html += "  to { opacity: 1; transform: scale(1); }";
  html += "}";
  html += "#popup-message {";
  html += "  font-size: 1.2rem;";
  html += "  color: #333;";
  html += "  font-weight: bold;";
  html += "}";
  
  // Responsive Design
  html += "@media (max-width: 1024px) {";
  html += "  .dashboard-grid { grid-template-columns: 1fr; }";
  html += "  .header-content { flex-direction: column; gap: 1rem; }";
  html += "}";
  
  html += "@media (max-width: 768px) {";
  html += "  .main-container { padding: 1rem; }";
  html += "  .dispensers-section, .activity-section { padding: 1.5rem; }";
  html += "  .dispenser-details { grid-template-columns: 1fr; }";
  html += "  .stats-row { grid-template-columns: 1fr; }";
  html += "}";
  
  // Loading Animation
  html += ".loading {";
  html += "  opacity: 0.7;";
  html += "  transition: opacity 0.3s ease;";
  html += "}";
  
  html += "</style></head><body>";
  
  // Header
  html += "<header class='header'>";
  html += "<div class='header-content'>";
  html += "<div class='logo'>";
  html += "<div class='logo-icon'>M</div>";
  html += "<div class='logo-text'>";
  html += "<h1>MediDispense Pro</h1>";
  html += "<p>Smart Medicine Management System</p>";
  html += "</div>";
  html += "</div>";
  html += "<div class='status-indicator'>";
  html += "<div class='status-dot'></div>";
  html += "<span>System Online</span>";
  html += "</div>";
  html += "</div>";
  html += "</header>";
  
  // Main Content
  html += "<main class='main-container'>";
  
  // Stats Row
  html += "<div class='stats-row'>";
  html += "<div class='stat-card'>";
  html += "<h3>Active Users</h3>";
  html += "<div class='number'>4</div>";
  html += "<div class='description'>Registered patients</div>";
  html += "</div>";
  html += "<div class='stat-card'>";
  html += "<h3>Dispensers</h3>";
  html += "<div class='number'>2</div>";
  html += "<div class='description'>Operating units</div>";
  html += "</div>";
  html += "<div class='stat-card'>";
  html += "<h3>Total Dispensed</h3>";
  html += "<div class='number' id='total-dispensed'>" + String(totalDispensed) + "</div>";
  html += "<div class='description'>Medicines today</div>";
  html += "</div>";
  html += "<div class='stat-card'>";
  html += "<h3>System Status</h3>";
  html += "<div class='number'>99%</div>";
  html += "<div class='description'>Uptime</div>";
  html += "</div>";
  html += "</div>";
  
  // Dashboard Grid
  html += "<div class='dashboard-grid'>";
  
  // Dynamic Content Container
  html += "<div id='content-container'>";
  html += getContentHTML();
  html += "</div>";
  
  // Activity Log
  html += "<div class='activity-section'>";
  html += "<div class='section-header'>";
  html += "<div>";
  html += "<div class='section-title'>System Activity</div>";
  html += "<div class='section-subtitle'>Real-time operation log</div>";
  html += "</div>";
  html += "</div>";
  html += "<div class='activity-log' id='activity-log'>";
  html += getActivityLogHTML();
  html += "</div>";
  html += "</div>";
  
  html += "</div>";
  html += "</main>";
  html += "<div id='dispenser-popup' class='modal'>";
  html += "  <div class='modal-content'>";
  html += "    <span class='close-btn'>&times;</span>";
  html += "    <p id='popup-message'></p>";
  html += "  </div>";
  html += "</div>";
  
  // JavaScript
  html += "<script>";
  html += "let isLoading = false;";
  
  html += "function updateDashboard() {";
  html += "  if (isLoading) return;";
  html += "  isLoading = true;";
  html += "  const container = document.getElementById('content-container');";
  html += "  container.classList.add('loading');";
  
  html += "  fetch('/status')";
  html += "    .then(response => response.text())";
  html += "    .then(data => {";
  html += "      setTimeout(() => {";
  html += "        container.innerHTML = data;";
  html += "        container.classList.remove('loading');";
  html += "        isLoading = false;";
  html += "      }, 200);";
  html += "    })";
  html += "    .catch(error => {";
  html += "      console.error('Update failed:', error);";
  html += "      container.classList.remove('loading');";
  html += "      isLoading = false;";
  html += "    });";
  html += "}";
  
  html += "function updateActivityLog() {";
  html += "  fetch('/stats')";
  html += "    .then(response => response.text())";
  html += "    .then(data => {";
  html += "      document.getElementById('activity-log').innerHTML = data;";
  html += "    })";
  html += "    .catch(error => console.error('Log update failed:', error));";
  html += "}";

  html += "function showDispenserPopup(dispenserId) {";
  html += "  const popup = document.getElementById('dispenser-popup');";
  html += "  const message = document.getElementById('popup-message');";
  html += "  message.innerText = `Please place your hand under Dispenser ${dispenserId}.`;";
  html += "  popup.style.display = 'flex';";
  html += "  setTimeout(() => {";
  html += "    popup.style.display = 'none';";
  html += "  }, 5000);";
  html += "}";

  html += "document.querySelector('.close-btn').onclick = function() {";
  html += "  document.getElementById('dispenser-popup').style.display = 'none';";
  html += "};";

  html += "function updateDashboard() {";
  html += "  if (isLoading) return;";
  html += "  isLoading = true;";
  html += "  const container = document.getElementById('content-container');";
  html += "  container.classList.add('loading');";

  html += "  fetch('/status')";
  html += "    .then(response => response.text())";
  html += "    .then(data => {";
  html += "      const tempDiv = document.createElement('div');";
  html += "      tempDiv.innerHTML = data;";
  html += "      const newCards = tempDiv.querySelectorAll('.dispenser-card');";

  html += "      newCards.forEach(newCard => {";
  html += "        const newStatus = newCard.querySelector('.status-badge').innerText;";
  html += "        const patientName = newCard.querySelector('h4').innerText;";
html += "        const dispenserId = newCard.querySelector('.dispenser-id').getAttribute('data-dispenser');";
  html += "        if (newStatus.trim() === 'Waiting for hand') {";
  html += "          showDispenserPopup(dispenserId);";
  html += "        }";
  html += "      });";

  html += "      setTimeout(() => {";
  html += "        container.innerHTML = data;";
  html += "        container.classList.remove('loading');";
  html += "        isLoading = false;";
  html += "      }, 200);";
  html += "    })";
  html += "    .catch(error => {";
  html += "      console.error('Update failed:', error);";
  html += "      container.classList.remove('loading');";
  html += "      isLoading = false;";
  html += "    });";
  html += "}";

  
    
  html += "function updateTotalDispensed() {";
  html += "   fetch('/dispensed_count')";
  html += "     .then(response => response.text())";
  html += "     .then(data => {";
  html += "       const dispensedElement = document.getElementById('total-dispensed');";
  html += "       if (dispensedElement) {";
  html += "         dispensedElement.innerText = data;";
  html += "       }";
  html += "     })";
  html += "     .catch(error => console.error('Failed to update dispensed count:', error));";
  html += "}";

  html += "setInterval(updateDashboard, 3000);";
  html += "setInterval(updateActivityLog, 2000);";
  html += "setInterval(updateTotalDispensed, 5000);"; // Call every 5 seconds

  html += "</script>";
  
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

void handleStatus() {
  server.send(200, "text/html", getContentHTML());
}

void handleStats() {
  server.send(200, "text/html", getActivityLogHTML());
}

String getContentHTML() {
  String html = "<div class='dispensers-section'>";
  html += "<div class='section-header'>";
  html += "<div>";
  html += "<div class='section-title'>Medicine Dispensers</div>";
  html += "<div class='section-subtitle'>Patient medication status</div>";
  html += "</div>";
  html += "</div>";
  
  html += "<div class='dispenser-grid'>";
  
  for (int i = 0; i < sizeof(userStatuses) / sizeof(userStatuses[0]); i++) {
    String statusClass = "ready";
    if (userStatuses[i].status.indexOf("Dispensing") >= 0 || 
        userStatuses[i].status.indexOf("Waiting") >= 0) {
      statusClass = "active";
    } else if (userStatuses[i].status.indexOf("Denied") >= 0 || 
               userStatuses[i].status.indexOf("Error") >= 0) {
      statusClass = "error";
    }
    
    String cardClass = (statusClass == "active") ? "dispenser-card active" : "dispenser-card";
    
    html += "<div class='" + cardClass + "'>";
    html += "<div class='dispenser-header'>";
    html += "<div class='patient-info'>";
    html += "<h4>" + userStatuses[i].name + "</h4>";
    
    // Find medicine and dispenser for this user within a single loop
    String medicine = "N/A";
    int dispenserId = 0; // Initialize with a default value
    for (int j = 0; j < sizeof(cards)/sizeof(cards[0]); j++) {
      if (cards[j].name == userStatuses[i].name) {
        medicine = cards[j].medicine;
        dispenserId = cards[j].dispenser;
        break; // Exit the loop once the user is found
      }
    }
    
    html += "<div class='dispenser-id' data-dispenser='" + String(dispenserId) + "'>Dispenser Unit " + String(dispenserId) + " • " + medicine + "</div>";    
    html += "</div>"; // Close patient-info div
    html += "<div class='status-badge status-" + statusClass + "'>" + userStatuses[i].status + "</div>";
    html += "</div>"; // Close dispenser-header div
    
    html += "<div class='dispenser-details'>";
    html += "<div class='detail-item'>";
    html += "<div class='detail-label'>Last Activity</div>";
    html += "<div class='detail-value'>" + userStatuses[i].lastDispensedTime + "</div>";
    html += "</div>";
    html += "<div class='detail-item'>";
    html += "<div class='detail-label'>Medicine Type</div>";
    html += "<div class='detail-value'>" + medicine + "</div>";
    html += "</div>";
    html += "</div>";
    html += "</div>";
  }
  
  html += "</div>";
  html += "</div>";
  
  return html;
}
String getActivityLogHTML() {
  String html = "";
  String logLines = serialLog;
  int startPos = 0;
  int endPos = logLines.indexOf('\n');
  
  while (endPos != -1 && startPos < logLines.length()) {
    String line = logLines.substring(startPos, endPos);
    if (line.length() > 0) {
      html += "<div class='log-entry'>";
      int timeEnd = line.indexOf(']');
      if (timeEnd != -1) {
        html += "<span class='log-timestamp'>" + line.substring(0, timeEnd + 1) + "</span>";
        html += "<span class='log-message'>" + line.substring(timeEnd + 2) + "</span>";
      } else {
        html += "<span class='log-message'>" + line + "</span>";
      }
      html += "</div>";
    }
    startPos = endPos + 1;
    endPos = logLines.indexOf('\n', startPos);
  }
  
  return html;
}

// --- RFID Check Function ---
void checkRfid() {
  if (mfrc522.PICC_IsNewCardPresent()) {
    if (mfrc522.PICC_ReadCardSerial()) {
      String uidString = "";
      for (byte i = 0; i < mfrc522.uid.size; i++) {
        char temp[3];
        sprintf(temp, "%02X", mfrc522.uid.uidByte[i]);
        uidString += temp;
      }
      
      updateSerialLog("RFID card detected - UID: " + uidString);

      bool found = false;
      for (int i = 0; i < sizeof(cards)/sizeof(cards[0]); i++) {
        String cardUidString = "";
        for (byte j = 0; j < 4; j++) {
            char temp[3];
            sprintf(temp, "%02X", cards[i].uid[j]);
            cardUidString += temp;
        }

        if (uidString.equals(cardUidString)) {
          found = true;
          userStatuses[i].status = "Access Granted";
          updateSerialLog("Access granted for " + cards[i].name + " - " + cards[i].medicine);
          dispense(cards[i].dispenser, cards[i].medicine, uidString, cards[i].name);
          break;
        }
      }
      
      if (!found) {
        updateSerialLog("Access denied - Unknown RFID card");
        for (int i = 0; i < sizeof(userStatuses) / sizeof(userStatuses[0]); i++) {
          userStatuses[i].status = "Access Denied";
        }
        logToGoogleSheet(uidString, "Unknown", "N/A", "Denied");
      }

      mfrc522.PICC_HaltA();
      mfrc522.PCD_StopCrypto1();
    }
  }
}

// --- Dispense function ---
void dispense(int dispenser, String medicine, String uidString, String holderName) {
  int userIndex = -1;
  for(int i=0; i < sizeof(userStatuses)/sizeof(userStatuses[0]); i++){
    if(userStatuses[i].name == holderName){
      userIndex = i;
      break;
    }
  }
  
  if (userIndex == -1) {
    updateSerialLog("Error: User profile not found");
    return;
  }
  
  userStatuses[userIndex].status = "Waiting for hand";
  updateSerialLog("Waiting for hand detection at dispenser " + String(dispenser));
  
  if (dispenser == 1) {
    while (digitalRead(irPin1) != LOW) {
      server.handleClient();
      delay(100);
    }
    userStatuses[userIndex].status = "Dispensing " + medicine;
    updateSerialLog("Hand detected - Dispensing " + medicine + " for " + holderName);
    
    servo1.write(0);
    delay(2000);
    servo1.write(90);
  } else if (dispenser == 2) {
    while (digitalRead(irPin2) != LOW) {
      server.handleClient();
      delay(100);
    }
    userStatuses[userIndex].status = "Dispensing " + medicine;
    updateSerialLog("Hand detected - Dispensing " + medicine + " for " + holderName);

    servo2.write(0);
    delay(2000);
    servo2.write(90);
  }

  userStatuses[userIndex].status = "Ready to dispense";
  userStatuses[userIndex].lastDispensedTime = formatTime();
  totalDispensed++;
  updateSerialLog("Dispensing completed successfully for " + holderName);
  
  logToGoogleSheet(uidString, holderName, medicine, "Dispensed"); 
}

// --- ADD THIS HELPER FUNCTION IN THE MAIN BODY OF YOUR SKETCH,
//     FOR EXAMPLE, RIGHT BEFORE void logToGoogleSheet(...) {

String urlEncode(String str) {
  String encodedString = "";
  char c;
  char code0;
  char code1;
  for (int i = 0; i < str.length(); i++) {
    c = str.charAt(i);
    if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
      encodedString += c;
    } else {
      code1 = (c & 0xf) + '0';
      if ((c & 0xf) > 9) {
        code1 = (c & 0xf) - 10 + 'A';
      }
      c = (c >> 4) & 0xf;
      code0 = c + '0';
      if (c > 9) {
        code0 = c - 10 + 'A';
      }
      encodedString += '%';
      encodedString += code0;
      encodedString += code1;
    }
  }
  return encodedString;
}

// --- REPLACE THE ORIGINAL logToGoogleSheet FUNCTION WITH THIS ONE ---

void logToGoogleSheet(String uid, String holderName, String medicineName, String dispensedStatus) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Use the new URL encoding function on all parameters
    String encodedHolderName = urlEncode(holderName);
    String encodedMedicineName = urlEncode(medicineName);
    String encodedStatus = urlEncode(dispensedStatus);
    
    String url = String(appsScriptUrl) + "?uid=" + uid + "&holderName=" + encodedHolderName + "&medicineName=" + encodedMedicineName + "&dispensed=" + encodedStatus;
    
    http.begin(client, url);
    
    int httpCode = http.GET();
    if (httpCode > 0) {
      updateSerialLog("Data logged to Google Sheets - Response: " + String(httpCode));
    } else {
      updateSerialLog("Failed to log data - HTTP error: " + http.errorToString(httpCode));
    }
    http.end();
  } else {
    updateSerialLog("Wi-Fi disconnected - Cannot log data to Google Sheets");
  }
}
// Function to format the current time
String formatTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "Time unavailable";
  }
  char timeString[20];
  strftime(timeString, sizeof(timeString), "%H:%M:%S", &timeinfo);
  return String(timeString);
}

// Function to get system uptime
String getSystemUptime() {
  unsigned long uptime = millis() / 1000;
  unsigned long hours = uptime / 3600;
  unsigned long minutes = (uptime % 3600) / 60;
  unsigned long seconds = uptime % 60;
  
  return String(hours) + "h " + String(minutes) + "m " + String(seconds) + "s";
}

// Function to update the serial log
void updateSerialLog(String message) {
  Serial.println(message);

  String timestamp = formatTime();
  String newLog = "[" + timestamp + "] " + message + "\n" + serialLog;
  
  // Keep log size manageable for ESP8266 memory
  if (newLog.length() > maxLogSize) {
    newLog = newLog.substring(0, maxLogSize);
  }
  serialLog = newLog;
}

// Function to set up and sync time
void setupTime() {
  updateSerialLog("Synchronizing system time with NTP servers...");
  configTime(3 * 3600, 3600, "pool.ntp.org", "time.nist.gov");
  time_t now = time(nullptr);
  while (now < 1000) {
    delay(500);
    now = time(nullptr);
  }
  updateSerialLog("System time synchronized successfully");
}