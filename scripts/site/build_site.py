"""Gera as páginas legais e de suporte do servosapp.com (site estático, sobe à mão).

Uso: python3 scripts/site/build_site.py [pasta-do-site]
Padrão: ../servosapp.com ao lado deste projeto.

Páginas: /privacidade, /termos, /suporte, /excluir-conta, os arquivos de
links universais em /.well-known e um redirecionamento da política antiga.
"""

import json
import sys
from html import escape
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else APP.parent / "servosapp.com"
CONTACT = "contato@servosapp.com"
UPDATED = "1º de outubro de 2026"

# Preencher antes de subir (ver docs/08-publicacao.md):
APPLE_TEAM_ID = "TEAMID_DA_CONTA_PAGA"
ANDROID_SHA256 = "SHA256_DO_CERTIFICADO_DO_GOOGLE_PLAY"
BUNDLE_ID = "com.servosapp.app"

CSS = """
:root{--bg:#F2F0EC;--surface:#FFF;--fg:#1E1B18;--fg2:#5E5A55;--muted:#716C67;--border:#E2DFDB;--primary:#D83B0C;--primary-pressed:#B32D03;--primary-soft:#FEF4F2}
@media (prefers-color-scheme:dark){:root{--bg:#100E0B;--surface:#1C1916;--fg:#F9F6F3;--fg2:#CFCBC6;--muted:#A8A49E;--border:#2E2A26;--primary:#FF936F;--primary-pressed:#FF936F;--primary-soft:#3A1D13}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:"Geist",system-ui,-apple-system,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
header{max-width:760px;margin:0 auto;padding:28px 20px 0;display:flex;align-items:center;gap:12px}
header a{display:flex;align-items:center;gap:10px;color:var(--fg);text-decoration:none;font-weight:600;font-size:18px}
.mark{width:36px;height:36px;border-radius:10px;background:#F4532A;display:grid;place-items:center}
main{max-width:760px;margin:0 auto;padding:24px 20px 64px}
h1{font-size:34px;line-height:1.15;letter-spacing:-.02em;margin:16px 0 8px;font-weight:600;text-wrap:balance}
.meta{color:var(--muted);font-size:14px;margin:0 0 28px}
.lead{font-size:18px;color:var(--fg2);margin:0 0 28px}
h2{font-size:21px;letter-spacing:-.01em;margin:40px 0 10px;font-weight:600}
h3{font-size:16px;margin:24px 0 6px;font-weight:600}
p,li{color:var(--fg2)}
ul{padding-left:20px}
li{margin:4px 0}
strong{color:var(--fg)}
a{color:var(--primary)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px 22px;margin:20px 0}
.card p:first-child{margin-top:0}.card p:last-child{margin-bottom:0}
.steps{counter-reset:s;list-style:none;padding:0}
.steps li{counter-increment:s;position:relative;padding-left:40px;margin:14px 0}
.steps li::before{content:counter(s);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:var(--primary-soft);color:var(--primary-pressed);display:grid;place-items:center;font-weight:600;font-size:14px}
details{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin:10px 0}
summary{cursor:pointer;font-weight:600;color:var(--fg)}
details p{margin:10px 0 0}
.btn{display:inline-flex;align-items:center;min-height:48px;padding:0 20px;border-radius:12px;background:var(--primary);color:#fff;text-decoration:none;font-weight:500}
footer{max-width:760px;margin:0 auto;padding:0 20px 40px;color:var(--muted);font-size:14px;display:flex;gap:18px;flex-wrap:wrap}
footer a{color:var(--muted)}
"""

MARK = '<span class="mark" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 64 64"><path fill="#F5EDE4" d="M29.07 21.6c1.9 0 6.55 3.48 8.3 4.74 5.26 3.8 11.17 6.34 11.81 13.57.23 2.93-.7 5.82-2.6 8.06-2.88 3.42-7.77 5.05-11.86 3.36-4.09-1.69-3.4-2.64-7.56-.35-3.1 1.7-7.43 1.16-10.24-1.22-1.27-1.3-2.06-2.28-2.49-4.09a8.1 8.1 0 0 1 .94-6.05c.47-.75 1.39-1.38 2.25-1.56 2.17-.46 4.35 1.55 6.01 2.75 1.55 1.14 3.13 2.24 4.73 3.29 2.01 1.3 4.23 2.26 6.66 1.68 2.74-.66 4.91-2.82 5.37-5.62.9-5.18-4.69-7.25-8.05-9.63-2.13-1.5-7.84-4.34-5.49-7.58.64-.88 1.18-1.13 2.23-1.34Z"/><path fill="#F5EDE4" d="M24.05 12.1c1.4-.28 3.36.08 4.72.57 1.4.5 3.27 1.97 4.79 1.73 1.57-.25 3.06-1.65 4.68-1.99 2.46-.64 5.14-.54 7.38.7a10.1 10.1 0 0 1 3.94 4.91c.99 3.45-.6 9.57-5.49 8.12-.72-.22-1.74-1.14-2.41-1.57-2.68-1.74-5.25-3.67-7.98-5.33-1.92-1.17-4.57-1.74-6.76-1.11a7.4 7.4 0 0 0-4.11 3.29c-.95 1.73-.96 3.32-.42 5.15 1.13 3.03 4.99 4.64 7.5 6.39 2.06 1.43 8.18 4.7 5.72 7.88-.51.66-1.27 1.08-2.1 1.19-1.95.23-4.98-2.42-6.61-3.52-2.68-1.77-5.25-3.74-7.86-5.6-8.38-5.94-5.52-19.55 4.99-20.8Z"/></svg></span>'

FOOTER = """<footer><a href="/">Início</a><a href="/suporte/">Suporte</a><a href="/privacidade/">Privacidade</a><a href="/termos/">Termos de uso</a><a href="/excluir-conta/">Excluir conta</a><span>© 2026 Servos</span></footer>"""


def page(title: str, description: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)} · Servos</title>
<meta name="description" content="{escape(description)}">
<meta name="theme-color" content="#F2F0EC">
<link rel="icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
<header><a href="/">{MARK}Servos</a></header>
<main>
{body}
</main>
{FOOTER}
</body>
</html>
"""


PRIVACY = f"""
<h1>Política de Privacidade</h1>
<p class="meta">Atualizada em {UPDATED} · Versão 2.0 · Vale para o app Servos e para o Servos web.</p>
<p class="lead">O Servos organiza escalas de voluntários de igrejas. Coletamos só o que é preciso para isso, não vendemos dados e não mostramos anúncios.</p>

<div class="card"><p><strong>Resumo:</strong> a igreja cadastra a equipe e as escalas; você vê onde e quando serve, confirma presença e conversa com a equipe. Seus dados ficam no Google Firebase, no Brasil (São Paulo). Você pode excluir sua conta a qualquer momento pelo app, em <strong>Perfil → Excluir minha conta</strong>.</p></div>

<h2>1. Quem cuida dos seus dados</h2>
<p>Cada igreja é responsável (controladora, na LGPD) pelos dados da sua equipe: ela decide quem participa, em quais ministérios e escalas. A Servos é a operadora: guarda e processa esses dados para a igreja, seguindo esta política. Dúvidas sobre o que a sua igreja faz com seus dados: fale com a liderança dela. Sobre o Servos: <a href="mailto:{CONTACT}">{CONTACT}</a>.</p>

<h2>2. Dados que coletamos</h2>
<h3>Você informa ou a sua igreja cadastra</h3>
<ul>
<li>Nome, e-mail, celular, data de nascimento (opcional) e foto de perfil (opcional).</li>
<li>Igreja, ministérios, funções, células e papel na liderança.</li>
<li>Escalas: em que dia você serve, sua resposta (confirmar, recusar, pedir substituição) e o motivo, se você escrever.</li>
<li>Datas em que você não pode servir.</li>
<li>Recados na conversa da escala, arquivos anexados, músicas e repertório.</li>
</ul>
<h3>Ao entrar com Google ou Apple</h3>
<p>Recebemos do Google ou da Apple o seu nome, o e-mail e um identificador da conta. Se você usar "Ocultar meu e-mail" da Apple, recebemos um e-mail de encaminhamento da Apple, não o seu. Não recebemos sua senha do Google ou da Apple.</p>
<h3>Do aparelho, automaticamente</h3>
<ul>
<li>Um código do aparelho para enviar notificações (só se você permitir notificações).</li>
<li>Sistema (iOS ou Android), versão do app e eventos de uso sem dado pessoal — por exemplo, "confirmou presença" — para sabermos quais recursos são usados. Esses eventos não incluem nome, e-mail, telefone nem texto que você escreveu.</li>
<li>Relatórios de erro (se o app travar), com o identificador interno do perfil e informações técnicas do aparelho, para corrigirmos problemas.</li>
</ul>
<h3>O que o app <strong>não</strong> faz</h3>
<ul>
<li><strong>Agenda:</strong> o app só <em>adiciona</em> uma escala à agenda do celular quando você toca em "Salvar na agenda", pela tela do próprio sistema. Ele não lê seus compromissos. (No Android, a permissão do sistema é de leitura e escrita da agenda; o app a usa só para encontrar a agenda principal onde salvar.)</li>
<li><strong>Fotos e arquivos:</strong> o app só acessa a foto ou o arquivo que você escolher.</li>
<li><strong>Localização, contatos, câmera e microfone:</strong> não usamos.</li>
<li><strong>Anúncios e rastreamento entre apps:</strong> não fazemos. Não vendemos nem alugamos dados.</li>
</ul>

<h2>3. Para que usamos</h2>
<ul>
<li>Criar e manter sua conta e o acesso à sua igreja.</li>
<li>Montar escalas, avisar quando você é escalado, lembrar e mostrar à liderança quem confirmou.</li>
<li>Permitir a conversa e os arquivos de cada escala.</li>
<li>Enviar e-mails de acesso (código de entrada, recuperação de senha).</li>
<li>Manter o serviço seguro, corrigir erros e melhorar o app.</li>
</ul>
<p>Bases legais (LGPD, art. 7º): execução do serviço que você e sua igreja usam, legítimo interesse (segurança e melhoria, sempre sem dado pessoal nos eventos de uso) e cumprimento de obrigações legais.</p>

<h2>4. Quem mais vê seus dados</h2>
<ul>
<li><strong>Sua igreja:</strong> a liderança vê seus dados de contato, ministérios, escalas e respostas. Outras pessoas da equipe veem seu nome, foto e função nas escalas em que vocês servem juntos.</li>
<li><strong>Fornecedores que operam o serviço</strong>, só no necessário:
<ul>
<li>Google Firebase — login, banco de dados (São Paulo, Brasil), arquivos e envio de notificações.</li>
<li>Vercel — servidores da aplicação.</li>
<li>Resend — envio de e-mails.</li>
<li>Apple e Google — entrega das notificações no seu aparelho e, se você escolher, login com a conta deles.</li>
<li>Sentry — relatórios de erro do app.</li>
</ul></li>
</ul>
<p>Alguns desses fornecedores podem processar dados fora do Brasil, com as garantias exigidas pela LGPD (art. 33).</p>

<h2>5. Por quanto tempo guardamos</h2>
<p>Enquanto sua conta existir. Quando você exclui a conta, apagamos seu login e seus dados pessoais em todas as igrejas. Para que o histórico das escalas que já aconteceram continue fazendo sentido para a liderança, esses registros ficam com o nome "Pessoa removida", sem nenhum dado que identifique você. Cópias de segurança são substituídas em até 30 dias. Eventos de uso sem dado pessoal podem ser mantidos para estatística.</p>

<h2>6. Seus direitos</h2>
<p>Pela LGPD (art. 18), você pode pedir acesso, correção, portabilidade, informação sobre compartilhamento e exclusão dos seus dados.</p>
<ul>
<li><strong>Corrigir:</strong> no app, em Perfil → Meus dados.</li>
<li><strong>Excluir:</strong> no app, em Perfil → Excluir minha conta. Veja também <a href="/excluir-conta/">como excluir a conta</a>.</li>
<li><strong>Os demais pedidos:</strong> escreva para <a href="mailto:{CONTACT}">{CONTACT}</a>. Respondemos em até 15 dias.</li>
</ul>

<h2>7. Segurança</h2>
<p>A conexão com o Servos é sempre criptografada (HTTPS). Senhas não ficam guardadas em texto. No celular, sua sessão fica no armazenamento protegido do sistema (Keychain no iPhone, Keystore no Android). Nenhum sistema é infalível; se houver um incidente que coloque seus dados em risco, avisaremos você e a ANPD, como manda a lei.</p>

<h2>8. Crianças</h2>
<p>O app é para voluntários. Ele não é direcionado a crianças e não deve ser usado por menores de 13 anos sem a autorização de um responsável.</p>

<h2>9. Mudanças nesta política</h2>
<p>Se mudarmos algo importante, avisaremos no app ou por e-mail antes de a mudança valer. A data no topo mostra a última atualização.</p>

<h2>10. Contato</h2>
<p>Encarregado de dados (DPO) e suporte: <a href="mailto:{CONTACT}">{CONTACT}</a>.</p>
"""

TERMS = f"""
<h1>Termos de Uso</h1>
<p class="meta">Atualizados em {UPDATED} · Valem para o app Servos e para o Servos web.</p>
<p class="lead">Ao usar o Servos, você concorda com estes termos. Eles são curtos de propósito.</p>

<h2>1. O que é o Servos</h2>
<p>Uma ferramenta para igrejas organizarem voluntários, ministérios e escalas. O Servos não é uma igreja e não representa nenhuma: cada igreja administra sua própria equipe e conteúdo.</p>

<h2>2. Sua conta</h2>
<ul>
<li>Você entra numa igreja pelo código ou convite dela; a liderança pode aprovar, recusar ou remover seu acesso.</li>
<li>Mantenha seu acesso seguro e não compartilhe sua conta.</li>
<li>Informe dados verdadeiros. Você pode corrigi-los em Perfil → Meus dados.</li>
<li>Você pode excluir sua conta quando quiser, em Perfil → Excluir minha conta.</li>
</ul>

<h2>3. Uso adequado</h2>
<p>Não use o Servos para:</p>
<ul>
<li>publicar conteúdo ilegal, ofensivo, discriminatório ou que viole direitos de outras pessoas (inclusive direitos autorais de músicas e arquivos);</li>
<li>enviar propaganda não solicitada ou se passar por outra pessoa;</li>
<li>tentar acessar dados de outras igrejas ou pessoas, ou atrapalhar o funcionamento do serviço.</li>
</ul>
<p>Podemos suspender contas que descumpram estas regras.</p>

<h2>4. Conteúdo</h2>
<p>O que você e sua igreja publicam (recados, arquivos, repertório) continua sendo de vocês. Você nos autoriza a guardar e exibir esse conteúdo só para operar o serviço para a sua igreja.</p>

<h2>5. Disponibilidade</h2>
<p>Trabalhamos para o Servos estar sempre no ar, mas ele pode ficar indisponível por manutenção ou problemas técnicos. Confirme horários importantes com a liderança da sua igreja.</p>

<h2>6. Responsabilidade</h2>
<p>O Servos é oferecido como está. Não respondemos por decisões das igrejas sobre escalas e equipes, nem por conteúdo publicado pelos usuários. Nada nestes termos afasta direitos garantidos pelo Código de Defesa do Consumidor.</p>

<h2>7. Privacidade</h2>
<p>O tratamento de dados segue a <a href="/privacidade/">Política de Privacidade</a>.</p>

<h2>8. Mudanças e lei aplicável</h2>
<p>Se mudarmos estes termos, avisaremos no app antes de a mudança valer. Vale a lei brasileira.</p>

<h2>9. Contato</h2>
<p><a href="mailto:{CONTACT}">{CONTACT}</a></p>
"""

SUPPORT = f"""
<h1>Suporte</h1>
<p class="lead">Dúvidas sobre o app Servos? As respostas mais comuns estão aqui. Se não achar, escreva para <a href="mailto:{CONTACT}">{CONTACT}</a> — respondemos em até 2 dias úteis.</p>

<h2>Primeiros passos</h2>
<details><summary>Como entro na minha igreja?</summary><p>Peça à liderança o código da igreja ou o link de convite. No app, toque em "Tenho o código da igreja" (ou "Entrar com o código da igreja" na tela de login), cole o código e preencha seus dados. Se for um convite pessoal, você entra na hora; se for o código geral, a liderança confirma seu cadastro e você recebe o aviso.</p></details>
<details><summary>Baixei o app, mas não tenho código.</summary><p>O Servos é usado pela sua igreja. Peça o código a quem coordena os voluntários. Se a sua igreja ainda não usa o Servos, ela pode começar pelo Servos web.</p></details>
<details><summary>Posso entrar com Google ou Apple?</summary><p>Sim. No cadastro pelo código da igreja e na tela de login. Se você já tem conta com senha, entre com o Google ou a Apple do mesmo e-mail. Exceção: se você usou "Ocultar meu e-mail" da Apple, entre com sua senha ou com "Receber código por e-mail".</p></details>
<details><summary>Esqueci minha senha.</summary><p>Na tela de login, toque em "Esqueci minha senha" ou em "Receber código por e-mail" para entrar sem senha.</p></details>

<h2>Escalas</h2>
<details><summary>Como confirmo ou recuso uma escala?</summary><p>Na tela Início ou na escala, toque em "Confirmar presença" ou em "Não posso servir". Se já tinha confirmado e surgiu um imprevisto, abra a escala e peça substituição.</p></details>
<details><summary>Não estou recebendo notificações.</summary><p>Confira em Ajustes do celular → Servos → Notificações se estão permitidas, e no app em Perfil → Notificações o que você quer receber.</p></details>
<details><summary>Sirvo em mais de uma igreja.</summary><p>Em Perfil → Entrar em outra igreja, use o código da outra igreja. Depois é só trocar de igreja em Perfil → Suas igrejas.</p></details>

<h2>Conta e privacidade</h2>
<details><summary>Como mudo meu nome, foto ou celular?</summary><p>Em Perfil → Meus dados.</p></details>
<details><summary>Como excluo minha conta?</summary><p>Em Perfil → Excluir minha conta. Veja <a href="/excluir-conta/">o que acontece ao excluir</a>.</p></details>
<p>Leia também a <a href="/privacidade/">Política de Privacidade</a> e os <a href="/termos/">Termos de Uso</a>.</p>
"""

DELETE = f"""
<h1>Excluir sua conta do Servos</h1>
<p class="lead">Você pode excluir sua conta a qualquer momento, direto no app. Não tem volta.</p>

<h2>Pelo app (na hora)</h2>
<ol class="steps">
<li>Abra o Servos e toque em <strong>Perfil</strong>.</li>
<li>Toque em <strong>Excluir minha conta</strong>.</li>
<li>Digite <strong>EXCLUIR</strong> para confirmar e toque em <strong>Excluir minha conta</strong>.</li>
</ol>

<h2>Sem o app</h2>
<p>Escreva para <a href="mailto:{CONTACT}?subject=Excluir%20minha%20conta">{CONTACT}</a> a partir do e-mail da sua conta, com o assunto "Excluir minha conta". Confirmamos que é você e excluímos em até 15 dias.</p>

<h2>O que é apagado</h2>
<ul>
<li>Seu login (inclusive pelo Google ou pela Apple).</li>
<li>Nome, e-mail, celular, foto e data de nascimento, em todas as igrejas.</li>
<li>Sua participação em ministérios e células; suas próximas escalas são canceladas.</li>
<li>Aparelhos cadastrados para notificação, notificações, indisponibilidades e anotações pastorais sobre você.</li>
</ul>

<h2>O que fica, sem identificar você</h2>
<p>Nas escalas que já aconteceram, aparece "Pessoa removida", para o histórico da igreja continuar coerente. Cópias de segurança são substituídas em até 30 dias.</p>

<div class="card"><p>Se você é a única pessoa que administra uma igreja, passe a administração para outra pessoa no Servos web antes de excluir sua conta.</p></div>
"""

REDIRECT = """<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/privacidade/">
<link rel="canonical" href="https://www.servosapp.com/privacidade/"><title>Política de Privacidade · Servos</title></head>
<body><p>A Política de Privacidade mudou de endereço: <a href="/privacidade/">servosapp.com/privacidade</a>.</p></body></html>
"""

AASA = {
    "applinks": {
        "details": [
            {
                "appIDs": [f"{APPLE_TEAM_ID}.{BUNDLE_ID}"],
                "components": [{"/": "/entrar*", "comment": "Convite e código da igreja abrem o app"}],
            }
        ]
    }
}

ASSETLINKS = [
    {
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {"namespace": "android_app", "package_name": BUNDLE_ID, "sha256_cert_fingerprints": [ANDROID_SHA256]},
    }
]

HTACCESS = """# Links universais: servir sem extensão como JSON, sem redirecionar.
<Files "apple-app-site-association">
  ForceType application/json
  Header set Content-Type "application/json"
</Files>
<Files "assetlinks.json">
  Header set Content-Type "application/json"
</Files>
"""


def write(rel: str, content: str):
    path = SITE / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("  ", rel)


def main():
    print(f"Gerando em {SITE}")
    write("privacidade/index.html", page("Política de Privacidade", "Como o Servos trata os dados de voluntários e igrejas.", PRIVACY))
    write("termos/index.html", page("Termos de Uso", "Termos de uso do app Servos e do Servos web.", TERMS))
    write("suporte/index.html", page("Suporte", "Ajuda para usar o app Servos.", SUPPORT))
    write("excluir-conta/index.html", page("Excluir conta", "Como excluir sua conta do Servos e o que é apagado.", DELETE))
    write("politica-de-privacidade.html", REDIRECT)
    write(".well-known/apple-app-site-association", json.dumps(AASA, indent=2))
    write(".well-known/assetlinks.json", json.dumps(ASSETLINKS, indent=2))
    write(".well-known/.htaccess", HTACCESS)


if __name__ == "__main__":
    main()
