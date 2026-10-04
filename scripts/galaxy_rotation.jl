# small machine; compare a finite luminous disk with a rising, nearly flat halo term.
using Printf

fmt(value) = @sprintf("%.7g", Float64(value))
G = 4.30091e-6 # kpc (km/s)^2 / solar mass
radii = 10.0 .^ range(-1.0, stop=log10(30.0), length=80)
disk_mass = 5.0e10
scale_length = 3.0
flat_speed = 220.0
core_radius = 2.0
visible = [sqrt(G * disk_mass * (1 - (1 + r / scale_length) * exp(-r / scale_length)) / r) for r in radii]
halo_term = [flat_speed * sqrt(1 - exp(-r / core_radius)) for r in radii]
combined = [sqrt(visible[i]^2 + halo_term[i]^2) for i in eachindex(radii)]
array(values) = "[" * join(fmt.(values), ",") * "]"
println("{\"radiiKpc\":" * array(radii) * ",\"visibleKms\":" * array(visible) * ",\"haloIncludedKms\":" * array(combined) * ",\"diskMassSolar\":" * fmt(disk_mass) * ",\"scaleLengthKpc\":" * fmt(scale_length) * "}")
