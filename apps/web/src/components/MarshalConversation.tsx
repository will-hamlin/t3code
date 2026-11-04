import { useRef, useState } from "react";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { AuthOrchestrationOperateScope } from "@t3tools/contracts";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { useEnvironmentScope } from "../state/session";
import { useOrchestrationCommand } from "../state/use-orchestration-command";
import { threadEnvironment } from "../state/threads";
import { useThreadProjection } from "../state/entities";
import { newMessageId } from "../lib/utils";
import { displayText } from "../lib/displayText";
import ChatMarkdown from "./ChatMarkdown";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export function MarshalBriefing({ thread, cwd }: { thread: EnvironmentThreadShell; cwd: string }) {
  const projection = useThreadProjection(
    scopeThreadRef(thread.environmentId, thread.id),
  )?.projection;
  const reply = projection?.visibleTurnItems
    .map((entry) => entry.item)
    .findLast((item) => item.type === "assistant_message" && item.text.trim() && !item.streaming);
  return reply?.type === "assistant_message" ? (
    <ChatMarkdown text={reply.text} cwd={cwd} environmentId={thread.environmentId} />
  ) : (
    <p className="text-sm text-muted-foreground">
      The orchestrator’s final briefing will appear here after verification.
    </p>
  );
}

export function MarshalConversation({
  thread,
  marshal,
  cwd,
  running,
}: {
  thread: EnvironmentThreadShell;
  marshal: string;
  cwd: string;
  running: boolean;
}) {
  const projection = useThreadProjection(
    scopeThreadRef(thread.environmentId, thread.id),
  )?.projection;
  const canOperate = useEnvironmentScope(thread.environmentId, AuthOrchestrationOperateScope);
  const start = useOrchestrationCommand(threadEnvironment.startTurn, { reportFailure: false });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recent =
    projection?.visibleTurnItems
      .map((entry) => entry.item)
      .filter((item) => item.type === "assistant_message" || item.type === "user_message")
      .slice(-3) ?? [];
  const send = async () => {
    if (!message.trim() || !canOperate || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await start({
        environmentId: thread.environmentId,
        input: {
          threadId: thread.id,
          message: {
            messageId: newMessageId(),
            role: "user",
            text: message.trim(),
            attachments: [],
          },
          modelSelection: thread.modelSelection,
          runtimeMode: thread.runtimeMode,
          interactionMode: thread.interactionMode,
          dispatchMode: running ? "steer" : "auto",
          createdAt: new Date().toISOString(),
        },
      });
      if (result._tag === "Failure") throw squashAtomCommandFailure(result);
      setMessage("");
      setNotice(running ? "Direction sent to the orchestrator." : "Message sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the message.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section aria-label={`Talk to ${marshal}`} className="mt-6 border-t border-border pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium">Talk to {marshal}</h4>
        <span className="font-mono text-2xs text-muted-foreground">
          {running ? "Orchestrating · open to direction" : "Direct line"}
        </span>
      </div>
      {recent.length ? (
        <div
          role="log"
          aria-label={`${marshal} conversation`}
          className="mb-4 max-h-56 space-y-3 overflow-auto rounded-lg border border-border p-3"
        >
          {recent.map((item) => (
            <div key={item.id} className="text-sm">
              <p className="mb-1 font-mono text-2xs text-muted-foreground">
                {item.type === "user_message" ? "You" : marshal}
              </p>
              {item.type === "assistant_message" || item.type === "user_message" ? (
                <ChatMarkdown text={item.text} cwd={cwd} environmentId={thread.environmentId} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className="space-y-3"
      >
        <Textarea
          aria-label={`Ask ${marshal} a question`}
          placeholder={`Ask ${marshal} a question…`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={!canOperate || busy}
        />
        <div className="flex items-center justify-between gap-3">
          <p role="status" className="text-xs text-muted-foreground">
            {notice ?? "Messages stay in this assignment’s conversation."}
          </p>
          <Button type="submit" size="sm" disabled={!canOperate || busy || !message.trim()}>
            {busy ? "Sending…" : "Send message"}
          </Button>
        </div>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-error">
          {displayText(error)}
        </p>
      ) : null}
    </section>
  );
}
