import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Storage keys
const NOTIFICATION_ENABLED_KEY = 'notification_enabled';
const DAILY_GOAL_KEY = 'daily_goal';
const NOTIFICATION_TOKEN_KEY = 'notification_token';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  dailyGoal: number;
}

export class NotificationService {
  /**
   * Initialize notifications and request permissions
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('NotificationService: Initializing notifications...');
      
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('NotificationService: Permission not granted');
        return false;
      }
      
      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '5028ba7f-437a-4eb7-ac2c-51b6425e93f0', // From app.json
      });
      
      console.log('NotificationService: Push token:', token.data);
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token.data);
      
      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-reminder', {
          name: 'Daily Reminder',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
      console.log('NotificationService: Initialization complete');
      return true;
    } catch (error) {
      console.error('NotificationService: Error initializing:', error);
      return false;
    }
  }

  /**
   * Get current notification settings
   */
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const [enabled, dailyGoal] = await Promise.all([
        AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY),
        AsyncStorage.getItem(DAILY_GOAL_KEY),
      ]);
      
      return {
        enabled: enabled === 'true',
        dailyGoal: dailyGoal ? parseInt(dailyGoal, 10) : 3,
      };
    } catch (error) {
      console.error('NotificationService: Error getting settings:', error);
      return { enabled: false, dailyGoal: 3 };
    }
  }

  /**
   * Update notification settings
   */
  static async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      
      await Promise.all([
        AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, newSettings.enabled.toString()),
        AsyncStorage.setItem(DAILY_GOAL_KEY, newSettings.dailyGoal.toString()),
      ]);
      
      // Schedule or cancel notifications based on settings
      if (newSettings.enabled) {
        await this.scheduleDailyReminder(newSettings.dailyGoal);
      } else {
        await this.cancelAllNotifications();
      }
      
      console.log('NotificationService: Settings updated:', newSettings);
    } catch (error) {
      console.error('NotificationService: Error updating settings:', error);
    }
  }

  /**
   * Schedule daily reminder notification
   */
  static async scheduleDailyReminder(dailyGoal: number): Promise<void> {
    try {
      // Cancel existing notifications first
      await this.cancelAllNotifications();
      
      // Schedule new daily reminder at 12 PM
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Your favourite bird is calling... 📞',
          body: 'It misses you! Come solve a problem and make it happy 😊',
          data: { type: 'daily_reminder', dailyGoal },
        },
        trigger: {
          seconds: 86400, // 24 hours
          repeats: true,
        } as any,
      });
      
      console.log('NotificationService: Daily reminder scheduled for', dailyGoal, 'questions');
    } catch (error) {
      console.error('NotificationService: Error scheduling daily reminder:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('NotificationService: All notifications cancelled');
    } catch (error) {
      console.error('NotificationService: Error cancelling notifications:', error);
    }
  }

  /**
   * Send a test notification immediately
   */
  static async sendTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Testing, testing, 1-2-3! 🎤',
          body: 'If you can read this, notifications are working! Now go code something cool!',
          data: { type: 'test_notification' },
        },
        trigger: null, // Send immediately
      });
      
      console.log('NotificationService: Test notification sent');
    } catch (error) {
      console.error('NotificationService: Error sending test notification:', error);
    }
  }

  /**
   * Send a streak reminder notification
   */
  static async sendStreakReminder(currentStreak: number): Promise<void> {
    try {
      const messages = [
        `Wowza! ${currentStreak} days in a row! You're basically a coding superhero now 🦸`,
        `${currentStreak} days strong! Your future self is doing a happy dance 💃`,
        `Look at you go! ${currentStreak} days of pure dedication. Keep it up, champ! 🏆`,
        `${currentStreak}-day streak alert! Don't break the chain - your code needs you! 🔗`,
        `You've coded ${currentStreak} days straight! That's more consistent than my morning coffee ☕`,
      ];
      
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${currentStreak} Day Streak! 🎉`,
          body: randomMessage,
          data: { type: 'streak_reminder', streak: currentStreak },
        },
        trigger: null, // Send immediately
      });
      
      console.log('NotificationService: Streak reminder sent for', currentStreak, 'days');
    } catch (error) {
      console.error('NotificationService: Error sending streak reminder:', error);
    }
  }

  /**
   * Get notification token
   */
  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
    } catch (error) {
      console.error('NotificationService: Error getting token:', error);
      return null;
    }
  }
} 
