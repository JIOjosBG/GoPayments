import React, { useState } from 'react';
import { useEthereum } from '../contexts/EthereumContext';
import { useBackend } from '../contexts/BackendContext';

function Home() {
  const { account, requestAccount } = useEthereum();
  const { 
    user, 
    isLoadingUser, 
    templates, 
    isLoadingTemplates, 
    assets, 
    isLoadingAssets,
  } = useBackend();

  const [selectedAsset, setSelectedAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  
  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          {account ? (
            <>
              <div className="row">
                <div className="col-md-6">
                  <h2>User Information</h2>
                  {isLoadingUser ? (
                    <p>Loading user data...</p>
                  ) : user ? (
                    <div>
                      <p><strong>Ethereum Address:</strong> {user.ethereum_address}</p>
                      {user.username && <p><strong>Username:</strong> {user.username}</p>}
                      <p><strong>Anonymous:</strong> {user.is_anonymous ? 'Yes' : 'No'}</p>
                    </div>
                  ) : (
                    <p>User not found in database. Connect your wallet to start.</p>
                  )}
                  
                  <h3 className="mt-4">Payment Templates</h3>
                  {isLoadingTemplates ? (
                    <p>Loading templates...</p>
                  ) : templates.length > 0 ? (
                    <ul>
                      {templates.map(template => (
                        <li key={template.id}>
                          {template.name} {template.is_active ? '(Active)' : '(Cancelled)'}
                          {template.transfers.map((transfer) => (
                            <div>
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
                  <h1>Home {account}</h1> 
                  <form className="mt-4">
                    <div className="mb-3">
                      <label htmlFor="asset-select" className="form-label">Select Asset</label>
                      <select
                        className="form-select"
                        id="asset-select"
                        name="asset"
                        value={selectedAsset}
                        onChange={e => setSelectedAsset(e.target.value)}
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
                        onChange={e => setAmount(e.target.value)}
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
                        onChange={e => setDestination(e.target.value)}
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
            <button onClick={requestAccount} className="btn btn-primary">Request Account</button>
          )}
        </div>
      </div>
    </div>
  );
}
export default Home;