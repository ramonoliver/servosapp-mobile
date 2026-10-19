import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, View } from "react-native";
import { ApiError } from "@/api/client";
import { endpoints, type AuthResponse } from "@/api/endpoints";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { FilterChips } from "@/components/ui/Filters";
import { PlusIcon, ShareNetworkIcon, TrashIcon } from "@/components/ui/icons";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import {
  churchInviteMessage,
  churchStepError,
  DEFAULT_SERVICES,
  personStepError,
  servicesPayload,
  WEEKDAYS,
  type Service,
} from "@/features/church/signup";
import { maskCode } from "@/features/join/join";
import { maskPhone } from "@/features/profile/format";
import { track } from "@/lib/analytics";
import { newPasswordProps } from "@/lib/e2e";
import { color, font, gutter, hitSize, radius, space } from "@/theme/tokens";

type Step = "church" | "person" | "code" | "done";
// `id` só identifica o cartão na tela (key estável ao remover um culto);
// não vai para o servidor (servicesPayload lê só dia e horário).
type ServiceRow = Service & { id: number };

const RESEND_SECONDS = 45;
const DAY_OPTIONS = WEEKDAYS.map((label, i) => ({ value: String(i), label }));

// Criar igreja (quem chega primeiro numa igreja que ainda não usa o Servos):
// igreja e cultos → seus dados → código no e-mail → igreja criada, com o
// código para convidar a equipe. A pessoa vira admin e a igreja fica ativa
// na hora (servidor: /api/auth/register/code e /api/auth/register).
export default function CreateChurchScreen() {
  const { enterWithResponse } = useSession();
  const [step, setStep] = useState<Step>("church");
  const [churchName, setChurchName] = useState("");
  const [services, setServices] = useState<ServiceRow[]>(() => DEFAULT_SERVICES.map((s, id) => ({ ...s, id })));
  const nextServiceId = useRef(DEFAULT_SERVICES.length);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailInUse, setEmailInUse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [created, setCreated] = useState<(AuthResponse & { churchCode: string | null }) | null>(null);
  const codeRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const fail = (e: unknown, fallback: string) => setError(e instanceof ApiError ? e.message : fallback);

  const nextFromChurch = () => {
    const problem = churchStepError(churchName, services);
    setError(problem);
    if (!problem) setStep("person");
  };

  const sendCode = async () => {
    if (busy) return;
    const problem = personStepError({ name, email, password });
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    setEmailInUse(false);
    try {
      await endpoints.requestChurchSignupCode(email);
      setCode("");
      setWait(RESEND_SECONDS);
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 250);
    } catch (e) {
      if (e instanceof ApiError && e.body?.code === "EMAIL_IN_USE") setEmailInUse(true);
      fail(e, "Não foi possível enviar o código. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const create = async (value = code) => {
    if (busy || value.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await endpoints.registerChurch({
        churchName: churchName.trim(),
        weeklyServices: servicesPayload(services),
        name: name.trim(),
        email,
        phone: phone.trim(),
        password,
        emailCode: value,
      });
      track("signup_submitted", { via: "church_created", status: "approved" });
      setCreated(res);
      setStep("done");
    } catch (e) {
      fail(e, "Não foi possível criar a igreja. Tente novamente.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const onCode = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void create(digits);
  };

  const updateService = (id: number, patch: Partial<Service>) =>
    setServices((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const start = async () => {
    if (!created || busy) return;
    setBusy(true);
    try {
      await enterWithResponse(created);
    } catch (e) {
      fail(e, "Não foi possível entrar. Tente pela tela de login.");
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
      >
        {step === "church" ? (
          <>
            <Head
              title="Sua igreja no Servos"
              text="Você cria a igreja e vira o administrador. Depois é só mandar o código para a sua equipe entrar."
            />
            <TextField
              label="Nome da igreja"
              placeholder="Ex.: Igreja Batista Vida"
              value={churchName}
              onChangeText={(t) => {
                setChurchName(t);
                if (error) setError(null);
              }}
              autoCapitalize="words"
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              autoFocus
            />
            <View style={styles.group}>
              <Text variant="bodyStrong">Cultos da semana</Text>
              <Text variant="label" color="foregroundSecondary">
                Viram os eventos de onde saem as escalas. Dá para mudar depois.
              </Text>
              {services.map((s) => (
                <Card key={s.id}>
                  <View style={styles.service}>
                    <FilterChips options={DAY_OPTIONS} value={String(s.day)} onChange={(d) => updateService(s.id, { day: Number(d) })} />
                    <View style={styles.serviceRow}>
                      <View style={styles.flex}>
                        <DateTimeField label="Horário" mode="time" value={s.time} onChange={(time) => updateService(s.id, { time })} />
                      </View>
                      <Button
                        label="Remover"
                        icon={TrashIcon}
                        variant="ghost"
                        onPress={() => setServices((list) => list.filter((x) => x.id !== s.id))}
                      />
                    </View>
                  </View>
                </Card>
              ))}
              <Button
                label="Adicionar culto"
                icon={PlusIcon}
                variant="secondary"
                fullWidth
                onPress={() => {
                  const id = nextServiceId.current++;
                  setServices((list) => [...list, { id, day: 0, time: "19:00" }]);
                }}
              />
            </View>
            <ErrorText error={error} />
            <Button label="Continuar" size="lg" fullWidth onPress={nextFromChurch} />
          </>
        ) : step === "person" ? (
          <>
            <Head title="Seus dados" text={`Você vai ser o administrador da ${churchName.trim()}.`} />
            <TextField
              label="Nome completo"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              autoFocus
            />
            <TextField
              ref={emailRef}
              label="E-mail"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setEmailInUse(false);
              }}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            <TextField
              ref={phoneRef}
              label="Celular (opcional)"
              value={phone}
              onChangeText={(t) => setPhone(maskPhone(t))}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextField
              ref={passwordRef}
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              {...newPasswordProps}
              returnKeyType="send"
              onSubmitEditing={() => void sendCode()}
            />
            <ErrorText error={error} />
            {emailInUse ? <Button label="Entrar com este e-mail" variant="secondary" fullWidth onPress={() => router.replace("/login")} /> : null}
            <Button label="Enviar código para o e-mail" size="lg" fullWidth loading={busy} onPress={() => void sendCode()} />
            <Button label="Voltar" variant="ghost" onPress={() => { setError(null); setStep("church"); }} />
          </>
        ) : step === "code" ? (
          <>
            <Head title="Digite o código" text={`Enviamos um código de 6 dígitos para ${email.trim().toLowerCase()}. Ele vale por 10 minutos.`} />
            <View>
              <TextInput
                ref={codeRef}
                value={code}
                onChangeText={onCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                accessibilityLabel="Código de 6 dígitos"
                style={styles.hidden}
                caretHidden
              />
              <View style={styles.boxes} onTouchEnd={() => codeRef.current?.focus()} accessible={false} importantForAccessibility="no-hide-descendants">
                {Array.from({ length: 6 }, (_, i) => (
                  <View key={i} style={[styles.box, i === code.length && !busy ? styles.boxActive : null, error ? styles.boxError : null]}>
                    <Text style={styles.digit}>{code[i] ?? ""}</Text>
                  </View>
                ))}
              </View>
            </View>
            <ErrorText error={error} />
            <Button label="Criar igreja" size="lg" fullWidth loading={busy} disabled={code.length !== 6} onPress={() => void create()} />
            <View style={styles.row}>
              <Button label="Trocar e-mail" variant="ghost" onPress={() => { setError(null); setStep("person"); }} />
              <Button label={wait > 0 ? `Reenviar em ${wait}s` : "Reenviar código"} variant="ghost" disabled={wait > 0 || busy} onPress={() => void sendCode()} />
            </View>
          </>
        ) : (
          <>
            <Head title="Igreja criada!" text="Agora mande o código para a sua equipe. Quem entrar com ele aparece para você aprovar." />
            {created?.churchCode ? (
              <Card>
                <View style={styles.codeCard}>
                  <Text variant="overline" color="primaryText">
                    Código da {churchName.trim()}
                  </Text>
                  <Text style={styles.churchCode} accessibilityLabel={`Código ${created.churchCode.split("").join(" ")}`}>
                    {maskCode(created.churchCode)}
                  </Text>
                  <Button
                    label="Compartilhar código"
                    icon={ShareNetworkIcon}
                    variant="secondary"
                    fullWidth
                    onPress={() => {
                      track("invite_shared", { kind: "church_created" });
                      void Share.share({ message: churchInviteMessage(churchName.trim(), created.churchCode!) });
                    }}
                  />
                </View>
              </Card>
            ) : (
              <Text variant="body" color="foregroundSecondary">
                O código da igreja aparece em Perfil → Convidar pessoas.
              </Text>
            )}
            <ErrorText error={error} />
            <Button label="Começar" size="lg" fullWidth loading={busy} onPress={() => void start()} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Head({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.head}>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" color="foregroundSecondary">
        {text}
      </Text>
    </View>
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Text variant="label" color="danger" accessibilityLiveRegion="polite">
      {error}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  content: { padding: gutter, gap: space[5], paddingBottom: space[12] },
  head: { gap: space[2] },
  group: { gap: space[3] },
  service: { gap: space[3] },
  serviceRow: { flexDirection: "row", alignItems: "flex-end", gap: space[2] },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
  boxes: { flexDirection: "row", gap: space[2], justifyContent: "space-between" },
  box: {
    flex: 1,
    height: hitSize + 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderColor: color.primary },
  boxError: { borderColor: color.danger },
  digit: { fontFamily: font.semibold, fontSize: 24, color: color.foreground, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", justifyContent: "space-between" },
  codeCard: { gap: space[3], alignItems: "center" },
  churchCode: { fontFamily: font.bold, fontSize: 36, letterSpacing: 4, color: color.foreground, fontVariant: ["tabular-nums"] },
});
