import { InlineKeyboard } from 'grammy';

export function statusKeyboard() {
  return new InlineKeyboard()
    .text('▶️ Start', 'ctl:start')
    .text('⏹ Stop', 'ctl:stop')
    .text('🔄 Restart', 'ctl:restart');
}