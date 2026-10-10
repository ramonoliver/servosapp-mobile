import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import type { MeProfile } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { useSession } from "@/auth/session";
import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DateTimeField, fromDate } from "@/components/ui/DateTimeField";
import { CameraIcon, LockSimpleIcon } from "@/components/ui/icons";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { errorText } from "@/features/leader/queries";
import { maskPhone } from "@/features/profile/format";
import { churchToday } from "@/features/schedules/format";
import { birthDateStart } from "@/lib/dateField";
import { track } from "@/lib/analytics";
import { color, gutter, radius, space } from "@/theme/tokens";

const KEY = ["me"] as const;

// Meus dados (§55): foto, nome, celular e nascimento. O e-mail é a conta de
// acesso — mudar é com a liderança (evita perder o login por engano).
export default function MyDataScreen() {
  const me = useQuery({ queryKey: KEY, queryFn: endpoints.me });
  if (me.isError) return <ErrorState message={errorText(me.error)} onRetry={() => void me.refetch()} />;
  if (!me.data) {
    return (
      <View style={styles.loading}>
        <Skeleton width={88} height={88} rounded={44} />
        <Skeleton height={52} />
        <Skeleton height={52} />
      </View>
    );
  }
  return <Form key={me.data.id} me={me.data} />;
}

function Form({ me }: { me: MeProfile }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { updateUser } = useSession();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(maskPhone(me.phone));
  const [birthDate, setBirthDate] = useState<string | null>(me.birthDate ? me.birthDate.slice(0, 10) : null);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState(me.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const dirty = name.trim() !== me.name || phone.replace(/\D/g, "") !== me.phone.replace(/\D/g, "") || (birthDate ?? null) !== (me.birthDate?.slice(0, 10) ?? null);

  const save = useMutation({
    mutationFn: () => endpoints.updateProfile({ name: name.trim(), phone: phone.trim(), birthDate }),
    onSuccess: async () => {
      await updateUser({ name: name.trim() });
      await qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["overview"] });
      track("profile_updated", { field: "data" });
      toast.show({ kind: "success", title: "Dados salvos" });
    },
    onError: (e) => setError(errorText(e)),
  });

  const submit = () => {
    if (name.trim().split(/\s+/).length < 2) return setError("Informe nome e sobrenome.");
    const digits = phone.replace(/\D/g, "");
    if (digits && digits.length < 10) return setError("Celular incompleto. Use DDD + número.");
    setError(null);
    save.mutate();
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const { url } = await endpoints.uploadPhoto({ uri: asset.uri });
      setPhoto(url);
      await updateUser({ photo_url: url });
      void qc.invalidateQueries({ queryKey: KEY });
      track("profile_updated", { field: "photo" });
      toast.show({ kind: "success", title: "Foto atualizada" });
    } catch (e) {
      toast.show({ kind: "error", title: e instanceof ApiError ? e.message : "Não foi possível enviar a foto." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <Pressable
          onPress={pickPhoto}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={photo ? "Trocar foto do perfil" : "Adicionar foto do perfil"}
          style={styles.photo}
        >
          <View>
            <Avatar name={name || me.name} photoUrl={photo} avatarColor={me.avatarColor} size={88} />
            <View style={styles.cameraBadge}>
              {uploading ? <ActivityIndicator size="small" color={color.inverseForeground} /> : <CameraIcon size={16} color={color.inverseForeground} weight="bold" />}
            </View>
          </View>
          <Text variant="label" color="primaryText">
            {photo ? "Trocar foto" : "Adicionar foto"}
          </Text>
        </Pressable>

        <View style={styles.form}>
          <TextField label="Nome completo" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" textContentType="name" />
          <TextField
            label="Celular"
            value={phone}
            onChangeText={(t) => setPhone(maskPhone(t))}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="(00) 00000-0000"
            hint="A liderança usa para falar com você sobre as escalas."
          />
          <DateTimeField
            label="Data de nascimento"
            mode="date"
            value={birthDate}
            onChange={setBirthDate}
            maximumDate={fromDate(new Date(), "date")}
            emptyStart={birthDateStart(churchToday())}
            placeholder="Não informada"
            error={error}
          />
        </View>

        <Button label="Salvar alterações" size="lg" fullWidth disabled={!dirty} loading={save.isPending} onPress={submit} />

        <SectionHeader title="Conta" />
        <Card padded={false}>
          <ListRow title="E-mail" subtitle={`${me.email}\nPara trocar, fale com a liderança da igreja.`} />
          <RowDivider inset={space[4]} />
          <ListRow icon={LockSimpleIcon} title="Alterar senha" onPress={() => setPasswordOpen(true)} />
          <RowDivider />
          <ListRow title="Igreja" subtitle={me.church.name || "—"} />
        </Card>
      </ScrollView>
      {passwordOpen ? <PasswordSheet onClose={() => setPasswordOpen(false)} /> : null}
    </KeyboardAvoidingView>
  );
}

function PasswordSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: () => endpoints.changePassword(current, next),
    onSuccess: () => {
      toast.show({ kind: "success", title: "Senha alterada" });
      onClose();
    },
    onError: (e) => setError(errorText(e)),
  });
  const submit = () => {
    if (!current) return setError("Informe sua senha atual.");
    if (next.length < 6) return setError("A nova senha precisa ter pelo menos 6 caracteres.");
    setError(null);
    change.mutate();
  };
  return (
    <BottomSheet visible onClose={onClose} title="Alterar senha" description="Se entrou com código por e-mail ou Google e não lembra a senha, use “Esqueci minha senha” no login.">
      <View style={styles.sheetForm}>
        <TextField label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" textContentType="password" />
        <TextField label="Nova senha" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="Pelo menos 6 caracteres." error={error} />
        <Button label="Alterar senha" size="lg" fullWidth loading={change.isPending} onPress={submit} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  content: { padding: gutter, paddingBottom: space[12], gap: space[5] },
  loading: { flex: 1, padding: gutter, gap: space[4], alignItems: "center", backgroundColor: color.background },
  photo: { alignItems: "center", gap: space[2], alignSelf: "center" },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: color.inverse,
    borderWidth: 2,
    borderColor: color.background,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: space[4] },
  sheetForm: { gap: space[4] },
});
