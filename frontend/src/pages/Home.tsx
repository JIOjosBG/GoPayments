import React, { useCallback } from "react";
import { useEthereum } from "../contexts/EthereumContext";
import { useBackend } from "../contexts/BackendContext";
import CreatePayment from "./components/CreatePayment";
import PaymentListItem from "./components/PaymentListItem";

function Home(): React.ReactElement {
  const { requestAccount, signLoginMessage } = useEthereum();
  const { user, templates, isLoadingTemplates, requestCookie } = useBackend();

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
              <div className="col-md-6">
                <h2>User Information</h2>
                {user.status === "ready" ? (
                  <div>
                    <p>
                      <strong>Ethereum Address:</strong>{" "}
                      {user.user.ethereum_address}
                    </p>
                    {
                      <p>
                        <strong>Username:</strong> {user.user.username}
                      </p>
                    }
                    <p>
                      <strong>Anonymous:</strong>{" "}
                      {user.user.is_anonymous ? "Yes" : "No"}
                    </p>
                  </div>
                ) : user.status === "error" ? (
                  <p>Error getting user wit address {user.address}.</p>
                ) : (
                  <p>unknown state</p>
                )}
                <h3 className="mt-4">Payment Templates</h3>
                {isLoadingTemplates ? (
                  <p>Loading templates...</p>
                ) : templates.length > 0 ? (
                  <ul>
                    {templates.map((template) => (
                      <PaymentListItem template={template} />
                    ))}
                  </ul>
                ) : (
                  <p>No payment templates found.</p>
                )}
              </div>
              <div className="col-md-6">
                <CreatePayment />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
