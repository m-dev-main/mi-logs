export type AppErrorInit = {
  message: string;
  statusCode?: number;
  code?: string;
  expose?: boolean;
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(init: AppErrorInit) {
    super(init.message);
    this.name = "AppError";
    this.statusCode = init.statusCode ?? 500;
    this.code = init.code ?? "INTERNAL_ERROR";
    this.expose = init.expose ?? false;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
