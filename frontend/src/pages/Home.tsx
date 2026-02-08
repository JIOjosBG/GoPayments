import React, { useCallback } from "react";
import { useEthereum } from "../contexts/EthereumContext";
import { useBackend } from "../contexts/BackendContext";
import CreatePayment from "./components/CreatePayment";
import PaymentListItem from "./components/PaymentListItem";

function Home(): React.ReactElement {
  const { requestAccount, signLoginMessage } = useEthereum();
  const { user, requestCookie } = useBackend();

  const attemptToAuthenticate = useCallback(async () => {
    const signedMessageData = await signLoginMessage();
    if (!signedMessageData) return;
    const { message, signature, account } = signedMessageData;
    await requestCookie({ message, signature, account });
  }, [signLoginMessage, requestCookie]);

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          {user.status === "not_connected" ? (
            <button onClick={requestAccount} className="btn btn-primary">
              Connect account
            </button>
          ) : user.status === "not_authenticated" ? (
            <div>
              <p>Not authenticated.</p>
              <button
                onClick={attemptToAuthenticate}
                className="btn btn-primary"
              >
                Authenticate
              </button>
            </div>
          ) : user.status === "loading" ? (
            <p>Loading user data...</p>
          ) : (
            <div className="row">
              <CreatePayment />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
