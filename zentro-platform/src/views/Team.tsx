import { useState } from "react";
import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { canManageProjectMembers, canRemoveProjectMember } from "../lib/phaseDGuards";
import { backendCapabilityRequired, zentroApi, type ProjectMember } from "../lib/zentroApi";

export function Team() {
  const { apiContext, activeWorkspaceId, activeProjectId, bootstrap } = useAppSession();
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({ memberId: "", email: "", role: "viewer" });
  const [message, setMessage] = useState<string | null>(null);
  const roles = bootstrap?.roles ?? [];
  const canManage = canManageProjectMembers(roles);
  const workspaceMembers = useApiResource(
    () =>
      activeWorkspaceId
        ? zentroApi.workspace.members(activeWorkspaceId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/v1/workspaces/:workspaceId/members")),
    [activeWorkspaceId]
  );
  const projectMembers = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.projects.members(activeProjectId, apiContext)
        : Promise.resolve(backendCapabilityRequired<ProjectMember[]>("/v1/projects/:projectId/members")),
    [activeProjectId, apiContext.workspaceId, reloadKey]
  );

  async function addMember() {
    if (!canManage) {
      setMessage("Only owners and maintainers can manage project members.");
      return;
    }

    if (!activeProjectId) {
      setMessage("Select a project before adding members.");
      return;
    }

    const result = await zentroApi.projects.addMember(activeProjectId, { email: form.email, role: form.role }, apiContext);
    handleActionResult(result);
  }

  async function changeRole() {
    if (!canManage) {
      setMessage("Only owners and maintainers can manage project members.");
      return;
    }

    if (!activeProjectId || !form.memberId) {
      setMessage("Select a project and enter a member id.");
      return;
    }

    const result = await zentroApi.projects.updateMember(activeProjectId, form.memberId, { role: form.role }, apiContext);
    handleActionResult(result);
  }

  async function removeMember(members: ProjectMember[], memberId = form.memberId) {
    if (!canManage) {
      setMessage("Only owners and maintainers can manage project members.");
      return;
    }

    if (!activeProjectId || !memberId) {
      setMessage("Select a project and member before removing access.");
      return;
    }

    if (!canRemoveProjectMember(members, memberId)) {
      setMessage("The last project owner cannot be removed.");
      return;
    }

    const result = await zentroApi.projects.removeMember(activeProjectId, memberId, apiContext);
    handleActionResult(result);
  }

  function handleActionResult(result: { status: string; message?: string }) {
    if (result.status === "success") {
      setMessage("Project member action completed by backend.");
      setReloadKey((value) => value + 1);
      return;
    }

    setMessage(result.message ?? "Project member action failed.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Members and access"
        description="Workspace and project memberships from Phase D endpoints, with owner/maintainer controls and last-owner protection."
      />

      <Card>
        <div className="card-heading">
          <h2>Manage project member</h2>
          <span>POST/PATCH/DELETE /v1/projects/:projectId/members</span>
        </div>
        {!canManage ? <p className="empty-state">Owners and maintainers can manage project members. Other roles are read-only.</p> : null}
        <div className="form-grid">
          <label>Member id<input value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })} /></label>
          <label>Email<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="viewer">Viewer</option>
            <option value="developer">Developer</option>
            <option value="maintainer">Maintainer</option>
            <option value="owner">Owner</option>
          </select></label>
          <div className="inline-actions">
            <button className="primary-button" type="button" onClick={addMember}>Add</button>
            <button className="ghost-button" type="button" onClick={changeRole}>Change role</button>
          </div>
          {message ? <p className="muted-text">{message}</p> : null}
        </div>
      </Card>

      <div className="settings-grid">
        <BackendState resource={workspaceMembers}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Workspace members</h2>
                <span>GET /v1/workspaces/:workspaceId/members</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>

        <BackendState resource={projectMembers}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Project members</h2>
                <span>GET /v1/projects/:projectId/members</span>
              </div>
              {data.length ? (
                <div className="table-list">
                  {data.map((member, index) => (
                    <div className="table-row" key={member.id ?? index}>
                      <div><strong>{member.email ?? member.name ?? member.id ?? "Member"}</strong><span>{member.status ?? "Status not returned"}</span></div>
                      <span>{member.role ?? "Role not returned"}</span>
                      <span>{member.createdAt ?? "Created date not returned"}</span>
                      <button className="danger-button" type="button" onClick={() => void removeMember(data, member.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <ValueList value="No project members returned by backend." />
              )}
            </Card>
          )}
        </BackendState>
      </div>
    </>
  );
}
