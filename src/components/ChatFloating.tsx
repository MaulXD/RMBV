"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useSession } from "./SessionProvider";
import { Icon } from "./ui/Icon";

type Member = { id: string; name: string; avatarUrl: string | null; role: string };
type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
  receiverId: string | null;
};
type Room = "team" | string;

function initials(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

function Avatar({ user, size = 28 }: { user: { name: string; avatarUrl: string | null }; size?: number }) {
  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={user.name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        unoptimized={user.avatarUrl.startsWith("/")}
      />
    );
  }
  return (
    <div className="rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-semibold" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(user.name)}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// Inner panel — shared between mobile sheet and desktop float
function ChatPanel({
  user,
  members,
  grouped,
  room,
  roomLabel,
  showConvList,
  input,
  sending,
  inputRef,
  messagesEndRef,
  onRoomChange,
  onShowConvList,
  onClose,
  onInputChange,
  onKeyDown,
  onSend,
}: {
  user: { id: string; name: string; avatarUrl: string | null };
  members: Member[];
  grouped: { day: string; msgs: Message[] }[];
  room: Room;
  roomLabel: string;
  showConvList: boolean;
  input: string;
  sending: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onRoomChange: (r: Room) => void;
  onShowConvList: (v: boolean) => void;
  onClose: () => void;
  onInputChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 overflow-hidden">
      {/* Conversation list */}
      {showConvList && (
        <div className="flex w-full shrink-0 flex-col border-r border-border bg-surface sm:w-[140px]">
          <div className="flex h-11 shrink-0 items-center justify-between px-3 border-b border-border">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Chat</span>
            <button type="button" className="btn-icon sm:hidden" onClick={onClose}>
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-1">
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2.5 sm:py-2 text-left transition-colors hover:bg-surface-elevated text-sm sm:text-xs font-medium rounded-md ${room === "team" ? "bg-primary/10 text-primary" : "text-foreground"}`}
              onClick={() => { onRoomChange("team"); onShowConvList(false); }}
            >
              <div className="flex h-8 w-8 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Icon name="users" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </div>
              <span className="truncate">Equipe</span>
            </button>

            {members.length > 0 && (
              <p className="px-3 pt-3 pb-1 text-[9px] font-bold tracking-widest text-muted/60 uppercase">Direto</p>
            )}
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2.5 sm:py-1.5 text-left transition-colors hover:bg-surface-elevated text-sm sm:text-xs rounded-md ${room === m.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
                onClick={() => { onRoomChange(m.id); onShowConvList(false); }}
              >
                <Avatar user={m} size={28} />
                <span className="truncate">{m.name.split(" ")[0]}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Message pane (hidden on mobile when conv list is shown) */}
      {!showConvList && (
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <button type="button" className="btn-icon" onClick={() => onShowConvList(true)}>
              <Icon name="chevronLeft" className="h-4 w-4" />
            </button>
            <span className="flex-1 truncate text-sm font-semibold text-foreground">{roomLabel}</span>
            <button type="button" className="btn-icon" onClick={onClose}>
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {grouped.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-muted">Nenhuma mensagem ainda</p>
              </div>
            )}
            {grouped.map((group) => (
              <div key={group.day}>
                <div className="my-2 flex items-center gap-2">
                  <div className="flex-1 border-t border-border/50" />
                  <span className="text-[10px] text-muted">{group.day}</span>
                  <div className="flex-1 border-t border-border/50" />
                </div>
                {group.msgs.map((msg, i) => {
                  const isMine = msg.sender.id === user.id;
                  const prevMsg = group.msgs[i - 1];
                  const sameAuthor = prevMsg?.sender.id === msg.sender.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"} ${sameAuthor ? "mt-0.5" : "mt-2"}`}
                    >
                      {!isMine && !sameAuthor && <Avatar user={msg.sender} size={24} />}
                      {!isMine && sameAuthor && <div style={{ width: 24 }} />}
                      <div className={`group flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[78%]`}>
                        {!isMine && !sameAuthor && (
                          <span className="mb-0.5 text-[10px] font-medium text-muted px-1">
                            {msg.sender.name.split(" ")[0]}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                            isMine
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-bl-sm bg-surface border border-border text-foreground"
                          }`}
                        >
                          {msg.body}
                        </div>
                        <span className="mt-0.5 hidden text-[9px] text-muted/60 group-hover:block px-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border p-2">
            <div className="flex items-end gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-primary/50">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Mensagem..."
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
                style={{ maxHeight: 80 }}
              />
              <button
                type="button"
                disabled={!input.trim() || sending}
                onClick={onSend}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              >
                <Icon name="send" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop message pane when conv list is visible */}
      {showConvList && (
        <div className="hidden sm:flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="flex-1 truncate text-sm font-semibold text-foreground">{roomLabel}</span>
            <button type="button" className="btn-icon" onClick={onClose}>
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {grouped.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-muted">Nenhuma mensagem ainda</p>
              </div>
            )}
            {grouped.map((group) => (
              <div key={group.day}>
                <div className="my-2 flex items-center gap-2">
                  <div className="flex-1 border-t border-border/50" />
                  <span className="text-[10px] text-muted">{group.day}</span>
                  <div className="flex-1 border-t border-border/50" />
                </div>
                {group.msgs.map((msg, i) => {
                  const isMine = msg.sender.id === user.id;
                  const prevMsg = group.msgs[i - 1];
                  const sameAuthor = prevMsg?.sender.id === msg.sender.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"} ${sameAuthor ? "mt-0.5" : "mt-2"}`}
                    >
                      {!isMine && !sameAuthor && <Avatar user={msg.sender} size={24} />}
                      {!isMine && sameAuthor && <div style={{ width: 24 }} />}
                      <div className={`group flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[75%]`}>
                        {!isMine && !sameAuthor && (
                          <span className="mb-0.5 text-[10px] font-medium text-muted px-1">
                            {msg.sender.name.split(" ")[0]}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl px-3 py-1.5 text-sm leading-relaxed ${
                            isMine
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-bl-sm bg-surface border border-border text-foreground"
                          }`}
                        >
                          {msg.body}
                        </div>
                        <span className="mt-0.5 hidden text-[9px] text-muted/60 group-hover:block px-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="shrink-0 border-t border-border p-2">
            <div className="flex items-end gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-primary/50">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Mensagem..."
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
                style={{ maxHeight: 80 }}
              />
              <button
                type="button"
                disabled={!input.trim() || sending}
                onClick={onSend}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              >
                <Icon name="send" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatFloating({
  open,
  onOpenChange,
  onUnreadChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadChange?: (count: number) => void;
}) {
  const { user } = useSession();
  const [room, setRoom] = useState<Room>("team");
  const [showConvList, setShowConvList] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const lastSeenRef = useRef<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Propagate unread count to parent
  useEffect(() => { onUnreadChange?.(unreadTotal); }, [unreadTotal, onUnreadChange]);

  // Load last-seen timestamps
  useEffect(() => {
    try {
      const stored = localStorage.getItem("chat_last_seen");
      if (stored) lastSeenRef.current = JSON.parse(stored) as Record<string, string>;
    } catch {}
  }, []);

  function saveLastSeen(r: Room, ts: string) {
    lastSeenRef.current[r] = ts;
    try { localStorage.setItem("chat_last_seen", JSON.stringify(lastSeenRef.current)); } catch {}
  }

  const fetchMembers = useCallback(async () => {
    if (!user?.teamId) return;
    const res = await fetch("/api/chat/members");
    if (res.ok) {
      const data = await res.json() as { members: Member[] };
      setMembers(data.members);
    }
  }, [user?.teamId]);

  const fetchMessages = useCallback(async (r: Room, polling = false) => {
    if (!user?.teamId) return;
    const params = new URLSearchParams();
    if (r !== "team") params.set("withId", r);
    if (polling) {
      const lastSeen = lastSeenRef.current[`poll_${r}`];
      if (lastSeen) params.set("after", lastSeen);
    }
    const res = await fetch(`/api/chat/messages?${params}`);
    if (!res.ok) return;
    const data = await res.json() as { messages: Message[] };
    if (polling) {
      if (data.messages.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const fresh = data.messages.filter((m) => !ids.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        const last = data.messages[data.messages.length - 1]!;
        lastSeenRef.current[`poll_${r}`] = last.createdAt;
      }
    } else {
      setMessages(data.messages);
      if (data.messages.length > 0) {
        const last = data.messages[data.messages.length - 1]!;
        lastSeenRef.current[`poll_${r}`] = last.createdAt;
        saveLastSeen(r, last.createdAt);
      }
    }
  }, [user?.teamId]);

  useEffect(() => {
    if (!open || !user?.teamId) return;
    setMessages([]);
    void fetchMessages(room, false);
    saveLastSeen(room, new Date().toISOString());
  }, [room, open, user?.teamId, fetchMessages]);

  useEffect(() => {
    if (open) {
      void fetchMembers();
      setShowConvList(true);
    }
  }, [open, fetchMembers]);

  useEffect(() => {
    if (!open || !user?.teamId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => void fetchMessages(room, true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, room, user?.teamId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Unread badge when closed
  useEffect(() => {
    if (open || !user?.teamId) return;
    let cancelled = false;
    const checkUnread = async () => {
      try {
        const params = new URLSearchParams();
        const after = lastSeenRef.current["team"];
        if (after) params.set("after", after);
        const res = await fetch(`/api/chat/messages?${params}`);
        if (res.ok && !cancelled) {
          const data = await res.json() as { messages: Message[] };
          const newCount = data.messages.filter((m) => m.sender.id !== user.id).length;
          if (newCount > 0) setUnreadTotal((prev) => prev + newCount);
        }
      } catch {}
    };
    const id = setInterval(checkUnread, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [open, user?.teamId, user?.id]);

  useEffect(() => {
    if (open) setUnreadTotal(0);
  }, [open]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const body: Record<string, string> = { body: input.trim() };
      if (room !== "team") body.receiverId = room;
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json() as { message: Message };
        setMessages((prev) => [...prev, data.message]);
        lastSeenRef.current[`poll_${room}`] = data.message.createdAt;
        setInput("");
        inputRef.current?.focus();
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  if (!user) return null;
  const semEquipe = !user.teamId;
  if (semEquipe && !open) return null;

  const activeRoom = room === "team" ? null : members.find((m) => m.id === room);
  const roomLabel = room === "team" ? "Equipe" : activeRoom?.name ?? "...";

  const grouped: { day: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const day = formatDay(msg.createdAt);
    if (!grouped.length || grouped[grouped.length - 1]!.day !== day) {
      grouped.push({ day, msgs: [msg] });
    } else {
      grouped[grouped.length - 1]!.msgs.push(msg);
    }
  }

  const panelProps = {
    user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
    members,
    grouped,
    room,
    roomLabel,
    showConvList,
    input,
    sending,
    inputRef,
    messagesEndRef,
    onRoomChange: (r: Room) => setRoom(r),
    onShowConvList: (v: boolean) => setShowConvList(v),
    onClose: () => onOpenChange(false),
    onInputChange: (v: string) => setInput(v),
    onKeyDown: handleKeyDown,
    onSend: () => void sendMessage(),
  };

  const floatBtn = (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      title={open ? "Fechar chat" : "Abrir chat"}
    >
      <Icon name={open ? "x" : "messageCircle"} className="h-5 w-5" />
      {!open && unreadTotal > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {unreadTotal > 99 ? "99+" : unreadTotal}
        </span>
      )}
    </button>
  );

  if (semEquipe) {
    return (
      <>
        {/* Mobile: full-screen bottom sheet (sem equipe) */}
        <div
          className={`lg:hidden fixed inset-0 z-[60] flex flex-col bg-surface-elevated transition-transform duration-300 ease-out ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ willChange: "transform" }}
        >
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Icon name="messageCircle" className="mb-4 h-12 w-12 text-muted/30" />
            <p className="text-sm font-medium text-foreground">Chat indisponível</p>
            <p className="mt-1 text-xs text-muted">Você precisa estar vinculado a uma equipe para usar o chat.</p>
            <button type="button" onClick={() => onOpenChange(false)} className="btn-primary mt-6 px-4 py-2 text-sm">
              Fechar
            </button>
          </div>
        </div>

        {/* Desktop: button + panel (sem equipe) */}
        <div className="hidden lg:flex fixed bottom-4 right-4 z-50 flex-col items-end gap-2">
          {open && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface-elevated p-8 text-center shadow-2xl" style={{ width: 380, height: 520 }}>
              <Icon name="messageCircle" className="mb-4 h-12 w-12 text-muted/30" />
              <p className="text-sm font-medium text-foreground">Chat indisponível</p>
              <p className="mt-1 text-xs text-muted">Você precisa estar vinculado a uma equipe para usar o chat.</p>
              <button type="button" onClick={() => onOpenChange(false)} className="btn-primary mt-6 px-4 py-2 text-sm">
                Fechar
              </button>
            </div>
          )}
          {floatBtn}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile: full-screen bottom sheet */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] flex flex-col bg-surface-elevated transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ willChange: "transform" }}
      >
        <ChatPanel {...panelProps} />
      </div>

      {/* Desktop: bottom-right floating panel + toggle button */}
      <div className="hidden lg:flex fixed bottom-4 right-4 z-50 flex-col items-end gap-2">
        {open && (
          <div
            className="flex overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-2xl"
            style={{ width: 380, height: 520 }}
          >
            <ChatPanel {...panelProps} />
          </div>
        )}
        {floatBtn}
      </div>
    </>
  );
}
