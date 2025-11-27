# Van der Pol Oscillator Solver in Julia

This project provides a robust numerical solver for the Van der Pol oscillator, a classic non-conservative oscillator with non-linear damping. The solution is implemented in Julia using the 4th-order Runge-Kutta (RK4) method.

## Overview

The Van der Pol oscillator is described by the second-order differential equation:

$$ \frac{d^2x}{dt^2} - \mu(1 - x^2)\frac{dx}{dt} + x = 0 $$

This project solves the equation by converting it into a system of two first-order ordinary differential equations (ODEs) and applying the RK4 numerical integration method.

```
dx/dt = y
dy/dt = -μ(x² - 1)y - x
```

The implementation is provided as a command-line script that takes a JSON configuration file to define the simulation parameters.

## Live Demo

An interactive web page showcasing the Van der Pol oscillator solution is hosted on GitHub Pages. Visit the demo to visualize the oscillator's behavior with different parameters and initial conditions.

## Features

*   **Classic 4th-Order Runge-Kutta Implementation**: A clean and straightforward implementation of the RK4 algorithm for solving systems of ODEs.
*   **Command-Line Interface**: Easy to run from the terminal with simple arguments.
*   **JSON Configuration**: Simulation parameters (`μ`, initial conditions, and integration time) are managed through a simple JSON file.
*   **Input Validation**: Robust checks to ensure the configuration file is present, correctly formatted, and contains all required fields of the correct type.
*   **Extensive Test Suite**: A comprehensive set of tests to verify the correctness, stability, and accuracy of the solver.

## Prerequisites

*   Julia (version 1.6 or later)
*   The `JSON.jl` package.

To install the required package, open the Julia REPL and run:
```julia
using Pkg
Pkg.add("JSON")
```

For running the full test suite, you will also need `BenchmarkTools.jl` and optionally `DifferentialEquations.jl`:
```julia
using Pkg
Pkg.add(["BenchmarkTools", "DifferentialEquations"])
```

## Usage

1.  **Create a Configuration File**

    Create a JSON file (e.g., `config.json`) with the following structure:

    ```json
    {
      "u": 1.0,
      "v0": [2.0, 0.0],
      "tend": 10.0
    }
    ```
    -   `u`: The damping parameter `μ`.
    -   `v0`: An array of two numbers representing the initial conditions `[x(0), y(0)]`.
    -   `tend`: The end time for the integration.

2.  **Run the Solver**

    Execute the `main.jl` script from your terminal, passing the path to your configuration file as an argument.

    ```bash
    julia main.jl path/to/your/config.json
    ```

    **Example Output:**
    ```
    Configuration loaded successfully:
    Dict{String, Any}("u" => 1.0, "v0" => Any[2.0, 0.0], "tend" => 10.0)
    X value: -2.0083407836624496; Y value: 0.032907042423228706
    ```

## Running Tests

The project includes a thorough test suite in `test.jl` to ensure the solver is working correctly. To run the tests, simply execute the file with Julia:

```bash
julia test.jl
```

The tests verify several key properties of the solver and the Van der Pol system.

### Test Suite Summary

The test suite confirms the following behaviors, demonstrating the implementation's high quality:

*   **Energy Conservation (for μ=0)**: For the undamped harmonic oscillator case, the total energy is conserved with an error of less than `3e-9%` over 20 seconds of simulation time.
*   **4th-Order Convergence**: The error decreases by a factor of approximately **16** when the step size is halved, confirming the expected `O(h⁴)` convergence of the RK4 method.
    ```
    Convergence ratios: [15.57, 15.83, 15.93]
    Expected ratio for RK4: ~16
    ```
*   **Periodicity**: For `μ=0`, the system correctly returns to its initial state after one period (`2π`) with a numerical error of `~5e-10`.
*   **Limit Cycle Behavior**: For `μ>0`, trajectories starting from various initial conditions are shown to be bounded and converge towards the known limit cycle.
*   **Symmetry Preservation**: The solver correctly respects the symmetry of the Van der Pol equation, where `v(t)` and `-v(t)` are both valid solutions for opposite initial conditions.
*   **Stability**: The solution remains stable and bounded even for long integration times (e.g., `t=100`).
*   **Accuracy**: When compared against the high-precision `Tsit5` solver from `DifferentialEquations.jl`, our RK4 implementation achieves an error of less than `0.01`.

The successful execution of these tests provides strong confidence in the correctness and robustness of this solver.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
