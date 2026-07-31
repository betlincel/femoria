const AUTH_KEY = "femoria-demo-auth";

export interface DemoUser {
  name: string;
  email: string;
  role: "buyer" | "producer";
}

export interface DemoAuthService {
  getUser(): DemoUser | null;
  signIn(user: DemoUser): void;
  signOut(): void;
}

export interface AuthStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createDemoAuthService(storage: AuthStorage | null): DemoAuthService {
  return {
    getUser() {
      if (!storage) return null;
      try {
        const parsed: unknown = JSON.parse(storage.getItem(AUTH_KEY) ?? "null");
        if (
          parsed &&
          typeof parsed === "object" &&
          "name" in parsed &&
          "email" in parsed &&
          "role" in parsed &&
          typeof parsed.name === "string" &&
          typeof parsed.email === "string" &&
          (parsed.role === "buyer" || parsed.role === "producer")
        ) {
          return parsed as DemoUser;
        }
      } catch {
        return null;
      }
      return null;
    },
    signIn(user) {
      storage?.setItem(AUTH_KEY, JSON.stringify(user));
    },
    signOut() {
      storage?.removeItem(AUTH_KEY);
    },
  };
}
