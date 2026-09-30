import { useState } from "react";
import { useIsOnline } from "@/components/ui/States";
import { useRequestReplacement, useRespond } from "@/features/schedules/queries";
import { DeclineSheet, type DeclineChoice } from "./DeclineSheet";
import { track } from "@/lib/analytics";

/**
 * Ações do servo sobre a própria convocação, iguais na Home e no Detalhe.
 * Um único caminho evita dois comportamentos para o mesmo botão (§44).
 */
export function useAssignmentActions(target: { assignmentId: string; scheduleId: string; date: string } | null) {
  const respond = useRespond();
  const replacement = useRequestReplacement();
  const online = useIsOnline();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);

  const confirm = () => {
    if (!target || respond.isPending) return; // duplo toque (edge case #24)
    respond.mutate({ ...target, status: "confirmed" });
    track("assignment_confirmed");
  };

  const submitDecline = (choice: DeclineChoice, reason: string) => {
    if (!target) return;
    if (choice === "replacement") {
      replacement.mutate(
        { assignmentId: target.assignmentId, scheduleId: target.scheduleId, reason },
        { onSuccess: () => setDeclineOpen(false) },
      );
      track("replacement_requested", { withReason: Boolean(reason.trim()) });
    } else {
      respond.mutate({ ...target, status: "declined", reason, markUnavailable: true });
      track("assignment_declined", { withReason: Boolean(reason.trim()) });
      setDeclineOpen(false);
    }
  };

  const sheet = (
    <DeclineSheet
      key={sheetKey}
      visible={declineOpen}
      onClose={() => setDeclineOpen(false)}
      onSubmit={submitDecline}
      submitting={replacement.isPending}
      allowReplacement={online}
    />
  );

  return {
    confirm,
    confirming: respond.isPending && respond.variables?.status === "confirmed",
    openDecline: () => {
      setSheetKey((k) => k + 1);
      setDeclineOpen(true);
    },
    sheet,
  };
}
