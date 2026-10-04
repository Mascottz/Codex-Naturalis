# c2; exact small-n search for the silent board.
# A set bit means that peg is present; a zero bit means the peg is removed.

function final_distribution(n::Int, peg_mask::Int)
    zero = BigInt(0) // BigInt(1)
    one = BigInt(1) // BigInt(1)
    half = BigInt(1) // BigInt(2)
    mass = fill(zero, n + 1)
    mass[1] = one

    for row in 0:(n - 1)
        next_mass = fill(zero, n + 1)
        row_offset = div(row * (row + 1), 2)
        for state in 0:row
            peg_offset = row_offset + state
            peg_is_present = ((peg_mask >> peg_offset) & 1) == 1
            if peg_is_present
                next_mass[state + 1] += mass[state + 1] * half
                next_mass[state + 2] += mass[state + 1] * half
            else
                next_mass[state + 1] += mass[state + 1]
            end
        end
        mass = next_mass
    end
    return mass
end

expected_uniform_counts = [1, 0, 0, 0]
for n in 1:4
    peg_count = div(n * (n + 1), 2)
    uniform_masks = Int[]
    for peg_mask in 0:((1 << peg_count) - 1)
        probabilities = final_distribution(n, peg_mask)
        if all(probability -> probability == probabilities[1], probabilities)
            push!(uniform_masks, peg_mask)
        end
    end
    if length(uniform_masks) != expected_uniform_counts[n]
        error("small-n witness disagrees at n=$(n)")
    end
    examples = isempty(uniform_masks) ? "none" : join(uniform_masks, ",")
    println("n=$(n), masks=$(1 << peg_count), uniform=$(length(uniform_masks)), examples=$(examples)")
end
