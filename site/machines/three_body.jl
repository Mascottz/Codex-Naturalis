# small machine; integrate the equal-mass figure eight and nearby initial conditions with RK4.
using Printf

fmt(value) = @sprintf("%.7g", Float64(value))
period = 6.32591398
total_time = 8 * period
steps = 48000
stride = 160
dt = total_time / steps
initial = Float64[-0.97000436, 0.24308753, 0.97000436, -0.24308753, 0.0, 0.0,
                 0.4662036850, 0.4323657300, 0.4662036850, 0.4323657300,
                 -0.93240737, -0.86473146]

function accelerations(state)
    result = Float64[]
    for i in 1:3
        ax = 0.0
        ay = 0.0
        ix = 2i - 1
        iy = 2i
        for j in 1:3
            if i == j
                continue
            end
            dx = state[2j - 1] - state[ix]
            dy = state[2j] - state[iy]
            inverse_cube = (dx * dx + dy * dy)^(-1.5)
            ax += dx * inverse_cube
            ay += dy * inverse_cube
        end
        push!(result, ax, ay)
    end
    result
end

derivative(state) = vcat(state[7:12], accelerations(state))
function rk4(state, step)
    k1 = derivative(state)
    k2 = derivative(state .+ (step / 2) .* k1)
    k3 = derivative(state .+ (step / 2) .* k2)
    k4 = derivative(state .+ step .* k3)
    state .+ (step / 6) .* (k1 .+ 2 .* k2 .+ 2 .* k3 .+ k4)
end

function integrate(delta)
    state = copy(initial)
    state[7] += delta
    frames = Vector{Vector{Tuple{Float64, Float64}}}()
    for step in 0:steps
        if step % stride == 0
            push!(frames, [(state[2i - 1], state[2i]) for i in 1:3])
        end
        if step < steps
            state = rk4(state, dt)
        end
    end
    frames
end

function frame_array(frames)
    body_frames = ["[" * join(("[" * fmt(point[1]) * "," * fmt(point[2]) * "]" for point in frame), ",") * "]" for frame in frames]
    "[" * join(body_frames, ",") * "]"
end

deltas = [0.0, 0.00005, 0.0002, 0.0008, 0.002]
scenario_json = ["{\"delta\":" * fmt(delta) * ",\"positions\":" * frame_array(integrate(delta)) * "}" for delta in deltas]
times = collect(0:stride:steps) .* dt
println("{\"period\":" * fmt(period) * ",\"times\":[" * join(fmt.(times), ",") * "],\"scenarios\":[" * join(scenario_json, ",") * "]}")
