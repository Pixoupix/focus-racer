// In-memory pub/sub for real-time notification delivery via SSE
// Works on single-server deployments (standalone Next.js on dedicated server)

type Listener = (data: { type: string }) => void;

interface Subscription {
  id: string;
  listener: Listener;
}

class NotificationEmitter {
  private adminSubscriptions: Map<string, Subscription> = new Map();
  private userSubscriptions: Map<string, Subscription[]> = new Map();
  private nextId = 0;

  // Subscribe to admin notifications (new messages from users)
  subscribeAdmin(listener: Listener): string {
    const id = `admin_${++this.nextId}`;
    this.adminSubscriptions.set(id, { id, listener });
    return id;
  }

  // Subscribe to user notifications (admin replies)
  subscribeUser(userId: string, listener: Listener): string {
    const id = `user_${++this.nextId}`;
    const subs = this.userSubscriptions.get(userId) || [];
    subs.push({ id, listener });
    this.userSubscriptions.set(userId, subs);
    return id;
  }

  unsubscribe(subId: string): void {
    if (subId.startsWith("admin_")) {
      this.adminSubscriptions.delete(subId);
    } else {
      // Find and remove from user subscriptions
      for (const [userId, subs] of this.userSubscriptions.entries()) {
        const filtered = subs.filter((s) => s.id !== subId);
        if (filtered.length !== subs.length) {
          if (filtered.length === 0) {
            this.userSubscriptions.delete(userId);
          } else {
            this.userSubscriptions.set(userId, filtered);
          }
          break;
        }
      }
    }
  }

  // Notify all admin connections to refresh their unread count
  notifyAdmin(): void {
    for (const sub of this.adminSubscriptions.values()) {
      try {
        sub.listener({ type: "admin_unread" });
      } catch {
        // Connection might be closed
        this.adminSubscriptions.delete(sub.id);
      }
    }
  }

  // Notify a specific user to refresh their unread count
  notifyUser(userId: string): void {
    const subs = this.userSubscriptions.get(userId);
    if (!subs) return;
    const alive: Subscription[] = [];
    for (const sub of subs) {
      try {
        sub.listener({ type: "user_unread" });
        alive.push(sub);
      } catch {
        // Connection closed, skip
      }
    }
    if (alive.length === 0) {
      this.userSubscriptions.delete(userId);
    } else {
      this.userSubscriptions.set(userId, alive);
    }
  }

  getStats() {
    let userConns = 0;
    for (const subs of this.userSubscriptions.values()) {
      userConns += subs.length;
    }
    return {
      adminConnections: this.adminSubscriptions.size,
      userConnections: userConns,
    };
  }
}

// Singleton — survives hot reloads in dev via globalThis
const globalForNotifications = globalThis as unknown as {
  notificationEmitter: NotificationEmitter | undefined;
};

export const notificationEmitter =
  globalForNotifications.notificationEmitter ??
  (globalForNotifications.notificationEmitter = new NotificationEmitter());
