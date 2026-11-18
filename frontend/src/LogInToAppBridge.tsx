import { useState } from 'react';
import Login from './pages/LogIn';
import AppStart from './App.tsx';

function App() {
    //*******************************************/
    // This demo gate only switches screens; it does not validate credentials.
    //
    // CHANGE THE CONST STATEMENT BELOW TO ACCESS DASHBOARD
    // 
    // const [isLoggedIn, setIsLoggedIn] = useState(true)
    //
    // CURRENTLY, WHEN USING FALSE IT GETS TO THGE LOG IN PAGE
    //
    //*******************************************/
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    return (
        <div>
            {isLoggedIn ? (
                <AppStart onLogOut={() => setIsLoggedIn(false)} />
            ) : (
                <Login onLogIn={() => setIsLoggedIn(true)} />
            )}
        </div>
    );
}

export default App;