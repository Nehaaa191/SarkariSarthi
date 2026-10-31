import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';

export class UserStore {
  private users: Map<string, User> = new Map();

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email && user.email.trim().toLowerCase() === normalized) {
        return user;
      }
    }
    return undefined;
  }

  findByPhone(phone: string): User | undefined {
    const normalized = phone.trim();
    for (const user of this.users.values()) {
      if (user.phone && user.phone.trim() === normalized) {
        return user;
      }
    }
    return undefined;
  }

  findByGoogleId(googleId: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.googleId === googleId) {
        return user;
      }
    }
    return undefined;
  }

  create(data: Partial<User>): User {
    const id = data.id || uuidv4();
    const newUser: User = {
      ...data,
      id,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  update(id: string, data: Partial<User>): User | undefined {
    const existing = this.users.get(id);
    if (!existing) {
      return undefined;
    }
    const updated: User = {
      ...existing,
      ...data,
      id, // ensure ID is never overwritten
    };
    this.users.set(id, updated);
    return updated;
  }

  // Helper method to clear store (useful in testing)
  clear(): void {
    this.users.clear();
  }
}

export const userStore = new UserStore();
