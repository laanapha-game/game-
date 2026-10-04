"""Contact sheet for the Jayimpacts redesign: Drive art, portrait, walking sprite, and the
sprite next to a scene 1 costume on the day and night ground.

    python3 tools/jayimpacts_sheet.py   -> docs/scene3/jayimpacts_contact_sheet.png
"""
from PIL import Image, ImageDraw, ImageFont

A = 'src/assets/art/characters/'
INC = 'assets/incoming/Scene_2_Sprite/'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
Y = (255, 255, 79)


def cells(path, n, w=32, h=36):
    im = Image.open(path).convert('RGBA')
    cw = im.width // n
    return [im.crop((i * cw, 0, (i + 1) * cw, im.height)).resize((w, h), Image.NEAREST) for i in range(n)]


def main():
    jay_s = cells(A + 'jayimpacts_side.png', 8)
    jay_f = cells(A + 'jayimpacts_front.png', 5)
    nu_s = cells(A + 'nuannapa_side.png', 9)
    nu_f = cells(A + 'nuannapa_front.png', 3)
    por = cells('src/assets/art/portraits/jayimpacts_portrait.png', 2, 64, 64)
    W, H = 1500, 1240
    sheet = Image.new('RGB', (W, H), (32, 30, 36))
    d = ImageDraw.Draw(sheet)
    f, fs = ImageFont.truetype(FONT, 20), ImageFont.truetype(FONT, 16)

    def paste(fr, x, y, k, bg):
        b = Image.new('RGBA', fr.size, bg)
        b.alpha_composite(fr)
        sheet.paste(b.resize((fr.width * k, fr.height * k), Image.NEAREST), (x, y))

    d.text((20, 12), 'BEFORE: Drive art', fill=Y, font=f)
    ch = Image.open(INC + 'sprite_jayimpacts_character_no_greennew.png').convert('RGBA')
    ch = ch.resize((ch.width * 200 // ch.height, 200), Image.LANCZOS)
    sheet.paste(ch, (20, 40), ch)
    av = Image.open(INC + 'sprite_jayimpacts_avatar_no_green.png').convert('RGBA')
    av = av.resize((av.width * 200 // av.height, 200), Image.LANCZOS)
    sheet.paste(av, (30 + ch.width, 40), av)
    y = 260
    d.text((20, y), 'AFTER, portrait 64x64 downsampled from the original avatar (neutral, talk), shown 5x', fill=Y, font=fs)
    paste(por[0], 20, y + 26, 5, (60, 70, 80, 255))
    paste(por[1], 350, y + 26, 5, (60, 70, 80, 255))
    d.text((700, y), 'portrait at 1x and 2x', fill=Y, font=fs)
    paste(por[0], 700, y + 26, 1, (60, 70, 80, 255))
    paste(por[0], 780, y + 26, 2, (60, 70, 80, 255))
    y2 = y + 26 + 320 + 20
    d.text((20, y2), 'AFTER, walking sprite 32x36 with the head taken from the original, 4x. side: idle0 idle1 walk0-3 wave0 wave1 | front: idle0 idle1 blink wave0 wave1', fill=Y, font=fs)
    for i, fr in enumerate(jay_s):
        paste(fr, 20 + i * 134, y2 + 26, 4, (111, 176, 74, 255))
    for i, fr in enumerate(jay_f):
        paste(fr, 20 + i * 134, y2 + 26 + 150, 4, (111, 176, 74, 255))
    y3 = y2 + 26 + 300 + 14
    d.text((20, y3), 'Next to nuannapa, 3x, day lawn and night ground', fill=Y, font=fs)
    sel = [nu_s[0], jay_s[0], nu_s[2], jay_s[2], nu_f[0], jay_f[0], jay_f[3], jay_s[6]]
    for i, fr in enumerate(sel):
        paste(fr, 20 + i * 100, y3 + 26, 3, (140, 203, 90, 255))
        paste(fr, 20 + i * 100, y3 + 26 + 112, 3, (74, 26, 20, 255))
    sheet.crop((0, 0, W, y3 + 26 + 224 + 12)).save('docs/scene3/jayimpacts_contact_sheet.png')


if __name__ == '__main__':
    main()
