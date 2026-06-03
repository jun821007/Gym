"use client";

import { useRef, useState } from "react";
import { PixelBox } from "@/components/ui/PixelBox";
import { PixelButton } from "@/components/ui/PixelButton";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface PixelChatProps {
  /** 分頁專屬 API 路徑，Step 3 後端接上後使用 */
  apiEndpoint: string;
  npcName: string;
  npcTitle: string;
  placeholder: string;
  /** 是否顯示圖片上傳（InBody / 食物） */
  allowImageUpload?: boolean;
  welcomeMessage: string;
  onProfileUpdate?: (data: unknown) => void;
}

export function PixelChat({
  apiEndpoint,
  npcName,
  npcTitle,
  placeholder,
  allowImageUpload = false,
  welcomeMessage,
  onProfileUpdate,
}: PixelChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function sendMessage(text: string, imageBase64?: string) {
    if (!text.trim() && !imageBase64) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || "（已上傳圖片）",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}${apiEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          imageBase64,
        }),
      });

      if (!res.ok) throw new Error("API 尚未連線");

      const data = await res.json();
      if (data.profileUpdate) onProfileUpdate?.(data.profileUpdate);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply ?? data.message ?? JSON.stringify(data),
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "⚠ 後端 API 尚未啟動。Step 3 完成後將連線 " + apiEndpoint,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      sendMessage(input, base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <PixelBox title={`${npcTitle} — ${npcName}`} className="flex h-full flex-col">
      <div className="pixel-dialog mb-3 max-h-48 flex-1 overflow-y-auto p-3">
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                "text-[8px] leading-relaxed",
                m.role === "user" ? "text-accent-blue text-right" : "text-text-primary",
              )}
            >
              <span className="text-text-muted">
                {m.role === "user" ? "▷ 你" : "◆ " + npcName}：
              </span>
              <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
            </li>
          ))}
          {loading && (
            <li className="text-[8px] text-text-muted animate-pulse">
              {npcName} 思考中...
            </li>
          )}
        </ul>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage(input)}
          placeholder={placeholder}
          className="flex-1 border-4 border-border-pixel bg-bg-deep px-2 py-2 text-[8px] text-text-primary outline-none focus:border-accent-gold"
          disabled={loading}
        />
        {allowImageUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <PixelButton
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              📷
            </PixelButton>
          </>
        )}
        <PixelButton
          size="sm"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          送出
        </PixelButton>
      </div>
    </PixelBox>
  );
}
