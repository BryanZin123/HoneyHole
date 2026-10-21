import type {
  AlertPreference,
  ScheduledAlert,
  DeviceSubscription,
  NotificationPayload,
  DeliveryRecord,
} from "../domain/alerts";
/** Interfaces reserve boundaries; production implementations and behavioral tests are milestone 6. */
export interface NotificationPreferenceStore {
  get(ownerId: string): Promise<AlertPreference | null>;
}
export interface ScheduledAlertStore {
  /** Implementation must atomically enforce deduplicationKey uniqueness. */
  createIfAbsent(alert: ScheduledAlert): Promise<boolean>;
  listForOwner(ownerId: string): Promise<ScheduledAlert[]>;
}
export interface NotificationDelivery {
  send(
    subscription: DeviceSubscription,
    payload: NotificationPayload,
  ): Promise<DeliveryRecord>;
}
export interface BackgroundScheduler {
  schedule(alertId: string, runAt: string): Promise<void>;
  cancel(alertId: string): Promise<void>;
}
