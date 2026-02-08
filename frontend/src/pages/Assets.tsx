import { useBackend } from "@/contexts/BackendContext";
import { Coin, BoxArrowUpRight } from "react-bootstrap-icons";

interface Asset {
  id: number;
  created_at: string;
  symbol: string;
  name: string;
  decimals: number;
  contract_address: string;
  chain_id: number;
}

const explorerUrl = (chainId: number, address: string) => {
  const map: Record<number, string> = {
    1: "https://etherscan.io/token/",
    56: "https://bscscan.com/token/",
    137: "https://polygonscan.com/token/",
    10: "https://optimistic.etherscan.io/token/",
    8453: "https://basescan.org/token/",
  };
  return map[chainId] ? map[chainId] + address : "#";
};

export function Assets() {
  const { assets } = useBackend();
  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          {assets.map((a) => (
            <div key={a.id} className="card mb-4 shadow-sm">
              <div className="card-body">
                <h5 className="card-title">
                  <Coin className="me-2" />
                  {a.symbol} — {a.name}
                </h5>

                <ul className="list-unstyled mb-3">
                  <li>
                    <strong>Decimals:</strong> {a.decimals}
                  </li>
                  <li>
                    <strong>Chain ID:</strong> {a.chain_id}
                  </li>
                  <li className="text-break">
                    <strong>Contract:</strong> {a.contract_address}
                  </li>
                </ul>

                <a
                  href={explorerUrl(a.chain_id, a.contract_address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-primary"
                >
                  View on Explorer <BoxArrowUpRight className="ms-1" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Assets;
