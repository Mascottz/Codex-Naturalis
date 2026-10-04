# small machine; compute the electron-scattering Eddington luminosity for hydrogen-rich matter.
using Printf

fmt(value) = @sprintf("%.7g", Float64(value))
G = 6.67430e-8 # cm^3 g^-1 s^-2
c = 2.99792458e10 # cm s^-1
m_p = 1.67262192369e-24 # g
sigma_T = 6.6524587321e-25 # cm^2
M_sun = 1.98847e33 # g
masses = collect(range(1.0, stop=100.0, length=100))
luminosities = [4pi * G * mass * M_sun * m_p * c / sigma_T for mass in masses]
array(values) = "[" * join(fmt.(values), ",") * "]"
println("{\"massSolar\":" * array(masses) * ",\"luminosityErgPerSecond\":" * array(luminosities) * ",\"luminosityPerSolarMass\":" * fmt(first(luminosities)) * "}")
