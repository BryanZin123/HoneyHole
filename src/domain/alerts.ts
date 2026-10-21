import type { Coordinates } from "./geography";
/** Portable contracts only. No scheduling or delivery is active yet. */
export interface TimeWindow {
  start: string;
  end: string;
}
export interface AlertPreference {
  ownerId: string;
  enabled: boolean;
  locationIds: string[];
  speciesIds: string[];
  advanceNoticeMinutes: number;
  userTimeZone: string;
  quietHours: { startMinute: number; endMinute: number } | null;
  allowExactCoordinates: boolean;
  maxAlertsPerDay: number;
}
export interface ForecastEvidence {
  issuedAt: string;
  validity: TimeWindow;
  sourceUrls: string[];
  status: "available" | "missing" | "stale";
  confidence: "unassessed" | "insufficient" | "sufficient";
  missingFields: string[];
  hazards: "unknown" | "clear" | "present";
}
export interface ScheduledAlert {
  id: string;
  ownerId: string;
  locationId: string;
  speciesId: string | null;
  forecast: ForecastEvidence;
  fishingWindow: TimeWindow;
  locationTimeZone: string;
  evaluatedAt: string;
  scheduledFor: string;
  deduplicationKey: string;
  reasons: string[];
  uncertainties: string[];
  status: "pending" | "cancelled" | "expired" | "delivered";
}
export interface NotificationPayload {
  alertId: string;
  title: string;
  body: string;
  fishingWindow: TimeWindow;
  locationLabel: string;
  coordinates?: Coordinates;
}
export interface DeviceSubscription {
  id: string;
  ownerId: string;
  platform: "web" | "android" | "ios";
  encryptedProviderToken: string;
  permission: "granted" | "denied" | "revoked";
  updatedAt: string;
}
export interface DeliveryRecord {
  alertId: string;
  subscriptionId: string;
  attempt: number;
  attemptedAt: string;
  deliveredAt: string | null;
  status: "sent" | "failed" | "retry-scheduled";
  errorCode: string | null;
}
