import { useBackend } from "@/contexts/BackendContext";
import PaymentListItem from "./components/PaymentListItem";

export function History() {
  const { isLoadingTemplates, templates } = useBackend();
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
