import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { ArrowsClockwiseIcon, CalendarBlankIcon, type Icon } from "@/components/ui/icons";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { color, radius, space } from "@/theme/tokens";

export type DeclineChoice = "replacement" | "unavailable";

/**
 * Montado de novo a cada abertura (`key` no chamador) — estado sempre limpo.
 *
 * "Não posso servir" (§21): nunca cancela em silêncio. A pessoa escolhe o
 * que acontece com a vaga, pode dar um motivo, e confirma.
 */
export function DeclineSheet({
  visible,
  onClose,
  onSubmit,
  submitting,
  allowReplacement = true,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (choice: DeclineChoice, reason: string) => void;
  submitting: boolean;
  /** Sem rede não dá para pedir substituição (o líder precisa receber agora). */
  allowReplacement?: boolean;
}) {
  const [choice, setChoice] = useState<DeclineChoice>(allowReplacement ? "replacement" : "unavailable");
  const [reason, setReason] = useState("");

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      dismissable={!submitting}
      title="Não poderá servir?"
      description="Seu líder será avisado. Escolha o que fazer com a sua vaga."
    >
      <View style={styles.options} accessibilityRole="radiogroup">
        <Option
          icon={ArrowsClockwiseIcon}
          title="Solicitar substituição"
          description={allowReplacement ? "Seu líder escolhe quem entra no seu lugar." : "Disponível quando a conexão voltar."}
          selected={choice === "replacement"}
          disabled={!allowReplacement}
          onPress={() => setChoice("replacement")}
        />
        <Option
          icon={CalendarBlankIcon}
          title="Informar indisponibilidade"
          description="Você fica indisponível neste dia e a vaga volta para o líder."
          selected={choice === "unavailable"}
          onPress={() => setChoice("unavailable")}
        />
      </View>
      <TextField
        label="Motivo (opcional)"
        placeholder="Ex.: vou estar viajando"
        value={reason}
        onChangeText={setReason}
        maxLength={500}
        multiline
        returnKeyType="done"
      />
      <View style={styles.actions}>
        <Button
          label={choice === "replacement" ? "Pedir substituição" : "Avisar o líder"}
          size="lg"
          fullWidth
          loading={submitting}
          onPress={() => onSubmit(choice, reason.trim())}
        />
        <Button label="Voltar" variant="ghost" fullWidth disabled={submitting} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

function Option({
  icon: IconComponent,
  title,
  description,
  selected,
  disabled,
  onPress,
}: {
  icon: Icon;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${title}. ${description}`}
      disabled={disabled}
      onPress={onPress}
      style={[styles.option, selected ? styles.optionSelected : null, disabled ? styles.optionDisabled : null]}
    >
      <IconComponent size={22} color={selected ? color.primaryText : color.foregroundSecondary} />
      <View style={styles.optionText}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="foregroundSecondary">
          {description}
        </Text>
      </View>
      <View style={[styles.radio, selected ? styles.radioOn : null]}>{selected ? <View style={styles.radioDot} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  options: { gap: space[2] },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.border,
  },
  optionSelected: { borderColor: color.primary, backgroundColor: color.primarySoft },
  optionDisabled: { opacity: 0.5 },
  optionText: { flex: 1, gap: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: color.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  actions: { gap: space[1] },
});
