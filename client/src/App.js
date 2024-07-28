import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Homepage from "./components/Homepage/Homepage";
import Game from "./components/Game/Game";
import Verify from "./components/auth/Verify";
import "./App.css";
import "./cards.css";
import "./game.css";
import { UserContext } from "./utils/UserContext";
import { useState, useEffect } from "react";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: "whiteAlpha.200",
        color: "white",
        m: 0,
        p: 0,
      },
    },
  },
});

const App = () => {
  const url = process.env.REACT_APP_ENDPOINT;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${url}/auth/`, {
          method: "GET",
          credentials: "include",
          mode: "cors",
        });
        const data = await res.json();
        if (data.user) setUser(data.user);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    if (loading) fetchData();
  }, [loading, url]);

  if (loading) return <h1>Loading...</h1>;

  return (
    <div className="App">
      <UserContext.Provider value={{ user, setUser }}>
        <ChakraProvider theme={theme}>
          <Router>
            <Routes>
              <Route path="/" element={<Homepage />} />
              <Route path="/play" element={<Game />} />
              <Route path="/verify" element={<Verify />} />
            </Routes>
          </Router>
        </ChakraProvider>
      </UserContext.Provider>
    </div>
  );
};

export default App;
