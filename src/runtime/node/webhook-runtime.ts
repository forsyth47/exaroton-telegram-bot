import express from "express";
import { Bot, webhookCallback } from "grammy";
import { spawn, ChildProcess } from "node:child_process";
import { TelegramRuntime } from "../telegram-runtime.js";

export class WebhookTelegramRuntime implements TelegramRuntime {
  private app: express.Express;
  private server: any;
  private cloudflared: ChildProcess | null = null;

  constructor(
    private bot: Bot,
    private port: number = 8080,
    private path: string = "/telegram"
  ) {
    this.app = express();
    
    // Parse JSON updates from Telegram
    this.app.use(express.json());

    // Health check endpoint (useful for AWS/monitoring)
    this.app.get("/health", (req, res) => res.status(200).send("OK"));

    // grammY webhook handler
    const handleUpdate = webhookCallback(this.bot, "express");
    this.app.post(this.path, (req, res) => handleUpdate(req, res));
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 1. Start local Express server first
      this.server = this.app.listen(this.port, async () => {
        console.log(`🌐 Local webhook server listening on port ${this.port}`);
        
        // 2. Automatically start Cloudflare Tunnel and set webhook
        try {
          await this.startCloudflareTunnel();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private async startCloudflareTunnel(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("🚀 Starting Cloudflare Tunnel (this may take a few seconds)...");
      
      // Spawn cloudflared as a child process
      this.cloudflared = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${this.port}`]);

      let tunnelUrl = "";

      // cloudflared outputs the URL to stderr
      this.cloudflared.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        // Optionally log cloudflared output, but keep it clean
        // console.log(output.trim()); 
        
        // Extract the trycloudflare.com URL using regex
        const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !tunnelUrl) {
          tunnelUrl = match[0];
          console.log(`\n✅ Cloudflare Tunnel established: ${tunnelUrl}`);
          
          // Once we have the URL, set the Telegram webhook
          this.setupTelegramWebhook(tunnelUrl).then(resolve).catch(reject);
        }
      });

      this.cloudflared.on("error", (err: any) => {
        if (err.code === "ENOENT") {
          console.error("❌ Failed to start cloudflared: Command not found.");
          console.error("💡 Please install cloudflared on this machine first:");
          console.error("   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared");
          console.error("   chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/");
        } else {
          console.error("❌ Failed to start cloudflared:", err);
        }
        reject(err);
      });

      this.cloudflared.on("close", (code) => {
        if (!tunnelUrl) {
          reject(new Error(`Cloudflared exited with code ${code} before establishing a tunnel.`));
        }
      });
    });
  }

  private async setupTelegramWebhook(url: string): Promise<void> {
    const webhookUrl = `${url}${this.path}`;
    console.log(`🔗 Setting Telegram webhook to: ${webhookUrl}`);
    
    // Give Cloudflare's DNS a few seconds to propagate globally
    console.log("⏳ Waiting 3 seconds for DNS propagation...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      await this.bot.api.setWebhook(webhookUrl, {
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      });
      console.log("✅ Telegram webhook set successfully!");
    } catch (error) {
      console.error("❌ Failed to set Telegram webhook:", error);
      console.log("💡 Tip: trycloudflare.com domains sometimes fail Telegram's DNS checks.");
      console.log("💡 Consider using TRANSPORT=polling in your .env for local development.");
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log("🛑 Shutting down webhook runtime...");
    
    // 1. Delete Telegram webhook so it stops sending requests to a dead endpoint
    try {
      await this.bot.api.deleteWebhook({ drop_pending_updates: true });
      console.log("✅ Telegram webhook deleted.");
    } catch (err) {
      console.error("⚠️ Failed to delete webhook:", err);
    }

    // 2. Gracefully kill the cloudflared child process
    if (this.cloudflared) {
      console.log("🛑 Stopping Cloudflare Tunnel...");
      this.cloudflared.kill("SIGINT");
      this.cloudflared = null;
    }

    // 3. Close the Express server
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err: any) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });
  }
}