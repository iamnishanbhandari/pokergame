import React, { useState, useEffect, useContext } from "react";
import { Navigate } from "react-router-dom";
import randomCodeGenerator from "../../utils/randomCodeGenerator";
import "./Homepage.css";
import io from "socket.io-client";
import { UserContext } from "../../utils/UserContext";
import { Heading, VStack, Spacer, Flex, Button } from "@chakra-ui/react";
import WaitingButton from "./WaitingButton";
import GameCodeModal from "./GameCodeModal";
// import SignIn from "../../components/auth/SignIn"; // Commented out
// import SignUp from "../auth/SignUp"; // Commented out
import { Web3Provider } from "@ethersproject/providers";

let socket;
const ENDPOINT = process.env.REACT_APP_ENDPOINT;

const Homepage = () => {
  const [waiting, setWaiting] = useState([]);
  const [waitingToggle, setWaitingToggle] = useState(false);
  const [code, setCode] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState("");
  const { user } = useContext(UserContext);

  useEffect(() => {
    const connectionOptions = {
      forceNew: true,
      reconnectionAttempts: "Infinity",
      transports: ["websocket"],
    };
    socket = io.connect(ENDPOINT, connectionOptions);

    // Cleanup on component unmount
    return function cleanup() {
      socket.emit("waitingDisconnection");
      // Shut down connection instance
      socket.off();
    };
  }, []);

  useEffect(() => {
    socket.on("waitingRoomData", ({ waiting }) => {
      waiting && setWaiting(waiting);
    });
    socket.on("randomCode", ({ code }) => {
      code && setCode(code);
    });
  }, []);

  useEffect(() => {
    !waitingToggle && socket.emit("waitingDisconnection");
    waitingToggle && socket.emit("waiting");
  }, [waitingToggle]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const providerInstance = new Web3Provider(window.ethereum);
        const accounts = await providerInstance.send("eth_requestAccounts", []);
        setProvider(providerInstance);
        setAccount(accounts[0]);
        setWalletConnected(true);
      } catch (error) {
        console.error("User denied wallet connection:", error);
        setWalletConnected(false);
      }
    } else {
      alert("MetaMask not detected. Please install MetaMask.");
    }
  };

  if (waiting.length >= 2) {
    const users = waiting.slice(0, 2);
    socket.emit("randomCode", {
      id1: users[0],
      id2: users[1],
      code: randomCodeGenerator(3),
    });
    if (users[0] === socket.id && code !== "") {
      socket && socket.emit("waitingDisconnection", users[0]);
      return <Navigate to={`/play?roomCode=${code}`} />;
    } else if (users[1] === socket.id && code !== "") {
      socket && socket.emit("waitingDisconnection", users[0]);
      return <Navigate to={`/play?roomCode=${code}`} />;
    }
  }

  return (
    <div className="Homepage">
      <Flex
        className="container"
        justify="center"
        align="center"
        flexDir="column"
        flexWrap="wrap"
      >
        {!user && (
          <Heading className="heading" size="lg">
            Sign In/Register to unlock Premium features
          </Heading>
        )}
        {user && (
          <Heading className="heading" size="lg">
            Welcome, {user.username}!
          </Heading>
        )}
        <VStack w="lg" spacing="1rem" align="center" justify="center">
          <Spacer />
          {/* Commented out SignIn and SignUp components */}
          {/* <SignIn className="signIn" size="lg" /> */}
          {/* {!user && <SignUp className="signUp" size="lg" />} */}
          <Button
            className="connectWalletButton"
            size="lg"
            onClick={connectWallet}
            isDisabled={walletConnected}
          >
            {walletConnected ? "Wallet Connected" : "Connect Wallet"}
          </Button>
          <GameCodeModal
            className="gameCodeModal"
            size="lg"
            isDisabled={!walletConnected}
          />
          <WaitingButton
            className="waitingButton"
            size="lg"
            onClose={() => {
              setWaitingToggle(false);
            }}
            onTrigger={() => {
              setWaitingToggle(true);
            }}
            queueLength={waiting.length}
            isDisabled={!walletConnected}
          />
        </VStack>
      </Flex>
    </div>
  );
};

export default Homepage;
