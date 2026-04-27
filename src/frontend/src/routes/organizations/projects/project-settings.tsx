import { ApprovalPolicyEditor } from '@/components/approval-policy-editor';
import { LoadingButton } from '@/components/loading-button';
import { Container } from '@/components/layout/container';
import {
  PermissionsEditor,
  projectPermissionFields,
} from '@/components/permissions-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppStore, selectProjectMap } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import {
  APPROVAL_OPERATION_TYPES,
  ApprovalOperationType,
  DEFAULT_APPROVAL_POLICY_TYPE,
  type ApprovalPolicy,
  type ApprovalPolicyType,
  type OrgTeam,
  type ProjectPermissions,
  type ProjectTeam,
} from '@/lib/api-models';
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { isNil } from '@/lib/nil';
import { z } from 'zod';

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Project name cannot exceed 100 characters'),
});

type FormData = z.infer<typeof formSchema>;

const ProjectSettings: FC = () => {
  const { orgId, projectId } = useParams();
  const navigate = useNavigate();
  const {
    updateProject,
    deleteProject,
    loadOrgTeams,
    loadProjectTeams,
    addTeamToProject,
    removeTeamFromProject,
    updateTeamProjectPermissions,
    loadProjectApprovalPolicies,
    upsertApprovalPolicy,
  } = useAppStore();
  const projectMap = useAppStore(selectProjectMap);

  const project = useMemo(
    () => (projectId ? projectMap.get(projectId) : undefined),
    [projectId, projectMap],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const [orgTeams, setOrgTeams] = useState<OrgTeam[]>([]);
  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approvalPolicies, setApprovalPolicies] = useState<ApprovalPolicy[]>(
    [],
  );

  const refreshOrgTeams = useCallback(async () => {
    if (!orgId) return;
    try {
      setOrgTeams(await loadOrgTeams(orgId));
    } catch (err) {
      showErrorToast('Failed to load org teams', err);
    }
  }, [orgId, loadOrgTeams]);

  const refreshProjectTeams = useCallback(async () => {
    if (!projectId) return;
    try {
      setProjectTeams(await loadProjectTeams(projectId));
    } catch (err) {
      showErrorToast('Failed to load project teams', err);
    }
  }, [projectId, loadProjectTeams]);

  const refreshApprovalPolicies = useCallback(async () => {
    if (!projectId) return;
    try {
      setApprovalPolicies(await loadProjectApprovalPolicies(projectId));
    } catch (err) {
      showErrorToast('Failed to load approval policies', err);
    }
  }, [projectId, loadProjectApprovalPolicies]);

  const projectTeamIds = useMemo(
    () => new Set(projectTeams.map(t => t.id)),
    [projectTeams],
  );
  const addableOrgTeams = useMemo(
    () => orgTeams.filter(t => !projectTeamIds.has(t.id)),
    [orgTeams, projectTeamIds],
  );

  useEffect(() => {
    if (project) {
      form.reset({ name: project.name });
    }
  }, [project, form]);

  useEffect(() => {
    refreshOrgTeams();
    refreshProjectTeams();
  }, [refreshOrgTeams, refreshProjectTeams]);

  const canManageApprovalPolicy =
    !!project?.yourPermissions.approvalPolicyManage;

  useEffect(() => {
    if (canManageApprovalPolicy) {
      refreshApprovalPolicies();
    }
  }, [canManageApprovalPolicy, refreshApprovalPolicies]);

  const approvalPolicyMap = useMemo(() => {
    const map = new Map<ApprovalOperationType, ApprovalPolicy>();
    for (const policy of approvalPolicies) {
      map.set(policy.operationType, policy);
    }
    return map;
  }, [approvalPolicies]);

  if (isNil(orgId) || isNil(projectId) || isNil(project)) {
    return (
      <Container>
        <p className="text-muted-foreground">Project not found.</p>
      </Container>
    );
  }

  const canEditSettings = project.yourPermissions.projectSettings;
  const canProjectAdmin = project.yourPermissions.projectAdmin;

  async function onSubmit(formData: FormData): Promise<void> {
    try {
      await updateProject(projectId!, formData.name);
      showSuccessToast('Project updated successfully!');
    } catch (err) {
      showErrorToast('Failed to update project', err);
    }
  }

  async function onAddTeam(): Promise<void> {
    if (!selectedTeamId) return;
    setIsAdding(true);
    try {
      await addTeamToProject(projectId!, selectedTeamId);
      showSuccessToast('Team added to project');
      setSelectedTeamId('');
      await refreshProjectTeams();
    } catch (err) {
      showErrorToast('Failed to add team', err);
    } finally {
      setIsAdding(false);
    }
  }

  async function onSaveTeamPermissions(
    teamId: string,
    permissions: ProjectPermissions,
  ): Promise<void> {
    const updated = await updateTeamProjectPermissions(
      projectId!,
      teamId,
      permissions,
    );
    setProjectTeams(prev => prev.map(t => (t.id === teamId ? updated : t)));
    showSuccessToast('Permissions updated');
  }

  async function onRemoveTeam(teamId: string): Promise<void> {
    setRemovingTeamId(teamId);
    try {
      await removeTeamFromProject(projectId!, teamId);
      showSuccessToast('Team removed from project');
      await refreshProjectTeams();
    } catch (err) {
      showErrorToast('Failed to remove team', err);
    } finally {
      setRemovingTeamId(null);
    }
  }

  async function onSaveApprovalPolicy(
    operationType: ApprovalOperationType,
    policyType: ApprovalPolicyType,
  ): Promise<ApprovalPolicy> {
    const updated = await upsertApprovalPolicy({
      projectId: projectId!,
      operationType,
      policyType,
    });
    setApprovalPolicies(prev => {
      const others = prev.filter(p => p.operationType !== operationType);
      return [...others, updated];
    });
    showSuccessToast('Approval policy updated');
    return updated;
  }

  async function onDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await deleteProject(projectId!);
      showSuccessToast('Project deleted successfully!');
      navigate(`/organizations/${orgId}/settings`);
    } catch (err) {
      showErrorToast('Failed to delete project', err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Container>
      <div className="space-y-6">
        <div className="mx-auto max-w-2xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(`/organizations/${orgId}/settings`, { replace: true })
            }
          >
            <ArrowLeft className="mr-1 size-3.5" />
            Back
          </Button>
        </div>

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Project Settings</CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                className="space-y-8"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>

                      <FormControl>
                        <Input {...field} disabled={!canEditSettings} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <LoadingButton
                  type="submit"
                  className="w-full"
                  isLoading={form.formState.isSubmitting}
                  disabled={!form.formState.isDirty || !canEditSettings}
                >
                  Save Changes
                </LoadingButton>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {projectTeams.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No teams attached yet.
              </p>
            ) : (
              <div className="space-y-6">
                {projectTeams.map((t, idx) => (
                  <div key={t.id} className="space-y-4">
                    {idx > 0 && <Separator />}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{t.name}</p>
                      {canProjectAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removingTeamId === t.id}
                          onClick={() => onRemoveTeam(t.id)}
                          aria-label={`Remove ${t.name}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <PermissionsEditor
                      value={t.permissions}
                      fields={projectPermissionFields}
                      disabled={!canProjectAdmin}
                      errorToastTitle="Failed to update permissions"
                      onSave={next => onSaveTeamPermissions(t.id, next)}
                    />
                  </div>
                ))}
              </div>
            )}

            {canProjectAdmin && (
              <>
                <Separator />

                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Attach an existing team to this project.
                  </p>

                  {addableOrgTeams.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">
                      All teams in this organization are already attached.
                    </p>
                  ) : (
                    <>
                      <select
                        className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                        value={selectedTeamId}
                        onChange={e => setSelectedTeamId(e.target.value)}
                      >
                        <option value="">Select a team...</option>
                        {addableOrgTeams.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>

                      <LoadingButton
                        isLoading={isAdding}
                        disabled={!selectedTeamId}
                        onClick={onAddTeam}
                      >
                        Add Team
                      </LoadingButton>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {canManageApprovalPolicy && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>Approval Policies</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-sm">
                Choose how proposals are approved for each operation. Operations
                without an explicit policy auto-approve by default.
              </p>

              {APPROVAL_OPERATION_TYPES.map((op, idx) => {
                const current =
                  approvalPolicyMap.get(op)?.policyType ??
                  DEFAULT_APPROVAL_POLICY_TYPE;
                return (
                  <div key={op} className="space-y-4">
                    {idx > 0 && <Separator />}
                    <ApprovalPolicyEditor
                      operationType={op}
                      value={current}
                      onSave={next => onSaveApprovalPolicy(op, next)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {canProjectAdmin && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                Delete this project. All canisters must be removed first.
              </p>

              <LoadingButton
                variant="destructive"
                isLoading={isDeleting}
                onClick={onDelete}
              >
                Delete Project
              </LoadingButton>
            </CardContent>
          </Card>
        )}
      </div>
    </Container>
  );
};

export default ProjectSettings;
