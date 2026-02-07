import React, { useState, ChangeEvent } from "react";
import { useBackend } from "../../contexts/BackendContext";

function CreatePayment(): React.ReactElement {
  const { assets, isLoadingAssets } = useBackend();

  const [selectedAsset, setSelectedAsset] = useState<string>("USDC");
  const [amount, setAmount] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  const handleAssetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedAsset(e.target.value);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  const handleDestinationChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDestination(e.target.value);
  };

  return (
    <form className="mt-4">
      <div className="mb-3">
        <label htmlFor="asset-select" className="form-label">
          Select Asset
        </label>
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
            assets.map((asset) => (
              <option key={asset.id} value={asset.symbol}>
                {asset.symbol} - {asset.name}
              </option>
            ))
          )}
        </select>
      </div>
      <div className="mb-3">
        <label htmlFor="amount-input" className="form-label">
          Amount
        </label>
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
        <label htmlFor="address-input" className="form-label">
          Ethereum Destination Address
        </label>
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
  );
}

export default CreatePayment;
