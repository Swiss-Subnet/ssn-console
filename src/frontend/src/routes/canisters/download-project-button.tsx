import { Button } from '@/components/ui/button';
import {
  buildProjectZip,
  slugifyProjectName,
} from '@/lib/project-export/build-zip';
import { showErrorToast } from '@/lib/toast';
import type { Canister } from '@/lib/api-models/canister';
import { Download } from 'lucide-react';
import type { FC } from 'react';

export type DownloadProjectButtonProps = {
  projectId: string;
  projectName: string;
  canisters: Canister[];
  className?: string;
};

export const DownloadProjectButton: FC<DownloadProjectButtonProps> = ({
  projectId,
  projectName,
  canisters,
  className,
}) => {
  const disabled = canisters.length === 0;

  function onClick(): void {
    try {
      const bytes = buildProjectZip({ projectName, canisters });
      const blob = new Blob([new Uint8Array(bytes)], {
        type: 'application/zip',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugifyProjectName(projectName)}-${projectId.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showErrorToast('Failed to build project export', err);
    }
  }

  return (
    <Button
      variant="outline"
      disabled={disabled}
      title={disabled ? 'No canisters to export.' : undefined}
      {...(className !== undefined ? { className } : {})}
      onClick={onClick}
    >
      <Download className="size-4" />
      Download project
    </Button>
  );
};
