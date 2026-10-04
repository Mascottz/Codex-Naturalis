# small machines; phyllotaxis. a seed spiral. it exists to make spacing a computed thing.
# usage; julia scripts/phyllotaxis.jl > site/data/phyllotaxis.json

using Printf

const count = 220
const golden_angle = 2π * (1 - 1 / ((1 + sqrt(5)) / 2))

fmt(value) = @sprintf("%.7f", value)

print("{\"angle\":", fmt(golden_angle * 180 / π), ",\"points\":[")
for i in 0:count-1
    radius = sqrt((i + 0.5) / count)
    angle = i * golden_angle
    x = radius * cos(angle)
    y = radius * sin(angle)
    i > 0 && print(",")
    print("[", fmt(x), ",", fmt(y), "]")
end
print("]}")
