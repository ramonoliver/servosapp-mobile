"""Gera as imagens das lojas (App Store e Google Play) a partir das capturas.

Uso: python3 store/make_store_images.py
Entrada: store/raw/*.png (capturas 1320x2868 do simulador, dados fictícios).
Saída:   store/app-store/..., store/google-play/...
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent
RAW = ROOT / "raw"
FONTS = APP / "node_modules/@expo-google-fonts/geist"
SEMIBOLD = str(FONTS / "600SemiBold/Geist_600SemiBold.ttf")
REGULAR = str(FONTS / "400Regular/Geist_400Regular.ttf")

# Paleta do app (theme/tokens.ts).
CREAM = (242, 240, 236)
INK = (30, 27, 24)
INK_2 = (94, 90, 85)
BRAND = (216, 59, 12)
BRAND_MARK = (244, 83, 42)
ON_BRAND = (245, 237, 228)
NIGHT = (16, 14, 11)
NIGHT_2 = (207, 203, 198)

# (arquivo, título, subtítulo, tema[, mascote])
# Mascote: o Servo do site (assets/mascot), saindo pela lateral do celular.
# Fica junto da tela do app — a Apple pede capturas do app em uso.
SLIDES = [
    ("01-inicio", "Sua próxima escala,\nsempre à vista", "Confirme presença com um toque.", "light", "acenando"),
    ("02-escala", "Tudo o que você\nprecisa saber", "Chegada, local, função e observações.", "light"),
    ("03-conversa", "Recados da equipe\nno lugar certo", "Uma conversa para cada escala.", "light"),
    ("04-repertorio", "O repertório do\nlouvor organizado", "Tom, cifra e vídeo de cada música.", "light"),
    ("05-calendario", "Seu mês de serviço\nnum relance", "E salve na agenda com lembrete.", "light"),
    ("06-equipe", "Para líderes: a equipe\nna palma da mão", "Monte escalas e acompanhe confirmações.", "light"),
    ("07-escuro", "Confortável de dia\ne de noite", "Com modo escuro automático.", "dark", "aviso"),
]

THEMES = {
    "light": {"bg": CREAM, "title": INK, "sub": INK_2},
    "brand": {"bg": BRAND_MARK, "title": ON_BRAND, "sub": (255, 222, 208)},
    "dark": {"bg": NIGHT, "title": (249, 246, 243), "sub": NIGHT_2},
}


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def device(shot: Image.Image, width: int, bezel_color=(20, 18, 16)) -> Image.Image:
    """Tela com moldura fina escura, cantos de iPhone e sombra suave."""
    scale = width / shot.width
    screen = shot.convert("RGB").resize((width, round(shot.height * scale)), Image.LANCZOS)
    bezel = max(6, round(width * 0.022))
    r_screen = round(width * 0.125)
    frame = Image.new("RGBA", (screen.width + bezel * 2, screen.height + bezel * 2), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle(
        (0, 0, frame.width - 1, frame.height - 1), r_screen + bezel, fill=bezel_color + (255,)
    )
    frame.alpha_composite(rounded(screen, r_screen), (bezel, bezel))
    pad = round(width * 0.08)
    canvas = Image.new("RGBA", (frame.width + pad * 2, frame.height + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (pad, pad + round(pad * 0.35), pad + frame.width, pad + frame.height), r_screen + bezel, fill=(0, 0, 0, 70)
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(pad * 0.45)))
    canvas.alpha_composite(frame, (pad, pad))
    return canvas


def text_block(draw, x, y, text, font, fill, line_gap):
    for line in text.split("\n"):
        draw.text((x, y), line, font=font, fill=fill)
        bbox = draw.textbbox((x, y), line, font=font)
        y = bbox[3] + line_gap
    return y


def mascot(pose: str, height: int) -> Image.Image:
    im = Image.open(APP / f"assets/mascot/{pose}.png").convert("RGBA")
    w = round(im.width * height / im.height)
    im = im.resize((w, height), Image.LANCZOS)
    # Sombra suave no chão, para "pousar" sobre o celular.
    canvas = Image.new("RGBA", (w, height), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (w, height), (0, 0, 0, 0))
    a = im.split()[3].point(lambda v: 60 if v > 10 else 0)
    shadow.putalpha(a)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(height * 0.03)), (round(w * 0.02), round(height * 0.03)))
    canvas.alpha_composite(im)
    return canvas


def slide(name, title, sub, theme, size, pose=None) -> Image.Image:
    W, H = size
    t = THEMES[theme]
    img = Image.new("RGBA", (W, H), t["bg"] + (255,))
    draw = ImageDraw.Draw(img)
    margin = round(W * 0.085)
    title_font = ImageFont.truetype(SEMIBOLD, round(W * 0.078))
    sub_font = ImageFont.truetype(REGULAR, round(W * 0.038))
    y = round(H * 0.075)
    y = text_block(draw, margin, y, title, title_font, t["title"], round(W * 0.012))
    y = text_block(draw, margin, y + round(W * 0.022), sub, sub_font, t["sub"], 0)
    shot = Image.open(RAW / f"{name}.png")
    phone = device(shot, round(W * 0.8), (62, 58, 54) if theme == "dark" else (20, 18, 16))
    top = y + round(H * 0.035) - round(W * 0.8 * 0.08)
    if pose:
        # Celular um pouco à esquerda; o mascote sai pela direita, embaixo.
        img.alpha_composite(phone, (round(-W * 0.05), top))
        m = mascot(pose, round(min(W * 0.38, H * 0.165)))
        img.alpha_composite(m, (W - m.width - round(W * 0.015), H - m.height - round(H * 0.015)))
    else:
        img.alpha_composite(phone, ((W - phone.width) // 2, top))
    return img.convert("RGB")


def feature_graphic() -> Image.Image:
    """Google Play: 1024x500, sem transparência."""
    W, H = 1024, 500
    img = Image.new("RGB", (W, H), BRAND_MARK)
    draw = ImageDraw.Draw(img)
    icon = Image.open(APP / "assets/icon.png").convert("RGBA").resize((150, 150), Image.LANCZOS)
    img.paste(rounded(icon, 34), (72, 90), rounded(icon, 34))
    draw.text((72, 272), "Servos", font=ImageFont.truetype(SEMIBOLD, 76), fill=ON_BRAND)
    draw.text((72, 372), "Escalas da igreja, sem complicação.", font=ImageFont.truetype(REGULAR, 34), fill=(255, 222, 208))
    shot = Image.open(RAW / "01-inicio.png")
    phone = device(shot, 300)
    canvas = img.convert("RGBA")
    canvas.alpha_composite(phone, (W - phone.width + 10, 30))
    return canvas.convert("RGB")


def icon(size: int) -> Image.Image:
    base = Image.open(APP / "assets/icon.png").convert("RGBA")
    flat = Image.new("RGB", base.size, BRAND_MARK)
    flat.paste(base, mask=base.split()[3])
    return flat.resize((size, size), Image.LANCZOS)


def main():
    targets = {
        "app-store/iphone-6.9": (1320, 2868),
        "app-store/iphone-6.5": (1242, 2688),
        "google-play/telefone": (1080, 1920),
    }
    for folder, size in targets.items():
        out = ROOT / folder
        out.mkdir(parents=True, exist_ok=True)
        for i, (name, title, sub, theme, *pose) in enumerate(SLIDES, 1):
            slide(name, title, sub, theme, size, pose[0] if pose else None).save(out / f"{i:02d}-{name[3:]}.png", optimize=True)
    (ROOT / "app-store").mkdir(exist_ok=True)
    icon(1024).save(ROOT / "app-store/icone-1024.png")
    gp = ROOT / "google-play"
    icon(512).save(gp / "icone-512.png")
    feature_graphic().save(gp / "grafico-de-recursos-1024x500.png")
    print("ok")


if __name__ == "__main__":
    main()
