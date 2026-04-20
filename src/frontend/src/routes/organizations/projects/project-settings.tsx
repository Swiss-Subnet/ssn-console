import { LoadingButton } from '@/components/loading-button';
import { Container } from '@/components/layout/container';
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
import type { OrgTeam, ProjectTeam } from '@/lib/api-models';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
        <div className="mx-auto max-w-md">
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

        <Card className="mx-auto max-w-md">
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

        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {projectTeams.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No teams attached yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectTeams.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

        {canProjectAdmin && (
          <Card className="mx-auto max-w-md">
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
