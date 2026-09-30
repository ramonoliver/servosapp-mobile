import { View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import type { Icon } from "./icons";
import { ListRow, RowDivider } from "./ListRow";

export interface SheetAction {
  label: string;
  description?: string;
  icon?: Icon;
  destructive?: boolean;
  onPress: () => void;
}

/** Ações contextuais sobre um item (§44 BottomSheet). Fecha antes de agir. */
export function ActionSheet({
  visible,
  onClose,
  title,
  description,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actions: SheetAction[];
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} description={description}>
      <View>
        {actions.map((a, i) => (
          <View key={a.label}>
            {i > 0 ? <RowDivider inset={a.icon ? 58 : 16} /> : null}
            <ListRow
              icon={a.icon}
              title={a.label}
              subtitle={a.description}
              destructive={a.destructive}
              trailing={null}
              onPress={() => {
                onClose();
                // Deixa o sheet fechar antes de abrir um Alert nativo por cima.
                setTimeout(a.onPress, 250);
              }}
            />
          </View>
        ))}
      </View>
      <Button label="Fechar" variant="ghost" fullWidth onPress={onClose} />
    </BottomSheet>
  );
}
