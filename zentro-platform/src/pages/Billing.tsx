import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { billingPlans, invoices, organization } from "../data/mockData";

export function Billing() {
  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Plans and invoices"
        description="Compare Zentro plans, review the current subscription, and preview invoice history."
      />

      <div className="plans-grid">
        {billingPlans.map((plan) => {
          const isCurrent = plan.name === organization.currentPlan;

          return (
            <Card className={isCurrent ? "plan-card current" : "plan-card"} key={plan.name}>
              <div className="plan-topline">
                <h2>{plan.name}</h2>
                {isCurrent ? <Badge tone="success">Current plan</Badge> : null}
              </div>
              <strong>{plan.price}</strong>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button className={isCurrent ? "ghost-button" : "primary-button"} type="button">
                {isCurrent ? "Manage plan" : "Upgrade"}
              </button>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="card-heading">
          <h2>Invoices</h2>
          <span>Placeholder export controls</span>
        </div>
        <div className="table-list">
          {invoices.map((invoice) => (
            <div className="table-row" key={invoice.id}>
              <strong>{invoice.id}</strong>
              <span>{invoice.date}</span>
              <span>{invoice.amount}</span>
              <Badge tone="success">{invoice.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
