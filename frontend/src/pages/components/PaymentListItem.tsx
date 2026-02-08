import { PaymentTemplate } from "@/contexts/BackendContext";
import { useEthereum } from "@/contexts/EthereumContext";
import { Interface } from "ethers";
import { parseUnits } from "ethers";
import { useCallback } from "react";
import {
  ArrowRepeat,
  FileEarmarkText,
  TerminalPlus,
} from "react-bootstrap-icons";
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

  const exportAsCsv = useCallback(() => {
    const contents =
      `Name,Chain id,User address,Scheduled at,Interval in seconds,Number of transfers
${template.name},${template.transfers[0].asset.chain_id},${template.user.ethereum_address},${template.scheduled_at},${template.recurring_interval},${template.transfers.length}
Amount,Destination,Asset id,Asset symbol,Asset decimals,Asset address,Asset chain id` +
      "\n" +
      template.transfers
        .map(
          (t) =>
            `${t.amount},${t.destination_user_address},${t.asset.id},${t.asset.symbol},${t.asset.decimals},${t.asset.contract_address},${t.asset.chain_id}`,
        )
        .join("\n");
    const blob = new Blob([contents], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template.name}-${template.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [template]);
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
            <div>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={onRepeat}
              >
                <ArrowRepeat />
              </button>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={exportAsCsv}
              >
                <FileEarmarkText />
              </button>
            </div>
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
