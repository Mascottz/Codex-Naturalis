# small machine; evaluate the isothermal Jeans mass over molecular-cloud temperatures and densities.
using Printf

fmt(value) = @sprintf("%.7g", Float64(value))
k_B = 1.380649e-16 # erg / K
m_H = 1.6735575e-24 # g
G = 6.67430e-8 # cm^3 / (g s^2)
M_sun = 1.98847e33 # g
mu = 2.33
temperatures = collect(5.0:5.0:50.0)
log_density = collect(range(2.0, stop=6.0, length=81))
function jeans_mass_solar(T, log_n)
    density = 10.0^log_n * mu * m_H
    sound_speed = sqrt(k_B * T / (mu * m_H))
    (pi^(5 / 2) / 6) * sound_speed^3 / (G^(3 / 2) * sqrt(density)) / M_sun
end
masses = [[jeans_mass_solar(T, log_n) for log_n in log_density] for T in temperatures]
array(values) = "[" * join(fmt.(values), ",") * "]"
matrix(values) = "[" * join((array(row) for row in values), ",") * "]"
println("{\"temperatureKelvin\":" * array(temperatures) * ",\"log10NumberDensity\":" * array(log_density) * ",\"solarMasses\":" * matrix(masses) * ",\"meanMolecularWeight\":" * fmt(mu) * "}")
