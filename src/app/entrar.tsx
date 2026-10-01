import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ApiError } from "@/api/client";
import type { JoinLookup } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckCircleIcon, UsersThreeIcon } from "@/components/ui/icons";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { SocialButtons, useSocialProviders } from "@/components/auth/SocialButtons";
import { PasteCodeButton } from "@/components/join/PasteCodeButton";
import { codeFromClipboard, codeProblem, isCompleteCode, maskCode, normalizeCode, parseInviteLink, socialSignupName } from "@/features/join/join";
import type { SocialCredential } from "@/lib/socialAuth";
import { color, gutter, radius, space } from "@/theme/tokens";
import { track } from "@/lib/analytics";

const lookupError = (e: unknown) => (e instanceof ApiError ? e.message : "Não foi possível verificar o código. Tente novamente.");

// Entrar na igreja: 1) código (ou link do convite, que já traz o código)
// 2) dados da pessoa. Convite pessoal → entra direto; código/link → aguarda
// a aprovação da liderança.
export default function JoinScreen() {
  const params = useLocalSearchParams<{ c?: string; i?: string }>();
  const fromLink = Boolean(params.c && isCompleteCode(normalizeCode(params.c)));

  const [code, setCode] = useState(() => maskCode(params.c ?? ""));
  const [invite, setInvite] = useState<string | null>(params.i ?? null);
  const [manual, setManual] = useState<JoinLookup | null>(null);
  const [dismissedLink, setDismissedLink] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Veio pelo link do convite: confere sozinho.
  const auto = useQuery({
    queryKey: ["join-lookup", params.c ?? "", params.i ?? ""],
    queryFn: () => endpoints.joinLookup(normalizeCode(params.c ?? ""), params.i ?? null),
    enabled: fromLink,
    retry: false,
    gcTime: 0,
  });
  const lookup = manual ?? (dismissedLink ? null : auto.data ?? null);
  const shownCodeError = codeError ?? (!dismissedLink && auto.error ? lookupError(auto.error) : null);

  const check = async (rawCode: string, inviteToken: string | null) => {
    const c = normalizeCode(rawCode);
    const problem = codeProblem(c);
    if (problem) {
      setCodeError(problem);
      return;
    }
    setChecking(true);
    setCodeError(null);
    setDismissedLink(true);
    try {
      setManual(await endpoints.joinLookup(c, inviteToken));
    } catch (e) {
      setCodeError(lookupError(e));
    } finally {
      setChecking(false);
    }
  };

  const onCodeChange = (text: string) => {
    const link = parseInviteLink(text);
    if (link) {
      setCode(maskCode(link.code));
      setInvite(link.invite);
      void check(link.code, link.invite);
      return;
    }
    setCode(maskCode(text));
    setCodeError(null);
  };

  const onPaste = (text: string) => {
    const found = codeFromClipboard(text);
    if (!found) {
      setCodeError("Não achamos um código no que você copiou. Digite as 6 letras e números.");
      return;
    }
    setCode(maskCode(found.code));
    setInvite(found.invite);
    void check(found.code, found.invite);
  };

  const reset = () => {
    setManual(null);
    setDismissedLink(true);
    setInvite(null);
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <View style={styles.head}>
          <Text variant="display" accessibilityRole="header">
            Entrar na sua igreja
          </Text>
          <Text variant="body" color="foregroundSecondary">
            {lookup
              ? "Agora, seus dados. É com eles que você vai entrar no app."
              : "Use o link do convite ou o código que a liderança passou para você."}
          </Text>
        </View>

        {!lookup ? (
          <>
            <TextField
              label="Código da igreja"
              value={code}
              onChangeText={onCodeChange}
              placeholder="ABC-123"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={200}
              returnKeyType="go"
              onSubmitEditing={() => void check(code, invite)}
              error={shownCodeError}
              hint="São 6 letras e números. Pode colar o link do convite aqui."
              style={styles.codeInput}
            />
            <PasteCodeButton onPaste={onPaste} />
            <Button label="Continuar" size="lg" fullWidth loading={checking || auto.isFetching} onPress={() => void check(code, invite)} />
          </>
        ) : (
          <SignupForm key={`${lookup.church.code}-${invite ?? ""}`} lookup={lookup} invite={invite} onChangeChurch={reset} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SignupForm({ lookup, invite, onChangeChurch }: { lookup: JoinLookup; invite: string | null; onChangeChurch: () => void }) {
  const { finishSignup } = useSession();
  const [name, setName] = useState(lookup.invite?.name ?? "");
  const [email, setEmail] = useState(lookup.invite?.email ?? "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const preapproved = lookup.invite?.kind === "person";
  const providers = useSocialProviders();
  const hasSocial = providers.google || providers.apple === true;

  // Apple/Google: a conta de login vem do provedor — sem senha, e-mail
  // confirmado por ele. Só falta o nome, se a conta não mandou.
  const socialSignup = async (credential: SocialCredential) => {
    let fullName = socialSignupName(name, credential.name);
    if (!fullName) fullName = await askFullName(credential.name ?? name);
    if (!fullName) {
      setFormError("Informe nome e sobrenome no campo Nome completo e toque de novo.");
      return;
    }
    setSending(true);
    setFormError(null);
    try {
      const outcome = await endpoints.joinSignup({ code: lookup.church.code, invite, name: fullName, phone: phone.trim(), idToken: credential.idToken });
      track("signup_submitted", { via: invite ? lookup.invite?.kind ?? "link" : "code", status: outcome.status, method: credential.provider });
      await finishSignup(outcome);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    if (sending) return;
    if (name.trim().split(/\s+/).length < 2) return setFormError("Informe nome e sobrenome.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setFormError("Informe um e-mail válido.");
    if (password.length < 6) return setFormError("A senha precisa ter pelo menos 6 caracteres.");
    setSending(true);
    setFormError(null);
    try {
      const outcome = await endpoints.joinSignup({
        code: lookup.church.code,
        invite,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      track("signup_submitted", { via: invite ? lookup.invite?.kind ?? "link" : "code", status: outcome.status });
      await finishSignup(outcome);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card style={styles.church}>
        <View style={styles.churchIcon}>
          <UsersThreeIcon size={24} color={color.primaryText} weight="duotone" />
        </View>
        <View style={styles.flex}>
          <Text variant="heading">{lookup.church.name}</Text>
          <Text variant="label" color="foregroundSecondary">
            {lookup.invite
              ? `Convite de ${lookup.invite.inviterName.split(" ")[0]}${lookup.invite.ministryName ? ` · ${lookup.invite.ministryName}` : ""}`
              : [lookup.church.city, `Código ${maskCode(lookup.church.code)}`].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Button label="Trocar" variant="ghost" onPress={onChangeChurch} />
      </Card>

      {hasSocial ? (
        <>
          <SocialButtons onCredential={socialSignup} onError={setFormError} disabled={sending} />
          <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.rule} />
            <Text variant="caption" color="mutedForeground">
              ou com e-mail e senha
            </Text>
            <View style={styles.rule} />
          </View>
        </>
      ) : null}

      <View style={styles.form}>
        <TextField
          label="Nome completo"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label="E-mail"
          value={email}
          onChangeText={setEmail}
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
          onChangeText={setPhone}
          autoComplete="tel"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Crie uma senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          hint="Pelo menos 6 caracteres."
          error={formError}
        />
      </View>

      <View style={styles.notice}>
        <CheckCircleIcon size={18} color={preapproved ? color.success : color.info} weight="bold" />
        <Text variant="label" color={preapproved ? "success" : "info"} style={styles.flex}>
          {preapproved
            ? "Este convite é pessoal: você entra direto, sem esperar aprovação."
            : "A liderança da igreja confirma seu cadastro. Você recebe o aviso aqui no app."}
        </Text>
      </View>

      <Button label={preapproved ? "Criar conta e entrar" : "Enviar cadastro"} size="lg" fullWidth loading={sending} onPress={submit} />
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  content: { padding: gutter, paddingBottom: space[12], gap: space[5] },
  head: { gap: space[2] },
  codeInput: { fontSize: 22, letterSpacing: 3 },
  church: { flexDirection: "row", alignItems: "center", gap: space[3] },
  churchIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: space[4] },
  notice: { flexDirection: "row", alignItems: "center", gap: space[2] },
  divider: { flexDirection: "row", alignItems: "center", gap: space[3] },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.borderStrong },
});

/** A Apple só manda o nome no primeiro login: pergunta (só existe no iOS, onde a Apple aparece). */
function askFullName(suggestion: string): Promise<string | null> {
  if (Platform.OS !== "ios") return Promise.resolve(null);
  return new Promise((resolve) => {
    Alert.prompt(
      "Qual é o seu nome?",
      "Nome e sobrenome, como a liderança conhece você.",
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(null) },
        { text: "Continuar", onPress: (value?: string) => resolve(socialSignupName(value ?? "", null)) },
      ],
      "plain-text",
      suggestion,
    );
  });
}
