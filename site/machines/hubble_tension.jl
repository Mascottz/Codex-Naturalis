# small machine; compare the 2022 SH0ES and Planck 2018 H0 measurements, assuming independent errors.
using Printf

shoes, sigma_shoes = 73.04, 1.04
planck, sigma_planck = 67.4, 0.5
combined_sigma = hypot(sigma_shoes, sigma_planck)
tension = abs(shoes - planck) / combined_sigma
@printf("SH0ES minus Planck: %.2f km/s/Mpc\n", shoes - planck)
@printf("Independent-error comparison: %.2f sigma\n", tension)
println("This compact comparison does not replace a full systematic-error or model analysis.")
