#!/usr/bin/env python3
"""Precompute date -> readings using orthocal-python's OWN engine (the authoritative
implementation of the Lukan jump, cycle offsets, floats, etc.), so the JS build never
reimplements liturgical logic. Output is vendored under data/lectionary/dates/<YEAR>.json
and transformed into served JSON by scripts/build-lectionary.mjs.

Run once (regenerate only when orthocal updates). Requires a checkout of
orthocal-python and a Python 3.12 venv with django==6.0.5 jdcal python-dateutil:

    python3.12 -m venv /tmp/ov && /tmp/ov/bin/pip install django==6.0.5 jdcal==1.4.1 python-dateutil asgiref
    ORTHOCAL=/path/to/orthocal-python /tmp/ov/bin/python scripts/dump-lectionary.py 1950 2100
"""

import os, sys, json, asyncio, datetime, pathlib

ORTHOCAL = os.environ.get("ORTHOCAL", "/tmp/orthocal-python")
START = int(sys.argv[1]) if len(sys.argv) > 1 else 1950
END = int(sys.argv[2]) if len(sys.argv) > 2 else 2100
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "lectionary" / "dates"
DB = "/tmp/ov-lectionary.sqlite3"

sys.path.insert(0, ORTHOCAL)
import django
from django.conf import settings

settings.configure(
    DEBUG=False,
    INSTALLED_APPS=["django.contrib.contenttypes", "bible", "calendarium", "commemorations"],
    DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": DB}},
    DEFAULT_AUTO_FIELD="django.db.models.BigAutoField",
    USE_TZ=True,
    TIME_ZONE="UTC",
)
django.setup()
from django.core.management import call_command

# Build the DB once from the fixtures (skip bible's heavy scripture-loading migration).
if not os.path.exists(DB):
    call_command("migrate", "contenttypes", verbosity=0)
    call_command("migrate", "bible", "0001", verbosity=0)
    call_command("migrate", "commemorations", verbosity=0)
    call_command("migrate", "calendarium", verbosity=0)
    call_command("loaddata", os.path.join(ORTHOCAL, "fixtures/calendarium.json"), verbosity=0)
    call_command("loaddata", os.path.join(ORTHOCAL, "fixtures/commemorations.json"), verbosity=0)

try:
    from calendarium.liturgics import Day
except ImportError:
    from calendarium.liturgics.day import Day

OUT.mkdir(parents=True, exist_ok=True)


async def day_record(y, m, d):
    day = Day(y, m, d)
    await day.ainitialize()
    readings = await day.aget_readings()
    return {
        "titles": list(day.titles),
        "feast_level": day.feast_level,
        "readings": [
            {"source": r.source, "ref": r.pericope.sdisplay, "desc": r.desc or ""}
            for r in readings
        ],
    }


async def main():
    for year in range(START, END + 1):
        out = {}
        d = datetime.date(year, 1, 1)
        while d.year == year:
            out[f"{d.month:02d}-{d.day:02d}"] = await day_record(d.year, d.month, d.day)
            d += datetime.timedelta(days=1)
        (OUT / f"{year}.json").write_text(json.dumps(out, separators=(",", ":")))
        print(f"  {year}: {len(out)} days", flush=True)


asyncio.run(main())
print(f"dump-lectionary: {START}-{END} → {OUT}")
