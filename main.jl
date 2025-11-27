using JSON

function validate_config(config_path::String)
    # Check if file exists
    if !isfile(config_path)
        println("Error: Configuration file not found: $config_path")
        exit(1)
    end

    # Try to parse JSON file
    local config
    try
        config = JSON.parsefile(config_path)
    catch e
        println("Error: Failed to parse JSON file: $config_path")
        println("  $(typeof(e)): $(e.msg)")
        exit(1)
    end

    # Validate required fields
    if !haskey(config, "u")
        println("Error: Missing required field 'u' in configuration file")
        exit(1)
    end

    if !haskey(config, "v0")
        println("Error: Missing required field 'v0' in configuration file")
        exit(1)
    end

    if !haskey(config, "tend")
        println("Error: Missing required field 'tend' in configuration file")
        exit(1)
    end

    # Validate field types
    if !(config["u"] isa Number)
        println("Error: Field 'u' must be a number, got $(typeof(config["u"]))")
        exit(1)
    end

    if !(config["v0"] isa Array)
        println("Error: Field 'v0' must be an array, got $(typeof(config["v0"]))")
        exit(1)
    end

    if length(config["v0"]) != 2
        println("Error: Field 'v0' must be an array of length 2, got length $(length(config["v0"]))")
        exit(1)
    end

    if !all(x -> x isa Number, config["v0"])
        println("Error: All elements in 'v0' must be numbers")
        exit(1)
    end

    if !(config["tend"] isa Number)
        println("Error: Field 'tend' must be a number, got $(typeof(config["tend"]))")
        exit(1)
    end

    return config
end

function F(v::Array{Float64, 1}, u::Float64)
    x, y = v
    result = [
        y,
        -u*(x*x - 1)*y -x
    ]
    return result
end

function runde_knut(v0::Array{Float64, 1}, u::Float64, tend::Float64; h::Float64 = 0.01)
    t = 0.0
    v = copy(v0)
    while t < tend
        # Adjust step size if we would overshoot
        dt = min(h, tend - t)

        k1 = F(v, u)
        k2 = F(v + dt/2 * k1, u)
        k3 = F(v + dt/2 * k2, u)
        k4 = F(v + dt * k3, u)

        v = v + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        t += dt
    end

    return v
end


if abspath(PROGRAM_FILE) == @__FILE__
    if length(ARGS) != 1
        println("Usage: julia main.jl <config_path>")
        println("  config_path: Path to the configuration file")
        exit(1)
    end

    config_path = ARGS[1]
    println("Configuration loaded successfully:")
    config = validate_config(config_path)


    # Convert to proper types
    u = Float64(config["u"])
    v0 = Float64.(config["v0"])
    tend = Float64(config["tend"])

    # Run Rudde-Knutt algorithm
    vend = runde_knut(v0, u, tend)
    x, y = vend
    println("X value: $(x); Y value: $(y)")
end

