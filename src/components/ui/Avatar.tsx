import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { color } from "@/theme/tokens";
import { Text } from "./Text";

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Cor de fundo legível para as iniciais (texto branco) a partir da cor do perfil. */
function avatarBg(hex: string | null | undefined): string {
  return /^#[0-9a-f]{6}$/i.test(String(hex)) ? String(hex) : color.foregroundSecondary;
}

export function Avatar({
  name,
  photoUrl,
  avatarColor,
  size = 40,
  ring,
}: {
  name: string;
  photoUrl?: string | null;
  avatarColor?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const style = [
    styles.base,
    { width: size, height: size, borderRadius: size / 2 },
    ring ? { borderWidth: 2, borderColor: color.surface } : null,
  ];
  if (photoUrl && /^(https?:|data:image)/.test(photoUrl)) {
    return <Image source={{ uri: photoUrl }} style={style} contentFit="cover" accessibilityLabel={name} transition={120} />;
  }
  return (
    <View style={[style, { backgroundColor: avatarBg(avatarColor) }]} accessibilityLabel={name} accessible>
      <Text
        variant="label"
        color="inverseForeground"
        maxFontSizeMultiplier={1}
        style={{ fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.5) }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

export function AvatarGroup({
  people,
  max = 4,
  size = 28,
}: {
  people: ({ id: string; name: string; photoUrl?: string | null; avatarColor?: string | null })[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <View
      style={styles.group}
      accessible
      accessibilityLabel={`${people.length} ${people.length === 1 ? "pessoa" : "pessoas"} na equipe`}
    >
      {shown.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size / 3 }}>
          <Avatar name={p.name} photoUrl={p.photoUrl} avatarColor={p.avatarColor} size={size} ring />
        </View>
      ))}
      {rest > 0 ? (
        <View style={[styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 3 }]}>
          <Text variant="caption" color="foregroundSecondary" maxFontSizeMultiplier={1}>
            +{rest}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  group: { flexDirection: "row", alignItems: "center" },
  more: {
    backgroundColor: color.muted,
    borderWidth: 2,
    borderColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
