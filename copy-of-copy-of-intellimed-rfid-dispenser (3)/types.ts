export enum UserRole {
  Admin = 'admin',
  Patient = 'patient',
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
}

export interface NotificationPreferences {
  medicationReminders: boolean; // For the 5-min warnings
  customAlerts: boolean; // For admin-set reminders
}

export interface Patient extends User {
  rfid: string;
  photo: string; // base64 string
  useFacialRecognition: boolean;
  medications: Medication[];
  reminders: CustomReminder[];
  healthLog: HealthLogEntry[];
  chatHistory: ChatMessage[];
  notificationPreferences: NotificationPreferences;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string; // HH:mm format
  taken: boolean;
  lastTakenDate?: string; // YYYY-MM-DD
}

export interface CustomReminder {
  id: string;
  medicationId: string;
  time: string; // HH:mm format
  message: string;
}

export enum HealthLogType {
  MedicationTaken = 'MedicationTaken',
  AICoachQuery = 'AICoachQuery',
  MealAnalyzed = 'MealAnalyzed',
  YogaSession = 'YogaSession',
}

export interface HealthLogEntry {
  id: string;
  type: HealthLogType;
  timestamp: string; // ISO 8601 format
  description: string;
}

export interface DispenseHistoryEntry {
  patientName: string;
  medicationName: string;
  dosage: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
}