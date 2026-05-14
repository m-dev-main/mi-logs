export type AdminSessionStatus =
  | {
      authenticated: true;
      registered: true;
      csrfToken: string;
      expiresAt: string;
    }
  | {
      authenticated: false;
      registered: boolean;
      csrfToken: null;
      expiresAt: null;
    };

export type AdminSessionResponse = {
  data: AdminSessionStatus;
};

export type LogoutResponse = {
  data: {
    ok: true;
  };
};
