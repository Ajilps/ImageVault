export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code = "REQUEST_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}
