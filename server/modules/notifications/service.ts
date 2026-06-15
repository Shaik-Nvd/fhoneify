import { notifications, Notification } from '../../data';

export function getUserNotifications(userId: string): Notification[] {
  return notifications.filter((n) => n.userId === userId);
}
