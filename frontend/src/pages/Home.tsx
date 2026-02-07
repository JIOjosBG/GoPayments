import React, { useState, ChangeEvent, useCallback } from 'react';
import { useEthereum } from '../contexts/EthereumContext';
import { useBackend } from '../contexts/BackendContext';

function Home(): React.ReactElement {
  const {  requestAccount, signLoginMessage } = useEthereum();
  const { 
    user, 
    templates, 
    isLoadingTemplates, 
    assets, 
    isLoadingAssets,
    requestCookie
  } = useBackend();

  const [selectedAsset, setSelectedAsset] = useState<string>('USDC');
  const [amount, setAmount] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  
  const handleAssetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedAsset(e.target.value);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  const handleDestinationChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDestination(e.target.value);
  };

  const attemptToAuthenticate  = useCallback(async ()=>{
    const signedMessageData = await signLoginMessage()
    if (!signedMessageData) return
    const {message, signature, account} = signedMessageData
    await requestCookie({ message, signature, account })

  },[signLoginMessage,requestCookie])

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          {user.status !== 'not_connected' ? (
            <>
              <div className="row">
                <div className="col-md-6">
                  <h2>User Information</h2>
                  {user.status === 'loading' ? (
                    <p>Loading user data...</p>
                  ) : user.status === 'ready' ? (
                    <div>
                      <p><strong>Ethereum Address:</strong> {user.user.ethereum_address}</p>
                      {<p><strong>Username:</strong> {user.user.username}</p>}
                      <p><strong>Anonymous:</strong> {user.user.is_anonymous ? 'Yes' : 'No'}</p>
                    </div>
                  ) : user.status === 'error' ? (
                    <p>Error getting user wit address {user.address}.</p>
                  ) : user.status === 'not_authenticated' ? (
                   <div>
                    <p>Not authenticated.</p>
                    <button onClick={attemptToAuthenticate} className="btn btn-primary">Authenticate</button>
                  </div>
                  ) : (<p>unknown state</p>)}
                  <h3 className="mt-4">Payment Templates</h3>
                  {isLoadingTemplates ? (
                    <p>Loading templates...</p>
                  ) : templates.length > 0 ? (
                    <ul>
                      {templates.map(template => (
                        <li key={template.id}>
                          {template.name} {template.is_active ? '(Active)' : '(Cancelled)'}
                          {template.transfers && template.transfers.map((transfer, index) => (
                            <div key={index}>
                              <strong>To:</strong> {transfer.destination_user?.ethereum_address || "N/A"}
                              {" | "}
                              <strong>Asset:</strong> {transfer.asset?.symbol || "N/A"}
                              {" | "}
                              <strong>Amount:</strong> {transfer.amount}
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No payment templates found.</p>
                  )}
                </div>
                <div className="col-md-6">
                  <h1>Home accountAddress</h1> 
                  <form className="mt-4">
                    <div className="mb-3">
                      <label htmlFor="asset-select" className="form-label">Select Asset</label>
                      <select
                        className="form-select"
                        id="asset-select"
                        name="asset"
                        value={selectedAsset}
                        onChange={handleAssetChange}
                      >
                        {isLoadingAssets ? (
                          <option>Loading assets...</option>
                        ) : (
                          assets.map(asset => (
                            <option key={asset.id} value={asset.symbol}>
                              {asset.symbol} - {asset.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="amount-input" className="form-label">Amount</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        id="amount-input"
                        placeholder="Enter amount"
                        name="amount"
                        value={amount}
                        onChange={handleAmountChange}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="address-input" className="form-label">Ethereum Destination Address</label>
                      <input
                        type="text"
                        className="form-control"
                        id="address-input"
                        placeholder="Enter destination address"
                        name="destination"
                        value={destination}
                        onChange={handleDestinationChange}
                      />
                    </div>
                  </form>
                  
                  <h3 className="mt-4">Available Assets</h3>
                  {isLoadingAssets ? (
                    <p>Loading assets...</p>
                  ) : assets.length > 0 ? (
                    <ul>
                      {assets.map(asset => (
                        <li key={asset.id}>
                          <strong>{asset.symbol}</strong> - {asset.name} 
                          (Chain ID: {asset.chain_id}, Decimals: {asset.decimals})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No assets found.</p>
                  )}
                </div>
              </div>
          </>
          ) : (
            <button onClick={requestAccount} className="btn btn-primary">Connect account</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
