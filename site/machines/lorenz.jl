# small machines; lorenz. a weather-shaped orbit. it exists to show how a tiny system can stay wild.
# usage; julia scripts/lorenz.jl > site/data/lorenz.json

using Printf

const sigma = 10.0
const rho = 28.0
const beta = 8.0 / 3.0
const dt = 0.008
const steps = 9000
const stride = 10

fmt(value) = @sprintf("%.7f", value)

function velocity(x, y, z)
    return sigma * (y - x), x * (rho - z) - y, x * y - beta * z
end

function orbit(x, y, z)
    local points = Vector{NTuple{3, Float64}}()
    for step in 1:steps
        k1x, k1y, k1z = velocity(x, y, z)
        k2x, k2y, k2z = velocity(x + dt * k1x / 2, y + dt * k1y / 2, z + dt * k1z / 2)
        k3x, k3y, k3z = velocity(x + dt * k2x / 2, y + dt * k2y / 2, z + dt * k2z / 2)
        k4x, k4y, k4z = velocity(x + dt * k3x, y + dt * k3y, z + dt * k3z)
        x += dt * (k1x + 2 * k2x + 2 * k3x + k4x) / 6
        y += dt * (k1y + 2 * k2y + 2 * k3y + k4y) / 6
        z += dt * (k1z + 2 * k2z + 2 * k3z + k4z) / 6
        if step % stride == 0
            push!(points, (x, y, z))
        end
    end
    return points
end

x, y, z = 0.1, 0.0, 0.0
points = orbit(x, y, z)

print("{\"parameters\":{\"sigma\":", fmt(sigma), ",\"rho\":", fmt(rho), ",\"beta\":", fmt(beta), "},\"points\":[")
for (index, point) in enumerate(points)
    index > 1 && print(",")
    print("[", fmt(point[1]), ",", fmt(point[2]), ",", fmt(point[3]), "]")
end
print("]}")
