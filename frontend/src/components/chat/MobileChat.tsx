"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface MobileChatProps {
  apiEndpoint: string;
  /** 僅供螢幕閱讀器，畫面不顯示 */
  npcName?: string;
  placeholder: string;
  allowImageUpload?: boolean;
  /** 上傳按鈕說明，例如 InBody */
  imageHint?: string;
  welcomeMessage: string;
  onProfileUpdate?: (data: unknown) => void;
}

export function MobileChat({
  apiEndpoint,
  npcName = "",
  placeholder,
  allowImageUpload = false,
  imageHint = "照片",
  welcomeMessage,
  onProfileUpdate,
}: MobileChatProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
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
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.documentElement.classList.toggle("chat-modal-open", open);
    return () => document.documentElement.classList.remove("chat-modal-open");
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  async function sendMessage(
    text: string,
    imageBase64?: string,
    mimeType?: string,
  ) {
    if (!text.trim() && !imageBase64) return;
    if (!open) setOpen(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: imageBase64
        ? `📷 已上傳${imageHint}${text.trim() ? `：${text}` : ""}`
        : text,
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
        body: JSON.stringify({ message: text, imageBase64, mimeType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.reply ?? data.error ?? "請求失敗");
      }

      onProfileUpdate?.(data);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply ?? data.message ?? "已記錄。",
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      const errMsg =
        e instanceof Error ? e.message : "連線失敗，請確認後端已啟動";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errMsg,
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
      const prompt =
        input.trim() ||
        (imageHint.includes("InBody")
          ? "請解析這張 InBody 報告並更新我的體態數據"
          : "請解析這張圖片");
      sendMessage(prompt, base64, file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const fab = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="chat-fab"
      aria-label={npcName ? `開啟${npcName}` : "開啟 AI 助手"}
    >
      <span className="chat-fab-icon" aria-hidden>
        💬
      </span>
    </button>
  );

  const modal =
    open &&
    mounted &&
    createPortal(
      <div className="chat-modal-root" role="dialog" aria-modal="true">
        <button
          type="button"
          className="chat-modal-backdrop"
          aria-label="關閉"
          onClick={() => setOpen(false)}
        />
        <div className="chat-modal-panel">
          <header className="chat-modal-header">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="chat-modal-close"
              aria-label="關閉對話"
            >
              ✕
            </button>
          </header>

          <ul ref={listRef} className="chat-modal-messages">
            {messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  "max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-accent text-bg-app"
                    : "mr-auto bg-bg-elevated text-text",
                )}
              >
                {m.content}
              </li>
            ))}
            {loading && (
              <li className="text-sm text-text-muted">解析中，請稍候…</li>
            )}
          </ul>

          <footer className="chat-modal-footer">
            {allowImageUpload && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  className="chat-modal-upload"
                  aria-label={`上傳${imageHint}`}
                >
                  <span className="text-base">📷</span>
                </button>
              </>
            )}
            <input
              type="text"
              enterKeyHint="send"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !loading && sendMessage(input)
              }
              placeholder={placeholder}
              className="chat-modal-input"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="chat-modal-send"
            >
              送
            </button>
          </footer>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {fab}
      {modal}
    </>
  );
}
