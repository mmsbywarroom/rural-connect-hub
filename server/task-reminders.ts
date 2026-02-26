import { db } from "./db";
import { taskConfigs, taskSubmissions, appUsers, pushSubscriptions } from "@shared/schema";
import { eq, and, sql, notInArray } from "drizzle-orm";
import { sendPushToUser } from "./push";
import { log } from "./index";

const REMINDER_INTERVAL_MS = 60 * 60 * 1000;
const TASK_AGE_HOURS = 24;

const notifiedCache = new Set<string>();

export function startTaskReminderScheduler() {
  log("Task reminder scheduler started (runs every hour)", "reminders");

  setTimeout(() => {
    checkAndSendReminders();
  }, 30 * 1000);

  setInterval(() => {
    checkAndSendReminders();
  }, REMINDER_INTERVAL_MS);
}

async function checkAndSendReminders() {
  try {
    const cutoff = new Date(Date.now() - TASK_AGE_HOURS * 60 * 60 * 1000);

    const enabledTasks = await db
      .select()
      .from(taskConfigs)
      .where(
        and(
          eq(taskConfigs.isEnabled, true),
          sql`${taskConfigs.createdAt} <= ${cutoff}`
        )
      );

    if (enabledTasks.length === 0) return;

    const activeUsers = await db
      .select({ id: appUsers.id, name: appUsers.name })
      .from(appUsers)
      .where(eq(appUsers.isActive, true));

    if (activeUsers.length === 0) return;

    const usersWithPush = await db
      .select({ appUserId: pushSubscriptions.appUserId })
      .from(pushSubscriptions)
      .groupBy(pushSubscriptions.appUserId);

    const pushUserIds = new Set(usersWithPush.map((u) => u.appUserId));

    for (const task of enabledTasks) {
      const completedUsers = await db
        .select({ appUserId: taskSubmissions.appUserId })
        .from(taskSubmissions)
        .where(eq(taskSubmissions.taskConfigId, task.id))
        .groupBy(taskSubmissions.appUserId);

      const completedSet = new Set(completedUsers.map((u) => u.appUserId));

      const pendingUsers = activeUsers.filter(
        (u) => !completedSet.has(u.id) && pushUserIds.has(u.id)
      );

      let sent = 0;
      for (const user of pendingUsers) {
        const cacheKey = `${task.id}:${user.id}:${new Date().toISOString().split("T")[0]}`;
        if (notifiedCache.has(cacheKey)) continue;

        try {
          await sendPushToUser(
            user.id,
            `Pending Task: ${task.name}`,
            `You have not completed "${task.name}" yet. Please complete it soon.`,
            "/app"
          );
          notifiedCache.add(cacheKey);
          sent++;
        } catch (err) {
        }
      }

      if (sent > 0) {
        log(`Sent ${sent} reminder(s) for task "${task.name}"`, "reminders");
      }
    }

    if (notifiedCache.size > 10000) {
      notifiedCache.clear();
    }
  } catch (error) {
    console.error("Task reminder error:", error);
  }
}
