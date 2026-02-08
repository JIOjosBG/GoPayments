import { PaymentTemplate } from "@/contexts/BackendContext";
import { useEthereum } from "@/contexts/EthereumContext";
import { Interface } from "ethers";
import { parseUnits } from "ethers";
import { useCallback } from "react";
import { ArrowRepeat } from "react-bootstrap-icons";

const iface = new Interface(["function transfer(address,uint)"]);

function PaymentListItem({ template }: { template: PaymentTemplate }) {
  const { sendCallsViaWallet } = useEthereum();

  const onRepeat = useCallback(() => {
    const chainId: number = template.transfers
      .map((t) => t.asset.chain_id)
      .reduce((c1, c2) => (c1 === c2 ? c1 : 0));
    if (!chainId) return console.log("Err");

    const calls = template.transfers.map(
      (t): { to: string; value: bigint; data: string } => {
        let amount: bigint = parseUnits(t.amount?.toString(), t.asset.decimals);

        if (
          t.asset.contract_address.toLowerCase() ===
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        ) {
          return { to: t.destination_user_address, value: amount, data: "0x" };
        } else {
          const data = iface.encodeFunctionData("transfer", [
            t.destination_user_address,
            amount,
          ]);
          return { to: t.asset.contract_address, data, value: BigInt(0) };
        }
      },
    );
    sendCallsViaWallet(chainId, calls);
  }, [template.transfers, sendCallsViaWallet]);
  return (
    <div className="container my-2">
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              {template.name}{" "}
              <span
                className={`badge ${
                  template.is_cancelled ? "bg-danger" : "bg-success"
                }`}
              >
                {template.is_cancelled ? "Cancelled" : "Active"}
              </span>
            </h6>

            <button
              className="btn btn-outline-primary btn-sm"
              onClick={onRepeat}
            >
              <ArrowRepeat />
            </button>
          </div>

          {template.transfers?.length > 0 && (
            <ul className="list-group list-group-flush mt-3">
              {template.transfers.map((transfer, index) => (
                <li key={index} className="list-group-item small">
                  <strong>To:</strong>{" "}
                  {transfer.destination_user_address || "N/A"} |{" "}
                  {transfer.amount} {transfer.asset?.symbol || "N/A"}{" "}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentListItem;
