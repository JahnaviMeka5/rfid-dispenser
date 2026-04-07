# 💊 RFID-Based Smart Medicine Dispenser with Cloud Integration

---

## 📌 Project Overview

The **RFID-Based Smart Medicine Dispenser** is an embedded IoT system designed to automate medication dispensing using secure authentication and time-based scheduling.

The system ensures that patients receive the **correct medicine at the correct time**, while also enabling **remote monitoring via cloud integration**. It reduces human error, prevents missed doses, and improves medication adherence.

---

## 🎯 Objectives

* Automate medicine dispensing
* Prevent unauthorized access using RFID
* Ensure time-based controlled delivery
* Enable real-time monitoring using cloud
* Improve patient safety and compliance

---

## 🚀 Key Features

* 🔐 RFID Authentication (MFRC522)
* ⏰ Real-Time Scheduling (RTC - DS3231)
* ⚙️ Automated Dispensing (Servo Motor)
* 🌐 Wi-Fi Enabled (ESP8266 NodeMCU)
* 📊 Cloud Logging (Google Sheets via HTTP)
* 🔔 Missed Dose Tracking (extendable)

---

## 🏗️ System Architecture

### 🔷 High-Level Architecture

```
[ RFID Card ]
      ↓
[ MFRC522 Reader ] --SPI--> [ ESP8266 (NodeMCU) ] --WiFi/HTTP--> [ Cloud Server / Google Sheets ]
                                      ↓
                               I2C Communication
                                      ↓
                                [ RTC DS3231 ]
                                      ↓
                                 PWM Signal
                                      ↓
                                [ Servo Motor ]
                                      ↓
                           [ Medicine Compartment ]
```

---

## ⚙️ Detailed System Design

### 🔹 Components and Roles

| Component             | Role                                 |
| --------------------- | ------------------------------------ |
| ESP8266               | Main controller + WiFi communication |
| MFRC522               | Reads RFID card UID                  |
| DS3231 RTC            | Provides accurate time               |
| Servo Motor           | Controls dispensing mechanism        |
| Cloud (Google Sheets) | Stores logs and monitoring data      |

---

## 🔌 Pin Configuration (NodeMCU ESP8266)

### 📡 RFID Module (MFRC522 - SPI)

| MFRC522 Pin | ESP8266 Pin |
| ----------- | ----------- |
| SDA (SS)    | D2 (GPIO4)  |
| SCK         | D5 (GPIO14) |
| MOSI        | D7 (GPIO13) |
| MISO        | D6 (GPIO12) |
| RST         | D1 (GPIO5)  |
| GND         | GND         |
| 3.3V        | 3.3V        |

---

### ⏰ RTC Module (DS3231 - I2C)

| RTC Pin | ESP8266 Pin               |
| ------- | ------------------------- |
| SDA     | D2 (GPIO4) *(shared bus)* |
| SCL     | D3 (GPIO0)                |
| VCC     | 3.3V                      |
| GND     | GND                       |

---

### ⚙️ Servo Motor (PWM)

| Servo Pin | ESP8266    |
| --------- | ---------- |
| Signal    | D4 (GPIO2) |
| VCC       | 5V         |
| GND       | GND        |

---

## 🔗 Communication Protocols

### 📡 SPI (Serial Peripheral Interface)

* Used for RFID module (MFRC522)
* Fast communication
* Master: ESP8266
* Slave: MFRC522

---

### 🔌 I2C (Inter-Integrated Circuit)

* Used for RTC module (DS3231)
* Two-wire communication (SDA, SCL)
* Shared bus system

---

### 🌐 HTTP over Wi-Fi

* ESP8266 sends data to cloud
* Uses REST API (Google Apps Script)
* Data stored in Google Sheets

---

## 🔄 Working Flow (Step-by-Step)

1. System initializes all modules (RFID, RTC, WiFi)
2. User scans RFID card
3. UID is read via SPI communication
4. System verifies authorized user
5. Current time is fetched from RTC via I2C
6. Time is compared with scheduled dosage
7. If valid:

   * Servo rotates to predefined angle
   * Compartment opens
   * Tablet dispensed
   * Servo returns to lock position
8. Data (user, time, status) sent to cloud via HTTP
9. If invalid → access denied

---

## 📊 Data Flow

```
RFID → ESP8266 → RTC Check → Servo Action → Cloud Logging
```

---

## 📈 Advantages

* Ensures timely medication
* Reduces human dependency
* Secure access control
* Real-time monitoring
* Scalable system

---

## 🚧 Limitations

* Requires continuous power supply
* Internet dependency for cloud logging
* Limited compartments (current design)

---

## 🔮 Future Enhancements

* 📱 Mobile App Integration
* 🔔 SMS / Call Alerts
* 🧠 AI-based health prediction
* 📦 Multi-slot medicine storage
* 🎤 Voice assistant integration

---

## 📷 Project Demonstration

(Add images / video links here)

---

## 🧪 Applications

* Hospitals
* Elderly care
* Home healthcare
* Clinics

---

## 👩‍💻 Author

**Jahnavi Meka**

---

## 📜 License

This project is developed for educational and research purposes.
