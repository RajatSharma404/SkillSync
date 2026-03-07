"use client";
import { useEffect } from "react";

// Fires a browser notification if the user hasn't logged today and it's past their reminder time.
// Requires the page to be open (no service worker needed).
export default function NotificationProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined")
      return;
    if (Notification.permission !== "granted") return;

    const enabled = localStorage.getItem("notif_enabled") === "true";
    if (!enabled) return;

    const reminderTime = localStorage.getItem("notif_time") ?? "09:00";
    const [rh, rm] = reminderTime.split(":").map(Number);

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const lastFired = localStorage.getItem("notif_last_fired");

    // Only fire once per day
    if (lastFired === todayKey) return;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const reminderMinutes = rh * 60 + rm;
    if (nowMinutes < reminderMinutes) return; // not yet time

    // Check if user has logged anything today
    fetch("/api/activities?limit=5")
      .then((r) => r.json())
      .then((activities: { loggedAt: string }[]) => {
        const loggedToday =
          Array.isArray(activities) &&
          activities.some((a) => a.loggedAt?.slice(0, 10) === todayKey);

        if (!loggedToday) {
          new Notification("SkillSync Reminder ⚡", {
            body: "You haven't logged any activity today. Keep your streak going!",
            icon: "/favicon.ico",
            tag: "daily-reminder",
          });
          localStorage.setItem("notif_last_fired", todayKey);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
