import { Outlet } from "react-router-dom";
import { DeveloperNav } from "../../components/developer/DeveloperNav";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";

export function DeveloperLayout() {
  return (
    <>
      <PageHeader
        eyebrow="Developer"
        title="Developer documentation"
        description="Guides and an interactive playground for ZENTRO-OWN-API-V2. Live metadata endpoints power models and route availability; documentation stays readable when optional probes fail."
      />
      <div className="docs-layout developer-layout">
        <Card>
          <h2>Guides</h2>
          <DeveloperNav />
        </Card>
        <div className="developer-content">
          <Outlet />
        </div>
      </div>
    </>
  );
}
