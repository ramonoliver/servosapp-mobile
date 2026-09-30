import * as Clipboard from "expo-clipboard";
import { StyleSheet, useColorScheme } from "react-native";
import { Button } from "@/components/ui/Button";
import { CopyIcon } from "@/components/ui/icons";
import { solid } from "@/theme/tokens";

// Colar o código ou a mensagem do convite. No iOS usa o botão de colar do
// sistema (UIPasteControl): cola sem o aviso "permitir colar?".
export function PasteCodeButton({ onPaste }: { onPaste: (text: string) => void }) {
  const tone = solid[useColorScheme() === "dark" ? "dark" : "light"];
  if (Clipboard.isPasteButtonAvailable) {
    return (
      <Clipboard.ClipboardPasteButton
        acceptedContentTypes={["plain-text"]}
        displayMode="iconAndLabel"
        cornerStyle="capsule"
        backgroundColor={tone.muted}
        foregroundColor={tone.foreground}
        style={styles.native}
        onPress={(data) => {
          if (data.type === "text") onPaste(data.text);
        }}
      />
    );
  }
  return (
    <Button
      label="Colar código"
      icon={CopyIcon}
      variant="ghost"
      onPress={async () => {
        const text = await Clipboard.getStringAsync().catch(() => "");
        if (text) onPaste(text);
      }}
    />
  );
}

const styles = StyleSheet.create({
  native: { height: 40, width: 120, alignSelf: "flex-start" },
});
