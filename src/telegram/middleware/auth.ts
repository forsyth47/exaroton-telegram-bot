import { Context, NextFunction } from "grammy";
import { config } from "../../config.js";

export async function requireGroupAdmin(ctx: Context, next: NextFunction) {
  const chat = ctx.chat;
  if (!chat) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery("Only for groups.");
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  if (config.adminUserIds.includes(userId)) return next();

  if (chat.type === "private") {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery("Must be used in a group.");
    else await ctx.reply("This must be used in a group chat.");
    return;
  }

  try {
    const member = await ctx.getChatMember(userId);
    if (["creator", "administrator"].includes(member.status)) return next();
  } catch (e) { console.error("Auth check failed", e); }

  if (ctx.callbackQuery) await ctx.answerCallbackQuery("Admins only.");
  else await ctx.reply("You must be a group administrator.");
}