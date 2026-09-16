declare namespace Express {
  export interface Request {
    user: {
      id: string;
      username: string;
      email: string;
      role: "admin" | "user";
      avatar?: string;
      isActive?: boolean;
      isEmailVerified?: boolean;
      sessionVersion?: number;
    };
  }
}
