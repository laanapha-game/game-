"""Team looks for tools/team_sprite.py, read off the owner's photos (Drive "Team Asset").
The photos are waist-up, so trousers and shoes are a plain guess (dark trousers)."""

HAIR_BLACK = (34, 28, 26)
TROUSERS = {'kind': 'trousers', 'colour': (52, 56, 70)}
SHOES = (40, 32, 30)

TEAM = {
    # fringe, thin round gold glasses, light grey tee with a faint diagonal pattern
    'po': {
        'name': 'Po', 'skin': 'light',
        'hair': {'style': 'fringe', 'colour': HAIR_BLACK},
        'glasses': (196, 160, 92),
        'top': {'colour': (212, 214, 218), 'neck': 'crew', 'diagonal': (232, 234, 238)},
        'bottom': TROUSERS, 'shoes': SHOES,
    },
    # hair pulled back into a low bun with loose front strands, brown polo
    'peay': {
        'name': 'Peay', 'skin': 'light', 'smile': True,
        'hair': {'style': 'bun', 'colour': HAIR_BLACK},
        'top': {'colour': (134, 110, 96), 'neck': 'polo'},
        'bottom': TROUSERS, 'shoes': SHOES,
    },
    # messy textured black hair, black tee
    'kaiching': {
        'name': 'Kaiching', 'skin': 'medium',
        'hair': {'style': 'messy', 'colour': HAIR_BLACK},
        'top': {'colour': (46, 46, 52), 'neck': 'crew'},
        'bottom': TROUSERS, 'shoes': SHOES,
    },
    # short cropped hair, grey long-sleeve henley with a white print, cross necklace
    'aomsin': {
        'name': 'Aomsin', 'skin': 'tan', 'smile': True,
        'hair': {'style': 'crop', 'colour': HAIR_BLACK},
        'top': {'colour': (128, 130, 136), 'neck': 'henley', 'long': True, 'print': (226, 226, 226), 'necklace': (30, 30, 30)},
        'bottom': TROUSERS, 'shoes': SHOES,
    },
    # thick curtain bangs to the brows, white short-sleeve collared shirt
    'nemo': {
        'name': 'Nemo', 'skin': 'light', 'smile': True,
        'hair': {'style': 'curtain', 'colour': HAIR_BLACK},
        'top': {'colour': (244, 244, 240), 'neck': 'shirt', 'collar': (252, 252, 250), 'pocket': True},
        'bottom': TROUSERS, 'shoes': SHOES,
    },
}
