/**
 * Push notification setup for iOS & Android
 * Uses expo-notifications for cross-platform push
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android notification channels
const CHANNELS = [
  {
    id: 'default',
    name: 'eStokvel',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0A2463',
    sound: 'default',
  },
  {
    id: 'payments',
    name: 'Payments & Money',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#D4A017',
    sound: 'default',
  },
  {
    id: 'meetings',
    name: 'Meetings',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 150, 300],
    lightColor: '#059669',
    sound: 'default',
  },
  {
    id: 'announcements',
    name: 'Announcements',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250],
    lightColor: '#7C3AED',
    sound: 'default',
  },
  {
    id: 'chat',
    name: 'Group Chat',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  },
] as const;

export type NotificationChannelId = typeof CHANNELS[number]['id'];

/**
 * Register for push notifications. Returns Expo push token or null.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      for (const ch of CHANNELS) {
        await Notifications.setNotificationChannelAsync(ch.id, {
          name: ch.name,
          importance: ch.importance,
          vibrationPattern: (ch as any).vibrationPattern,
          lightColor: (ch as any).lightColor,
          sound: ch.sound,
          enableVibrate: true,
          showBadge: true,
        });
      }
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });

    return tokenData.data;
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Schedule an immediate local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  channelId: NotificationChannelId = 'default'
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: null,
  });
}

/** Notify user about a money movement */
export function notifyPayment(type: 'received' | 'payout', amount: number, groupName: string) {
  const isReceived = type === 'received';
  return scheduleLocalNotification(
    isReceived ? 'Contribution Received' : 'Payout Processed',
    isReceived
      ? `R${amount.toFixed(2)} contribution recorded for ${groupName}`
      : `R${amount.toFixed(2)} payout processed from ${groupName}`,
    { type: 'transaction', screen: 'notifications' },
    'payments'
  );
}

/** Notify about a new meeting */
export function notifyMeeting(title: string, date: string) {
  return scheduleLocalNotification(
    'Meeting Scheduled',
    `${title} on ${date}`,
    { type: 'meeting', screen: 'dashboard' },
    'meetings'
  );
}

/** Notify about a new announcement */
export function notifyAnnouncement(title: string, fromName: string) {
  return scheduleLocalNotification(
    'New Announcement',
    `${fromName}: ${title}`,
    { type: 'announcement', screen: 'dashboard' },
    'announcements'
  );
}

/** Get iOS badge count */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/** Set iOS badge count */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/** Clear all delivered notifications */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await setBadgeCount(0);
}
