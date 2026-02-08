import { useBackend } from "@/contexts/BackendContext";
import PaymentListItem from "./components/PaymentListItem";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function History() {
  const { isLoadingTemplates, templates, user } = useBackend();
  const navigate = useNavigate();
  useEffect(() => {
    if (user.status === "not_authenticated") navigate("/");
  }, [user.status]);
  return (
    <div className="container">
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
  );
}

export default History;
