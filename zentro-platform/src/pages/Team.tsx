import { MailPlus } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { teamMembers, type MemberRole } from "../data/mockData";

const roleTone: Record<MemberRole, "success" | "info" | "warning" | "neutral"> = {
  owner: "success",
  admin: "info",
  developer: "warning",
  viewer: "neutral",
};

export function Team() {
  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Team members"
        description="Manage access for owners, admins, developers, and viewers in your Zentro workspace."
        actions={
          <button className="primary-button" type="button">
            <MailPlus size={16} />
            Invite member
          </button>
        }
      />

      <Card className="success-card">
        <div>
          <span className="eyebrow">Invite placeholder</span>
          <h2>Invite flow coming later</h2>
          <p>Backend email delivery, invite tokens, and role updates will connect here.</p>
        </div>
      </Card>

      <Card>
        <div className="card-heading">
          <h2>Members</h2>
          <span>{teamMembers.length} seats</span>
        </div>
        <div className="table-list">
          {teamMembers.map((member) => (
            <div className="table-row" key={member.email}>
              <div>
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>
              <Badge tone={roleTone[member.role]}>{member.role}</Badge>
              <span>{member.status}</span>
              <button className="ghost-button" type="button">
                Manage
              </button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
