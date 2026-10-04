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


def galaxy_rotation():
    gravitational_constant = 4.30091e-6
    disk_mass, scale_length, flat_speed, core_radius = 5e10, 3.0, 220.0, 2.0
    radii = [10 ** (-1 + math.log10(300) * index / 79) for index in range(80)]
    visible = [math.sqrt(gravitational_constant * disk_mass * (1 - (1 + radius / scale_length) * math.exp(-radius / scale_length)) / radius) for radius in radii]
    halo_term = [flat_speed * math.sqrt(1 - math.exp(-radius / core_radius)) for radius in radii]
    combined = [math.sqrt(visible[index] ** 2 + halo_term[index] ** 2) for index in range(len(radii))]
    return {
        "radiiKpc": [round(value, 7) for value in radii],
        "visibleKms": [round(value, 7) for value in visible],
        "haloIncludedKms": [round(value, 7) for value in combined],
        "diskMassSolar": disk_mass,
        "scaleLengthKpc": scale_length,
    }


def three_body():
    period = 6.32591398
    total_time = 8 * period
    steps, stride = 48000, 160
    dt = total_time / steps
    initial = [-0.97000436, 0.24308753, 0.97000436, -0.24308753, 0.0, 0.0,
               0.4662036850, 0.4323657300, 0.4662036850, 0.4323657300,
               -0.93240737, -0.86473146]

    def derivative(state):
        acceleration = []
        for i in range(3):
            ax = ay = 0.0
            ix, iy = 2 * i, 2 * i + 1
            for j in range(3):
                if i == j:
                    continue
                dx, dy = state[2 * j] - state[ix], state[2 * j + 1] - state[iy]
                inverse_cube = (dx * dx + dy * dy) ** -1.5
                ax += dx * inverse_cube
                ay += dy * inverse_cube
            acceleration.extend((ax, ay))
        return state[6:] + acceleration

    def rk4(state):
        k1 = derivative(state)
        k2 = derivative([state[i] + dt * k1[i] / 2 for i in range(12)])
        k3 = derivative([state[i] + dt * k2[i] / 2 for i in range(12)])
        k4 = derivative([state[i] + dt * k3[i] for i in range(12)])
        return [state[i] + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6 for i in range(12)]

    scenarios = []
    deltas = [0.0, 0.00005, 0.0002, 0.0008, 0.002]
    for delta in deltas:
        state = initial[:]
        state[6] += delta
        frames = []
        for step in range(steps + 1):
            if step % stride == 0:
                frames.append([[round(state[2 * body], 7), round(state[2 * body + 1], 7)] for body in range(3)])
            if step < steps:
                state = rk4(state)
        scenarios.append({"delta": delta, "positions": frames})
    times = [round(step * dt, 7) for step in range(0, steps + 1, stride)]
    return {"period": period, "times": times, "scenarios": scenarios}


def jeans_mass():
    k_b, m_h, grav, solar_mass, mu = 1.380649e-16, 1.6735575e-24, 6.67430e-8, 1.98847e33, 2.33
    temperatures = list(range(5, 51, 5))
    log_density = [2 + 4 * index / 80 for index in range(81)]
    masses = []
    for temperature in temperatures:
        row = []
        for log_n in log_density:
            density = 10 ** log_n * mu * m_h
            sound_speed = math.sqrt(k_b * temperature / (mu * m_h))
            row.append(round((math.pi ** 2.5 / 6) * sound_speed ** 3 / (grav ** 1.5 * math.sqrt(density)) / solar_mass, 7))
        masses.append(row)
    return {
        "temperatureKelvin": temperatures,
        "log10NumberDensity": [round(value, 7) for value in log_density],
        "solarMasses": masses,
        "meanMolecularWeight": mu,
    }


def eddington():
    grav, speed_of_light = 6.67430e-8, 2.99792458e10
    proton_mass, thomson, solar_mass = 1.67262192369e-24, 6.6524587321e-25, 1.98847e33
    masses = [1 + 99 * index / 99 for index in range(100)]
    luminosities = [4 * math.pi * grav * mass * solar_mass * proton_mass * speed_of_light / thomson for mass in masses]
    return {"massSolar": masses, "luminosityErgPerSecond": [round(value, 4) for value in luminosities], "luminosityPerSolarMass": round(luminosities[0], 4)}


def schechter():
    alphas = [-1.8 + 1.4 * index / 14 for index in range(15)]
    luminosity_ratio = [10 ** (-2 + 3 * index / 120) for index in range(121)]
    curves = [[round(x ** alpha * math.exp(-x), 9) for x in luminosity_ratio] for alpha in alphas]
    return {"alpha": [round(value, 7) for value in alphas], "luminosityOverLstar": [round(value, 9) for value in luminosity_ratio], "phiOverPhiStar": curves}


write("phyllotaxis.json", phyllotaxis())
write("lorenz.json", lorenz())
write("galaxy-rotation.json", galaxy_rotation())
write("three-body.json", three_body())
write("jeans-mass.json", jeans_mass())
write("eddington.json", eddington())
write("schechter.json", schechter())
