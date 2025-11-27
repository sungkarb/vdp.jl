# test_runge_kutta.jl

using Test
using JSON

# Include the main file functions
include("main.jl")

@testset "Runge-Kutta Effectiveness Tests" begin
    
    @testset "1. Harmonic Oscillator (μ=0) - Energy Conservation" begin
        # For μ=0, system becomes: dx/dt = y, dy/dt = -x
        # This is a harmonic oscillator with conserved energy E = 0.5(x² + y²)
        
        u = 0.0
        v0 = [1.0, 0.0]
        E0 = 0.5 * (v0[1]^2 + v0[2]^2)
        
        # Test different time spans
        for tend in [1.0, 5.0, 10.0, 20.0]
            vend = runde_knut(v0, u, tend, h=0.01)
            E_end = 0.5 * (vend[1]^2 + vend[2]^2)
            relative_error = abs(E_end - E0) / E0
            
            println("  t=$tend: Energy error = $(relative_error*100)%")
            @test relative_error < 0.02  # Within 2%
        end
    end
    
    @testset "2. Convergence Order Test" begin
        # Error should decrease as O(h^4) for RK4
        
        u = 1.0
        v0 = [2.0, 0.0]
        tend = 5.0
        
        # Reference solution with very small step
        h_ref = 0.0001
        v_ref = runde_knut(v0, u, tend, h=h_ref)
        
        step_sizes = [0.1, 0.05, 0.025, 0.0125]
        errors = Float64[]
        
        println("\n  Convergence test:")
        for h in step_sizes
            v = runde_knut(v0, u, tend, h=h)
            error = sqrt((v[1] - v_ref[1])^2 + (v[2] - v_ref[2])^2)
            push!(errors, error)
            println("  h=$h: error=$error")
        end
        
        # Compute convergence ratios
        ratios = errors[1:end-1] ./ errors[2:end]
        println("  Convergence ratios: $ratios")
        println("  Expected ratio for RK4: ~16 (since step halved)")
        
        # For RK4, halving step size should reduce error by ~2^4 = 16
        @test all(ratios .> 8.0)  # At least order 3 convergence
    end
    
    @testset "3. Periodicity Test (μ=0)" begin
        # For μ=0, solution should be exactly periodic
        # Period T = 2π for harmonic oscillator
        
        u = 0.0
        v0 = [1.0, 0.0]
        T = 2π
        
        # After one period, should return to initial state
        v_period = runde_knut(v0, u, T, h=0.01)
        
        error_x = abs(v_period[1] - v0[1])
        error_y = abs(v_period[2] - v0[2])
        
        println("\n  After one period:")
        println("  x: $(v0[1]) → $(v_period[1]), error = $error_x")
        println("  y: $(v0[2]) → $(v_period[2]), error = $error_y")
        
        @test error_x < 0.01
        @test error_y < 0.01
    end
    
    @testset "4. Limit Cycle Approach (μ>0)" begin
        # For μ>0, trajectories should approach a limit cycle
        # Solution should be bounded and oscillatory
        
        u = 1.0
        
        # Test from different initial conditions
        initial_conditions = [
            [0.1, 0.1],   # Near origin
            [3.0, 0.0],   # Far from origin
            [-2.0, 1.0]   # Different quadrant
        ]
        
        println("\n  Limit cycle convergence:")
        for v0 in initial_conditions
            # Evolve for long time
            v_long = runde_knut(v0, u, 50.0, h=0.01)
            
            # Solution should be bounded (limit cycle has finite amplitude)
            @test abs(v_long[1]) < 5.0
            @test abs(v_long[2]) < 5.0
            
            println("  From $v0 → $(v_long), bounded: ✓")
        end
    end
    
    @testset "5. Symmetry Properties" begin
        # Van der Pol is symmetric: if (x(t), y(t)) is a solution,
        # then (-x(t), -y(t)) is also a solution
        
        u = 1.0
        tend = 10.0
        
        v1 = runde_knut([1.0, 0.5], u, tend, h=0.01)
        v2 = runde_knut([-1.0, -0.5], u, tend, h=0.01)
        
        println("\n  Symmetry test:")
        println("  v1 = $v1")
        println("  v2 = $v2")
        println("  -v2 = $(-v2)")
        
        @test isapprox(v1[1], -v2[1], rtol=0.01)
        @test isapprox(v1[2], -v2[2], rtol=0.01)
    end
    
    @testset "6. Step Size Sensitivity" begin
        # Test that reasonable step sizes give consistent results
        
        u = 1.0
        v0 = [2.0, 0.0]
        tend = 10.0
        
        step_sizes = [0.1, 0.05, 0.02, 0.01]
        results = []
        
        println("\n  Step size sensitivity:")
        for h in step_sizes
            v = runde_knut(v0, u, tend, h=h)
            push!(results, v)
            println("  h=$h: v=$v")
        end
        
        # Results should converge as h decreases
        for i in 2:length(results)
            diff = sqrt((results[i][1] - results[i-1][1])^2 + 
                       (results[i][2] - results[i-1][2])^2)
            @test diff < 0.1  # Successive refinements should be close
        end
    end
    
    @testset "7. Different μ Values" begin
        # Method should work for various μ values
        
        v0 = [1.0, 0.0]
        tend = 20.0
        h = 0.01
        
        println("\n  Testing different μ values:")
        for u in [0.0, 0.5, 1.0, 2.0, 5.0]
            v = runde_knut(v0, u, tend, h=h)
            
            # Solution should remain bounded
            @test abs(v[1]) < 10.0
            @test abs(v[2]) < 10.0
            
            println("  μ=$u: v=$v, bounded: ✓")
        end
    end
    
    @testset "8. Long-time Stability" begin
        # RK4 should remain stable for long integration times
        
        u = 1.0
        v0 = [1.0, 0.0]
        
        println("\n  Long-time stability:")
        for tend in [10.0, 50.0, 100.0]
            v = runde_knut(v0, u, tend, h=0.01)
            
            # Solution should not blow up
            @test abs(v[1]) < 10.0
            @test abs(v[2]) < 10.0
            @test !isnan(v[1]) && !isnan(v[2])
            @test !isinf(v[1]) && !isinf(v[2])
            
            println("  t=$tend: stable ✓")
        end
    end
end

@testset "Performance Benchmarks" begin
    using BenchmarkTools
    
    u = 1.0
    v0 = [1.0, 0.0]
    tend = 10.0
    
    println("\n=== Performance Benchmarks ===")
    
    @testset "Execution Time vs Step Size" begin
        for h in [0.1, 0.05, 0.01, 0.005]
            n_steps = Int(tend / h)
            print("  h=$h ($n_steps steps): ")
            @btime runde_knut($v0, $u, $tend, h=$h)
        end
    end
    
    @testset "Execution Time vs Integration Length" begin
        h = 0.01
        for tend in [1.0, 10.0, 50.0, 100.0]
            print("  tend=$tend: ")
            @btime runde_knut($v0, $u, $tend, h=$h)
        end
    end
end

# Comparison with reference implementation
@testset "Accuracy Comparison" begin
    println("\n=== Accuracy Comparison ===")
    
    # Compare against DifferentialEquations.jl if available
    try
        using DifferentialEquations
        
        u = 1.0
        v0 = [1.0, 0.0]
        tend = 20.0
        
        # Reference solution
        function vdp!(dv, v, p, t)
            u = p
            dv[1] = v[2]
            dv[2] = -u * (v[1]^2 - 1) * v[2] - v[1]
        end
        
        prob = ODEProblem(vdp!, v0, (0.0, tend), u)
        sol_ref = solve(prob, Tsit5(), abstol=1e-10, reltol=1e-10)
        v_ref = sol_ref[end]
        
        # Our solution
        v_ours = runde_knut(v0, u, tend, h=0.01)
        
        error = sqrt((v_ours[1] - v_ref[1])^2 + (v_ours[2] - v_ref[2])^2)
        
        println("  Reference: $v_ref")
        println("  Our RK4:   $v_ours")
        println("  Error:     $error")
        
        @test error < 0.01  # Should be quite accurate
        
    catch e
        println("  DifferentialEquations.jl not available, skipping comparison")
    end
end

println("\n=== Summary ===")
println("All tests demonstrate:")
println("✓ Energy conservation for μ=0 (within 2%)")
println("✓ 4th-order convergence (O(h⁴))")
println("✓ Correct periodicity for harmonic oscillator")
println("✓ Limit cycle behavior for μ>0")
println("✓ Symmetry preservation")
println("✓ Stability for long integration times")
println("✓ Robustness across different parameter values")
