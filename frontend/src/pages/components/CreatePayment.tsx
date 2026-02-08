import React, { useState, ChangeEvent, useCallback } from "react";
import { Asset, useBackend } from "../../contexts/BackendContext";
import { Interface, parseUnits } from "ethers";
import { useEthereum } from "@/contexts/EthereumContext";
import { MaxUint256 } from "ethers";
export interface Movement {
  asset: Asset;
  amount: number;
  destination: string;
}

export enum TypeOfBatch {
  Now = "NOW",
  Schedule = "SCHEDULE",
  Recurring = "RECURRING",
}

const iface = new Interface([
  "function transfer(address,uint)",
  "function approve(address,uint)",
]);

function movementsToSimpleTransfers(movements: Movement[]) {
  return movements.map((m): { to: string; value: bigint; data: string } => {
    let amount: bigint = parseUnits(m.amount.toString(), m.asset.decimals);

    if (
      m.asset.contract_address?.toLowerCase() ===
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ) {
      return { to: m.destination, value: amount, data: "0x" };
    } else {
      const data = iface.encodeFunctionData("transfer", [
        m.destination,
        amount,
      ]);
      return { to: m.asset.contract_address, data, value: BigInt(0) };
    }
  });
}

const BACKEND_ADDRESS = "0x8b789Eb02B50c7c91Ff3eF2acF74d98d4DcC93fE";
function CreatePayment(): React.ReactElement {
  const { assets, isLoadingAssets, sendPaymentToBackend } = useBackend();
  const { sendCallsViaWallet, account } = useEthereum();

  const [selectedAsset, setSelectedAsset] = useState<string>("USDC");
  const [amount, setAmount] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [typeOfBatch, setTypeOfBatch] = useState<TypeOfBatch>(TypeOfBatch.Now);
  const [timeInterval, setTimeInterval] = useState<number | null>(null);

  const simpleCsvExecute = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      console.log(text);

      const rows = text.split("\n");
      const expectedRow1 =
        "Name,Chain id,User address,Scheduled at,Interval in seconds,Number of transfers";
      const expectedTransferRow =
        "Amount,Destination,Asset id,Asset symbol,Asset decimals,Asset address,Asset chain id";
      if (rows[0] !== expectedRow1)
        return console.error("Wrong csv format: wrong first line");
      if (rows[1].split(",").length !== expectedRow1.split(",").length)
        return console.error("Wrong csv format: lines[1] arguments length");
      const [
        name,
        chainId,
        fromUserAddress,
        scheduledAt,
        intercal,
        numberOfTransfers,
      ] = rows[1].split(",");

      if (rows[2] !== expectedTransferRow)
        return console.error("Wrong csv format: unexpected rows[2]");
      if (rows.length - 3 !== Number(numberOfTransfers))
        return console.error("Wrong csv format: wrong number of transfers");
      const movements: Movement[] = rows
        .slice(3)
        .map((r: string): Movement | undefined => {
          if (r.split(",").length !== expectedTransferRow.split(",").length) {
            console.error(
              "Wrong csv format: length of transfer row unexpected",
            );
            return;
          }

          const [
            amount,
            destination,
            assetId,
            symbol,
            decimals,
            contract_address,
            chainId,
          ] = r.split(",");
          return {
            amount: Number(amount),
            destination,
            asset: {
              id: Number(assetId),
              created_at: "",
              symbol,
              name: "",
              decimals: Number(decimals),
              contract_address,
              chain_id: Number(chainId),
            },
          };
        })
        .filter(Boolean);
      const calls = movementsToSimpleTransfers(movements);
      sendCallsViaWallet(Number(chainId), calls);
    };
    input.click();
  }, []);
  const handleActionButton = useCallback(async () => {
    if (account.status !== "connected") return;
    const chainId: number = movements
      .map((m) => m.asset.chain_id)
      .reduce((c1, c2) => (c1 === c2 ? c1 : 0));
    if (!chainId) return console.log("Err");

    if (typeOfBatch === TypeOfBatch.Now) {
      const calls = movementsToSimpleTransfers(movements);
      await sendCallsViaWallet(chainId, calls);
      await sendPaymentToBackend({
        chainId,
        movements,
        account: account.account,
        type: TypeOfBatch.Now,
        scheduledAt: Date.now(),
      });
    } else if (typeOfBatch === TypeOfBatch.Schedule) {
      if (!timeInterval) return;
      const calls = movements.map(
        (m): { to: string; value: bigint; data: string } => {
          let amount: bigint = parseUnits(
            m.amount.toString(),
            m.asset.decimals,
          );

          // @TODO make it work with eth
          const data = iface.encodeFunctionData("approve", [
            BACKEND_ADDRESS,
            amount,
          ]);
          return { to: m.asset.contract_address, data, value: BigInt(0) };
        },
      );
      await sendCallsViaWallet(chainId, calls);
      await sendPaymentToBackend({
        chainId,
        movements,
        account: account.account,
        type: TypeOfBatch.Schedule,
        scheduledAt: Date.now() + timeInterval * 1000 * 60,
      });
    } else if (typeOfBatch === TypeOfBatch.Recurring) {
      if (!timeInterval) return;
      const tokens = [
        ...new Set(movements.map((m) => String(m.asset.contract_address))),
      ];
      const calls = tokens.map(
        (t: string): { to: string; value: bigint; data: string } => {
          let amount = MaxUint256;

          // @TODO make it work with eth
          const data = iface.encodeFunctionData("approve", [
            BACKEND_ADDRESS,
            amount,
          ]);
          return { to: t, data, value: BigInt(0) };
        },
      );
      await sendCallsViaWallet(chainId, calls);
      await sendPaymentToBackend({
        chainId,
        movements,
        account: account.account,
        type: TypeOfBatch.Recurring,
        scheduledAt: Date.now() + timeInterval * 1000 * 60,
        timeInterval: timeInterval * 1000 * 60,
      });
    }
    setMovements([]);
  }, [movements, typeOfBatch, timeInterval, account]);

  const handleAssetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedAsset(e.target.value);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  const handleDestinationChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDestination(e.target.value);
  };

  const handleChangeTime = (e: ChangeEvent<HTMLInputElement>) => {
    setTimeInterval(Number(e.target.value));
  };

  const addMovement = useCallback(() => {
    const movementsToSet = movements;
    movementsToSet.push({
      amount: Number(amount),
      destination,
      asset: assets.find((a) => a.symbol === selectedAsset)!,
    });
    setMovements(movementsToSet);
    setAmount("0");
    setDestination("");
  }, [amount, destination, assets, movements]);

  return (
    <>
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
        <div>
          <button
            onClick={addMovement}
            disabled={!amount || Number(amount) === 0 || !destination}
            className="btn btn-primary"
          >
            Add transfer
          </button>
        </div>
        <div className="btn-group" role="group" aria-label="Basic example">
          <button
            type="button"
            disabled={typeOfBatch === TypeOfBatch.Now}
            onClick={() => setTypeOfBatch(TypeOfBatch.Now)}
            className="btn btn-secondary"
          >
            Now
          </button>
          <button
            type="button"
            disabled={typeOfBatch === TypeOfBatch.Schedule}
            onClick={() => setTypeOfBatch(TypeOfBatch.Schedule)}
            className="btn btn-secondary"
          >
            Schedule
          </button>
          <button
            type="button"
            disabled={typeOfBatch === TypeOfBatch.Recurring}
            onClick={() => setTypeOfBatch(TypeOfBatch.Recurring)}
            className="btn btn-secondary"
          >
            Recurring
          </button>
        </div>

        {[TypeOfBatch.Recurring, TypeOfBatch.Schedule].includes(
          typeOfBatch,
        ) && (
          <div>
            <label>Time in minutes</label>
            <input
              onChange={handleChangeTime}
              className="form-control"
              type="number"
            />
          </div>
        )}
        <ul>
          {movements.map((m: Movement) => (
            <p key={m.amount.toString() + m.asset + m.destination}>
              Send {m.amount} {m.asset.symbol} to {m.destination}
            </p>
          ))}
        </ul>
        <button
          type="button"
          disabled={!movements.length}
          onClick={handleActionButton}
          className="btn btn-primary"
        >
          Execute
        </button>
      </form>
      <hr />
      <button
        type="button"
        onClick={simpleCsvExecute}
        className="btn btn-primary"
      >
        Execute now from CSV
      </button>
    </>
  );
}

export default CreatePayment;
