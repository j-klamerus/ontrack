import React, { useState } from "react";

interface LoginProps {
    onLogIn: () => void;
}

function Login({ onLogIn }: LoginProps) {
    const [isRegistering, setIsRegistering] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isRegistering) {
            console.log("Creating account:", email);
        } else {
            console.log("Logging in:", email);
            onLogIn();
        }
    };

    return (
        <div>
            <h1>{isRegistering ? "Create Account" : "Login"}</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {isRegistering && (
                    <div>
                        <label>Confirm Password:</label>
                        <input
                            type="password"
                            required
                        />
                    </div>
                )}

                <button type="submit">
                    {isRegistering ? "Create Account" : "Sign In"}
                </button>
            </form>

            <p>
                {isRegistering
                    ? "Already have an account?"
                    : "Don't have an account?"}
                
                <button
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                >
                    {isRegistering ? "Sign In" : "Create Account"}
                </button>
            </p>
        </div>
    );
}

export default Login;
