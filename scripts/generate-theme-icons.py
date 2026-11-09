from __future__ import annotations

import base64
import math
from typing import Callable


ICON_KEYS = [
    "chat",
    "contacts",
    "moments",
    "phone",
    "gallery",
    "diary",
    "calendar",
    "wallet",
    "music",
    "forum",
    "memory",
    "settings",
]

FRAMES = {
    "rose": (
        "M52 22H140C158 22 170 34 170 52V140C170 158 158 170 140 170"
        "H52C34 170 22 158 22 140V52C22 34 34 22 52 22Z"
    ),
    "moon": (
        "M62 22H130C138 22 144 24 150 30L162 42C168 48 170 54 170 62"
        "V130C170 138 168 144 162 150L150 162C144 168 138 170 130 170"
        "H62C54 170 48 168 42 162L30 150C24 144 22 138 22 130V62"
        "C22 54 24 48 30 42L42 30C48 24 54 22 62 22Z"
    ),
    "celadon": (
        "M54 12H138C147 12 154 19 154 28V146C154 156 149 164 141 169"
        "L132 174H60L51 169C43 164 38 156 38 146V28C38 19 45 12 54 12Z"
    ),
    "sea": (
        "M96 18C128 16 154 30 166 56C178 82 174 114 156 140"
        "C138 166 108 178 78 170C48 162 26 140 20 110"
        "C14 80 24 50 46 32C60 21 78 18 96 18Z"
    ),
    "amber": "M52 22H140L170 52V140L140 170H52L22 140V52Z",
    "lilac": (
        "M96 18C142 18 174 50 174 96C174 142 142 174 96 174"
        "C50 174 18 142 18 96C18 50 50 18 96 18Z"
    ),
}

THEMES = {
    "rose-frost": {
        "frame": "rose",
        "decor": "rose",
        "bg": ("#fbe4ea", "#e7a5b8", "#b96d88"),
        "glow": "#fff8fb",
        "border": "#f8d4df",
        "border_opacity": ".70",
        "mode": "fill",
        "symbol": "#fff8f4",
        "accent": "#82465c",
        "outline": "#f7d6df",
        "outline_width": "2.2",
        "shadow": "#5c2e40",
    },
    "moon-ink": {
        "frame": "moon",
        "decor": "moon",
        "bg": ("#1c2a49", "#101a31", "#070c18"),
        "glow": "#cfe2ff",
        "border": "#9fb9ea",
        "border_opacity": ".52",
        "mode": "line",
        "symbol": "#eaf3ff",
        "accent": "#9fb8e8",
        "outline": "#000000",
        "outline_width": "0",
        "shadow": "#000000",
        "stroke_width": "7.4",
    },
    "celadon-mist": {
        "frame": "celadon",
        "decor": "celadon",
        "bg": ("#e2f0e8", "#a9c9b8", "#6e9b86"),
        "glow": "#fbfffc",
        "border": "#4f7f69",
        "border_opacity": ".48",
        "mode": "fill",
        "symbol": "#f7fffa",
        "accent": "#315d4a",
        "outline": "#3f6b58",
        "outline_width": "2.3",
        "shadow": "#244a3a",
        "symbol_scale": ".92",
    },
    "sea-glass": {
        "frame": "sea",
        "decor": "sea",
        "bg": ("#c9f7f2", "#76d3d3", "#3b96aa"),
        "glow": "#ffffff",
        "border": "#e9ffff",
        "border_opacity": ".66",
        "mode": "fill",
        "symbol": "#f8ffff",
        "accent": "#1e6574",
        "outline": "#d8ffff",
        "outline_width": "1.8",
        "shadow": "#155865",
    },
    "amber-dusk": {
        "frame": "amber",
        "decor": "amber",
        "bg": ("#f5c78f", "#c87942", "#71351f"),
        "glow": "#fff0d3",
        "border": "#f0bd78",
        "border_opacity": ".72",
        "mode": "fill",
        "symbol": "#fff3df",
        "accent": "#67301a",
        "outline": "#f0bd78",
        "outline_width": "2.2",
        "shadow": "#4c2414",
    },
    "lilac-dawn": {
        "frame": "lilac",
        "decor": "lilac",
        "bg": ("#f5e8ff", "#c9a6e9", "#8762b9"),
        "glow": "#fffaff",
        "border": "#c9a7e9",
        "border_opacity": ".78",
        "mode": "line",
        "symbol": "#5f3f7e",
        "accent": "#7a559f",
        "outline": "#ffffff",
        "outline_width": "0",
        "shadow": "#4d2b70",
        "stroke_width": "7.4",
    },
}


def _attrs(theme: dict, *, filled: bool = True, accent: bool = False) -> str:
    if accent:
        return f'fill="{theme["accent"]}"'
    if theme["mode"] == "line":
        return (
            f'fill="none" stroke="{theme["symbol"]}" '
            f'stroke-width="{theme["stroke_width"]}" '
            'stroke-linecap="round" stroke-linejoin="round"'
        )
    return (
        f'fill="{theme["symbol"]}" stroke="{theme["outline"]}" '
        f'stroke-width="{theme["outline_width"]}" stroke-linejoin="round"'
    )


def _line(theme: dict, width: str = "3", color: str | None = None, opacity: str = "1") -> str:
    return (
        f'fill="none" stroke="{color or theme["accent"]}" stroke-width="{width}" '
        f'stroke-linecap="round" stroke-linejoin="round" opacity="{opacity}"'
    )


def gear_path() -> str:
    cx = cy = 96
    outer = 55
    inner = 43
    teeth = 8
    points: list[tuple[float, float]] = []
    for index in range(teeth):
        base = index * (math.tau / teeth)
        for offset, radius in (
            (-0.145, inner),
            (-0.085, outer),
            (0.085, outer),
            (0.145, inner),
        ):
            angle = base + offset
            points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    outer_path = "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in points) + "Z"
    hole = "M96 78A18 18 0 1 0 96 114A18 18 0 1 0 96 78Z"
    return outer_path + hole


def symbol(name: str, theme: dict) -> str:
    fill = _attrs(theme)
    line = _line(theme)
    accent = f'fill="{theme["accent"]}"'

    if name == "chat":
        bubble = (
            "M56 58H136C149 58 158 67 158 80V110C158 123 149 132 136 132"
            "H102L78 150V132H56C43 132 34 123 34 110V80C34 67 43 58 56 58Z"
        )
        dots = "".join(f'<circle cx="{cx}" cy="95" r="7" {accent}/>' for cx in (70, 96, 122))
        return f'<path d="{bubble}" {fill}/>{dots}'

    if name == "contacts":
        return (
            f'<circle cx="76" cy="76" r="19" {fill}/>'
            f'<path d="M42 140C42 113 56 98 76 98C96 98 110 113 110 140Z" {fill}/>'
            f'<circle cx="124" cy="84" r="14" {fill}/>'
            f'<path d="M112 140C112 120 122 110 136 110C150 110 158 120 158 140Z" {fill}/>'
        )

    if name == "moments":
        return (
            f'<path d="M96 150C88 142 44 114 44 82C44 62 60 50 78 50'
            f'C88 50 96 56 96 66C96 56 104 50 114 50C132 50 148 62 148 82'
            f'C148 114 104 142 96 150Z" {fill}/>'
        )

    if name == "phone":
        return (
            f'<path d="M62 46C70 42 80 44 86 52L94 64C98 70 97 78 92 84'
            f'L84 92C94 112 110 128 130 138L138 130C144 125 152 124 158 128'
            f'L172 136C178 140 180 148 176 156C170 170 154 176 138 172'
            f'C92 160 56 124 44 78C40 62 46 52 62 46Z" {fill}/>'
        )

    if name == "gallery":
        stroke = _line(theme, "8.5", theme["symbol"] if theme["mode"] == "line" else theme["symbol"])
        return (
            f'<rect x="46" y="48" width="100" height="94" rx="16" {stroke}/>'
            f'<circle cx="122" cy="78" r="10" {accent}/>'
            f'<path d="M54 128L84 94L104 116L120 100L144 128Z" {accent}/>'
        )

    if name == "diary":
        book = (
            "M96 58C82 48 62 46 42 50V138C62 134 82 136 96 146"
            "C110 136 130 134 150 138V50C130 46 110 48 96 58Z"
        )
        if theme["mode"] == "line":
            pages = (
                f'<path d="M96 58V146" {line}/>'
                f'<path d="M58 70C70 68 82 70 90 76M58 88C70 86 82 88 90 94'
                f'M58 106C70 104 82 106 90 112" {_line(theme, "3", theme["accent"])}/>'
            )
            return f'<path d="{book}" {fill}/>{pages}'
        pages = (
            f'<path d="M96 58V146" {_line(theme, "3", theme["accent"])}/>'
            f'<path d="M58 70C70 68 82 70 90 76M58 88C70 86 82 88 90 94'
            f'M58 106C70 104 82 106 90 112" {_line(theme, "3", theme["accent"], ".62")}/>'
        )
        return f'<path d="{book}" {fill}/>{pages}'

    if name == "calendar":
        body = f'<rect x="44" y="56" width="104" height="90" rx="16" {fill}/>'
        top = (
            f'<path d="M70 44V64M122 44V64" {_line(theme, "10", theme["symbol"] if theme["mode"] == "line" else theme["symbol"])}/>'
        )
        divider = f'<path d="M44 82H148" {_line(theme, "3", theme["accent"])}/>'
        cells = "".join(
            f'<rect x="{x}" y="{y}" width="12" height="12" rx="3" fill="{theme["accent"]}" opacity=".82"/>'
            for y in (96, 116)
            for x in (58, 80, 102, 124)
        )
        return body + top + divider + cells

    if name == "wallet":
        body = (
            "M48 64C48 55 55 48 64 48H132C141 48 148 55 148 64"
            "V132C148 141 141 148 132 148H64C55 148 48 141 48 132Z"
        )
        seam = f'<path d="M48 76H148" {_line(theme, "3", theme["accent"])}/>'
        clasp = (
            "M124 94H156C163 94 168 99 168 106V116C168 123 163 128 156 128"
            "H124C116 128 110 122 110 114V108C110 100 116 94 124 94Z"
        )
        if theme["mode"] == "line":
            return (
                f'<path d="{body}" {fill}/>{seam}'
                f'<path d="{clasp}" {_line(theme, "7", theme["symbol"])}/>'
                f'<circle cx="130" cy="111" r="4" {accent}/>'
            )
        return (
            f'<path d="{body}" {fill}/>{seam}'
            f'<path d="{clasp}" fill="{theme["symbol"]}" stroke="{theme["accent"]}" stroke-width="2"/>'
            f'<circle cx="130" cy="111" r="4" {accent}/>'
        )

    if name == "music":
        note = (
            "M116 46V112C116 124 106 132 94 132C84 132 76 126 76 116"
            "C76 106 84 100 94 100C100 100 106 102 110 106V66L152 56V102"
            "C152 114 142 122 130 122C120 122 112 116 112 106"
            "C112 96 120 90 130 90C136 90 142 92 146 96V56Z"
        )
        return f'<path d="{note}" {fill}/>'

    if name == "forum":
        first = (
            "M44 62H112C124 62 132 70 132 82V106C132 118 124 126 112 126"
            "H84L64 142V126H44C32 126 24 118 24 106V82C24 70 32 62 44 62Z"
        )
        second = (
            "M112 84H148C160 84 168 92 168 104V124C168 136 160 144 148 144"
            "H140V158L122 144H112C100 144 92 136 92 124V104C92 92 100 84 112 84Z"
        )
        dots = (
            f'<circle cx="58" cy="94" r="5" {accent}/>'
            f'<circle cx="78" cy="94" r="5" {accent}/>'
            f'<circle cx="98" cy="94" r="5" {accent}/>'
            f'<circle cx="122" cy="114" r="4" {accent}/>'
            f'<circle cx="138" cy="114" r="4" {accent}/>'
        )
        return f'<path d="{first}" {fill}/><path d="{second}" {fill}/>{dots}'

    if name == "memory":
        sphere = f'<circle cx="96" cy="96" r="36" {fill}/>'
        orbit = (
            f'<ellipse cx="96" cy="96" rx="62" ry="22" transform="rotate(-24 96 96)" {line}/>'
            f'<ellipse cx="96" cy="96" rx="62" ry="22" transform="rotate(36 96 96)" {line}/>'
        )
        if theme["mode"] == "line":
            sphere = f'<circle cx="96" cy="96" r="36" {line}/>'
        return sphere + orbit + f'<circle cx="140" cy="62" r="5" {accent}/>'

    if name == "settings":
        gear = gear_path()
        if theme["mode"] == "line":
            return (
                f'<path d="{gear}" fill="none" stroke="{theme["symbol"]}" '
                f'stroke-width="{theme["stroke_width"]}" stroke-linejoin="round"/>'
            )
        return (
            f'<path d="{gear}" fill="{theme["symbol"]}" fill-rule="evenodd" '
            f'stroke="{theme["outline"]}" stroke-width="{theme["outline_width"]}" stroke-linejoin="round"/>'
        )

    raise ValueError(f"Unknown icon: {name}")


def decoration(name: str, theme: dict) -> str:
    if name == "rose":
        return (
            '<g opacity=".58">'
            '<ellipse cx="151" cy="39" rx="24" ry="13" fill="#ffd8e3" transform="rotate(28 151 39)"/>'
            '<ellipse cx="164" cy="55" rx="17" ry="10" fill="#ffe7ee" transform="rotate(-20 164 55)"/>'
            '<ellipse cx="138" cy="53" rx="15" ry="9" fill="#f7bfd0" transform="rotate(54 138 53)"/>'
            "</g>"
            '<circle cx="38" cy="151" r="4" fill="#fff6fa" opacity=".7"/>'
            '<circle cx="50" cy="161" r="2.5" fill="#fff6fa" opacity=".55"/>'
        )
    if name == "moon":
        return (
            '<path d="M145 28A28 28 0 1 0 164 76A22 22 0 1 1 145 28Z" fill="#dbe8ff" opacity=".66"/>'
            '<circle cx="42" cy="48" r="2.5" fill="#edf5ff" opacity=".9"/>'
            '<circle cx="56" cy="34" r="1.8" fill="#edf5ff" opacity=".7"/>'
            '<circle cx="150" cy="146" r="2.2" fill="#edf5ff" opacity=".8"/>'
        )
    if name == "celadon":
        return (
            '<path d="M30 54L48 68L42 84L58 94M146 34L158 46L150 60" '
            'fill="none" stroke="#3e725d" stroke-width="2" opacity=".24"/>'
            '<g transform="translate(151 151)" opacity=".62">'
            '<ellipse cx="0" cy="-9" rx="8" ry="12" fill="#ffffff"/>'
            '<ellipse cx="9" cy="0" rx="12" ry="8" fill="#ffffff"/>'
            '<ellipse cx="0" cy="9" rx="8" ry="12" fill="#ffffff"/>'
            '<ellipse cx="-9" cy="0" rx="12" ry="8" fill="#ffffff"/>'
            '<circle r="4" fill="#d8eee2"/>'
            "</g>"
        )
    if name == "sea":
        return (
            '<circle cx="150" cy="42" r="9" fill="none" stroke="#ffffff" stroke-width="2.5" opacity=".55"/>'
            '<circle cx="165" cy="60" r="5" fill="none" stroke="#ffffff" stroke-width="2" opacity=".45"/>'
            '<circle cx="38" cy="44" r="4" fill="#ffffff" opacity=".48"/>'
            '<path d="M34 153C34 139 46 129 60 133C70 136 74 147 68 155'
            'C64 161 54 161 50 155C47 150 52 145 57 147" '
            'fill="none" stroke="#fff6e4" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
        )
    if name == "amber":
        return (
            '<path d="M18 158L174 34" stroke="#ffe4b5" stroke-width="22" opacity=".10"/>'
            '<circle cx="42" cy="46" r="2" fill="#ffe4b5" opacity=".65"/>'
            '<circle cx="58" cy="36" r="1.4" fill="#ffe4b5" opacity=".5"/>'
            '<circle cx="154" cy="148" r="1.8" fill="#ffe4b5" opacity=".55"/>'
            '<circle cx="166" cy="128" r="1.2" fill="#ffe4b5" opacity=".45"/>'
        )
    if name == "lilac":
        return (
            '<g opacity=".62">'
            '<path d="M146 32C168 22 180 38 168 56C158 71 144 60 146 32Z" fill="#ead0ff"/>'
            '<path d="M153 60C169 62 174 80 158 88C145 94 140 78 153 60Z" fill="#d9b5ff" opacity=".8"/>'
            "</g>"
            '<circle cx="44" cy="48" r="2.4" fill="#fff8ff" opacity=".9"/>'
            '<circle cx="58" cy="34" r="1.6" fill="#fff8ff" opacity=".7"/>'
            '<circle cx="148" cy="150" r="2" fill="#fff8ff" opacity=".75"/>'
        )
    raise ValueError(f"Unknown decoration: {name}")


def icon_svg(theme_id: str, key: str) -> str:
    theme = THEMES[theme_id]
    frame = FRAMES[theme["frame"]]
    c1, c2, c3 = theme["bg"]
    symbol_markup = symbol(key, theme)
    symbol_scale = theme.get("symbol_scale")
    if symbol_scale:
        symbol_markup = (
            f'<g transform="translate(96 96) scale({symbol_scale}) translate(-96 -96)">'
            f"{symbol_markup}</g>"
        )
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="8 8 176 176">'
        "<defs>"
        f'<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{c1}"/><stop offset=".54" stop-color="{c2}"/>'
        f'<stop offset="1" stop-color="{c3}"/></linearGradient>'
        '<radialGradient id="glow" cx="28%" cy="18%" r="82%">'
        f'<stop offset="0" stop-color="{theme["glow"]}" stop-opacity=".52"/>'
        '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'
        f'<clipPath id="clip"><path d="{frame}"/></clipPath>'
        '<filter id="symbolShadow" x="-30%" y="-30%" width="160%" height="160%">'
        f'<feDropShadow dx="0" dy="4" stdDeviation="3.2" flood-color="{theme["shadow"]}" flood-opacity=".34"/>'
        "</filter>"
        "</defs>"
        f'<path d="{frame}" fill="url(#bg)" stroke="{theme["border"]}" '
        f'stroke-opacity="{theme["border_opacity"]}" stroke-width="2.6" stroke-linejoin="round"/>'
        '<g clip-path="url(#clip)">'
        '<rect width="192" height="192" fill="url(#glow)"/>'
        '<ellipse cx="66" cy="44" rx="76" ry="30" fill="#ffffff" opacity=".10" transform="rotate(-18 66 44)"/>'
        f"{decoration(theme['decor'], theme)}"
        "</g>"
        f'<path d="{frame}" fill="none" stroke="#ffffff" stroke-opacity=".20" stroke-width="2"/>'
        f'<g filter="url(#symbolShadow)">{symbol_markup}</g>'
        "</svg>"
    )
    return svg


def icon_data_uri(theme_id: str, key: str) -> str:
    payload = icon_svg(theme_id, key).encode("utf-8")
    return "data:image/svg+xml;base64," + base64.b64encode(payload).decode("ascii")

