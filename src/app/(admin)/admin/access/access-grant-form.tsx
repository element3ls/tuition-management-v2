"use client";

import { useMemo, useState } from "react";
import { createAccessGrantAction } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/admin/admin-ui";
import type { AppData, GranteeType, PermissionLevel, ResourceType } from "@/types/domain";

type Option = {
  id: string;
  label: string;
};

const resourceTypes: Array<{ value: ResourceType; label: string }> = [
  { value: "year", label: "Year" },
  { value: "subject", label: "Subject" },
  { value: "chapter", label: "Chapter" },
  { value: "question", label: "Question" },
  { value: "recording", label: "Recording" },
  { value: "solution_material", label: "Solution material" }
];

export function AccessGrantForm({ data }: { data: AppData }) {
  const [granteeType, setGranteeType] = useState<GranteeType>("group");
  const [resourceType, setResourceType] = useState<ResourceType>("year");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionLevel[]>(["view"]);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const granteeOptions = useMemo<Option[]>(() => {
    if (granteeType === "group") {
      return data.groups.map((group) => ({ id: group.id, label: group.name }));
    }

    return data.studentProfiles.map((student) => {
      const profile = data.profiles.find((item) => item.id === student.user_id);
      return { id: student.user_id, label: profile?.full_name ?? student.user_id };
    });
  }, [data.groups, data.profiles, data.studentProfiles, granteeType]);

  const resourceOptions = useMemo<Option[]>(() => {
    if (resourceType === "year") return data.years.map((year) => ({ id: year.id, label: year.name }));
    if (resourceType === "subject") return data.subjects.map((subject) => ({ id: subject.id, label: subject.name }));
    if (resourceType === "chapter") return data.chapters.map((chapter) => ({ id: chapter.id, label: chapter.title }));
    if (resourceType === "question") return data.questions.map((question) => ({ id: question.id, label: question.title }));
    if (resourceType === "recording") return data.recordings.map((recording) => ({ id: recording.id, label: recording.title }));
    return data.solutionMaterials.map((material) => ({ id: material.id, label: material.title }));
  }, [data.chapters, data.questions, data.recordings, data.solutionMaterials, data.subjects, data.years, resourceType]);

  const togglePermission = (permission: PermissionLevel) => {
    setPermissionError(null);
    setSelectedPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  };

  return (
    <form
      action={createAccessGrantAction}
      className="grid gap-3"
      data-mutation-form
      onSubmit={(event) => {
        if (selectedPermissions.length > 0) return;
        event.preventDefault();
        setPermissionError("Select at least one permission.");
      }}
    >
      <Field label="Grantee type">
        <Select name="grantee_type" value={granteeType} onChange={(event) => setGranteeType(event.target.value as GranteeType)}>
          <option value="group">Group</option>
          <option value="user">Student</option>
        </Select>
      </Field>
      <Field label="Grantee">
        <Select name="grantee_id" required>
          {granteeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {granteeType === "group" ? "Group" : "Student"}: {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Resource type">
        <Select name="resource_type" value={resourceType} onChange={(event) => setResourceType(event.target.value as ResourceType)}>
          {resourceTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Resource">
        <Select name="resource_id" required>
          {resourceOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-1.5 text-sm font-medium text-foreground">
        <span>Permissions</span>
        <div className="grid gap-2 rounded-md border border-border/70 bg-background/60 p-3">
          {(["view", "download"] satisfies PermissionLevel[]).map((permission) => (
            <label key={permission} className="flex items-center gap-2 text-sm font-medium capitalize text-foreground">
              <input
                name="permission"
                type="checkbox"
                value={permission}
                checked={selectedPermissions.includes(permission)}
                onChange={() => togglePermission(permission)}
                className="size-4 accent-primary"
              />
              {permission}
            </label>
          ))}
        </div>
        {permissionError ? <p className="text-xs font-normal text-destructive">{permissionError}</p> : null}
      </div>
      <Field label="Starts at">
        <Input name="starts_at" type="datetime-local" required />
      </Field>
      <Field label="Expires at">
        <Input name="expires_at" type="datetime-local" required />
      </Field>
      <Button type="submit">Create grant</Button>
    </form>
  );
}
