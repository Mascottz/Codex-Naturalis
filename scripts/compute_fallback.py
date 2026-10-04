# small machines; fallback compute. it keeps the page buildable where julia is not installed.
# usage; python3 scripts/compute_fallback.py

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def write(name, value):
    (OUT / name).write_text(json.dumps(value, separators=(",", ":")) + "\n", encoding="utf-8")


def phyllotaxis():
    count = 220
    golden_angle = 2 * math.pi * (1 - 1 / ((1 + math.sqrt(5)) / 2))
    points = []
    for index in range(count):
        radius = math.sqrt((index + 0.5) / count)
        angle = index * golden_angle
        points.append([round(radius * math.cos(angle), 7), round(radius * math.sin(angle), 7)])
    return {"angle": round(math.degrees(golden_angle), 7), "points": points}


def lorenz():
    sigma, rho, beta = 10.0, 28.0, 8 / 3
    dt, steps, stride = 0.008, 9000, 10
    point = [0.1, 0.0, 0.0]

    def velocity(p):
        x, y, z = p
        return [sigma * (y - x), x * (rho - z) - y, x * y - beta * z]

    def add(p, k, scale):
        return [p[i] + scale * k[i] for i in range(3)]

    for step in range(1, steps + 1):
        k1 = velocity(point)
        k2 = velocity(add(point, k1, dt / 2))
        k3 = velocity(add(point, k2, dt / 2))
        k4 = velocity(add(point, k3, dt))
        point = [point[i] + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6 for i in range(3)]
        if step % stride == 0:
            pass
    # recompute with the sampled path kept; the loop above only gives the invariant check a cheap reference.
    point = [0.1, 0.0, 0.0]
    points = []
    for step in range(1, steps + 1):
        k1 = velocity(point)
        k2 = velocity(add(point, k1, dt / 2))
        k3 = velocity(add(point, k2, dt / 2))
        k4 = velocity(add(point, k3, dt))
        point = [point[i] + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6 for i in range(3)]
        if step % stride == 0:
            points.append([round(value, 7) for value in point])
    return {"parameters": {"sigma": sigma, "rho": rho, "beta": beta}, "points": points}


write("phyllotaxis.json", phyllotaxis())
write("lorenz.json", lorenz())
