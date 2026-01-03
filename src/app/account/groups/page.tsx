"use client";

import { Button } from "@/components/ui/button";
import { Plus, Users, Edit2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
interface Group {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
}

export default function Groups() {
  const [ownedGroups, setOwnedGroups] = useState<Group[]>([]);
  const [sharedGroups, setSharedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [memberEmails, setMemberEmails] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const user = useAuth();

  const formatDate = (value: any) => {
    if (!value) return "—";
    if (value?.seconds) {
      return new Date(value.seconds * 1000).toISOString().split("T")[0];
    }
    try {
      return new Date(value).toISOString().split("T")[0];
    } catch (e) {
      return "—";
    }
  };

  useEffect(() => {
    if (user.isLoading || !user.userId) return;
    const fetchGroups = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/group`);
        if (!res.ok) {
          throw new Error("Unable to load groups");
        }
        const data = await res.json();
        const mapGroup = (g: any): Group => ({
          id: String(g.groupID ?? g.id),
          name: g.groupName ?? "Unnamed group",
          members: g.sharedMembersEmail ?? [],
          createdAt: formatDate(g.create_at),
        });
        const owned: Group[] =
          data?.ownedGroups?.map(mapGroup) ??
          data?.groups?.map(mapGroup) ?? // backward compatibility
          [];
        const shared: Group[] = data?.sharedGroups?.map(mapGroup) ?? [];

        setOwnedGroups(owned);
        setSharedGroups(shared);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch groups");
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [user]);

  const handleSubmit = async () => {
    if (!user.userId) {
      setError("You must be signed in to manage groups.");
      return;
    }
    if (!newGroupName.trim() && !editingId) {
      setError("Group name is required.");
      return;
    }
    const members = memberEmails
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.includes("@"));

    if (!members.length) {
      setError("Please add at least one valid email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const isEditing = Boolean(editingId);
      const payload = isEditing
        ? {
            userID: Number(user.userId),
            groupID: Number(editingId),
            Member_Emails: members.join(","),
          }
        : {
            ownerID: Number(user.userId),
            groupName: newGroupName,
            Member_Emails: members.join(","),
          };

      const res = await fetch(`/api/group/${isEditing ? "update_members" : "create"}`, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.message || "Request failed");
      }

      setSuccess(isEditing ? "Group updated." : "Group created.");
      setEditingId(null);
      setNewGroupName("");
      setMemberEmails("");
      setShowCreateForm(false);

      const refresh = await fetch(`/api/group?userId=${user.userId}`);
      if (refresh.ok) {
        const data = await refresh.json();
        const mapGroup = (g: any): Group => ({
          id: String(g.groupID ?? g.id),
          name: g.groupName ?? "Unnamed group",
          members: g.sharedMembersEmail ?? [],
          createdAt: formatDate(g.create_at),
        });
        setOwnedGroups(
          (data?.ownedGroups ?? data?.groups ?? []).map(mapGroup)
        );
        setSharedGroups((data?.sharedGroups ?? []).map(mapGroup));
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingId(group.id);
    setNewGroupName(group.name);
    setMemberEmails(group.members.join(", "));
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setNewGroupName("");
    setMemberEmails("");
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!user.userId) {
      setError("You must be signed in to manage groups.");
      return;
    }
    setDeletingId(groupId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/group/delete?groupID=${groupId}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Failed to delete group");
      }
      setSuccess(body?.message || "Group deleted.");
      setOwnedGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err: any) {
      setError(err?.message || "Failed to delete group.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Groups</h1>
              <p className="text-slate-600">
                Manage team groups and share bots with members .
              </p>
            </div>
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Group
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Create/Edit Form */}
          {showCreateForm && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                {editingId ? "Edit Group" : "Create New Group"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Sales Team"
                    disabled={Boolean(editingId)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  {editingId && (
                    <p className="text-xs text-slate-500 mt-1">
                      Group name cannot be changed after creation.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Member Emails (comma separated) *
                  </label>
                  <textarea
                    value={memberEmails}
                    onChange={(e) => setMemberEmails(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter valid email addresses separated by commas
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : editingId
                        ? "Update Group"
                        : "Create Group"}
                  </Button>
                  <Button onClick={handleCancel} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Groups List */}
          {loading ? (
            <div className="text-center py-16 text-slate-600">Loading groups...</div>
          ) : (
            <div className="space-y-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-semibold text-slate-900">Owned by you</h3>
                  <span className="text-sm text-slate-500">
                    {ownedGroups.length} group{ownedGroups.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {ownedGroups.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ownedGroups.map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        onEdit={() => handleEditGroup(group)}
                        onDelete={() => setConfirmDeleteId(group.id)}
                        isDeleting={deletingId === group.id}
                        canEdit
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No owned groups yet"
                    cta="Create Your First Group"
                    onClick={() => setShowCreateForm(true)}
                  />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-semibold text-slate-900">Shared with you</h3>
                  <span className="text-sm text-slate-500">
                    {sharedGroups.length} group{sharedGroups.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {sharedGroups.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sharedGroups.map((group) => (
                      <GroupCard key={group.id} group={group} canEdit={false} />
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm">No groups shared with you yet.</div>
                )}
              </div>
            </div>
          )}

          {/* Confirm delete modal */}
          <AlertDialog
            open={Boolean(confirmDeleteId)}
            onOpenChange={(open) => {
              if (!open) setConfirmDeleteId(null);
            }}
          >
            <AlertDialogContent className="max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete group</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{ownedGroups.find((g) => g.id === confirmDeleteId)?.name || "this group"}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className=" bg-red-600 text-red-50 hover:bg-red-800"
                  onClick={() => {
                    const id = confirmDeleteId;
                    setConfirmDeleteId(null);
                    if (id) {
                      handleDeleteGroup(id);
                    }
                  }}
                >
                  Delete group
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
  );
}

function GroupCard({
  group,
  onEdit,
  onDelete,
  isDeleting,
  canEdit,
}: {
  group: Group;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  canEdit?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
          <Users className="w-6 h-6 text-purple-600" />
        </div>
        <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          {group.members.length} member{group.members.length !== 1 ? "s" : ""}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-3">
        {group.name}
      </h3>

      <div className="bg-slate-50 rounded-lg p-3 mb-6 max-h-32 overflow-y-auto">
        <p className="text-xs text-slate-600 font-semibold mb-2 uppercase">
          Members
        </p>
        <div className="space-y-1">
          {group.members.map((email, idx) => (
            <p
              key={idx}
              className="text-xs text-slate-700 truncate hover:text-clip"
              title={email}
            >
              {email}
            </p>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">Created {group.createdAt}</p>
      <div className="flex gap-2 items-center">
        <button
          onClick={canEdit ? onEdit : undefined}
          disabled={!canEdit}
          className={`flex-1 px-3 py-2 rounded-lg border ${
            canEdit
              ? "border-slate-300 hover:bg-slate-50 text-slate-700"
              : "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
          } font-medium text-sm transition-colors flex items-center justify-center gap-2`}
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        <button
          title="Delete Group"
          onClick={onDelete}
          disabled={!canEdit || isDeleting}
          className={`p-2 rounded-lg border ${
            !canEdit
              ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
              : isDeleting
                ? "border-red-300 bg-red-100 text-red-500"
                : "border-red-300 bg-red-50 text-red-400 hover:bg-red-200 hover:text-red-600 "
          } transition-colors flex items-center justify-center`}
          
        >
          <Trash2 className={`w-4 h-4 ${isDeleting ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  cta,
  onClick,
}: {
  title: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg">
      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-slate-900 mb-2">{title}</h2>
      <Button
        onClick={onClick}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
      >
        <Plus className="w-4 h-4 mr-2" />
        {cta}
      </Button>
    </div>
  );
}
