export interface TelegramRuntime {
  start(): Promise<void>;
  stop(): Promise<void>;
}