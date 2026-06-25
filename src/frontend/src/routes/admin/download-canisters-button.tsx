import { Button } from '@/components/ui/button';
import type { AdminCanisterRow } from '@/lib/store/admin-canisters';
import { showErrorToast } from '@/lib/toast';
import { Download } from 'lucide-react';
import { type FC } from 'react';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(rows: AdminCanisterRow[]): string {
  const lines = ['Canister Principal,Tracked,User ID,Email,Email Verified'];
  for (const r of rows) {
    lines.push(
      [
        escapeCsv(r.principal),
        r.tracked ? 'tracked' : 'untracked',
        escapeCsv(r.userId),
        escapeCsv(r.email ?? ''),
        r.tracked ? String(r.emailVerified) : '',
      ].join(','),
    );
  }
  return lines.join('\n');
}

export type DownloadCanistersButtonProps = {
  canisters: AdminCanisterRow[];
  className?: string;
};

export const DownloadCanistersButton: FC<DownloadCanistersButtonProps> = ({
  canisters,
  className,
}) => {
  const disabled = canisters.length === 0;

  function onClick(): void {
    try {
      const blob = new Blob([buildCsv(canisters)], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'canisters.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showErrorToast('Failed to build canister export', err);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      title={disabled ? 'No canisters to export.' : undefined}
      {...(className !== undefined ? { className } : {})}
      onClick={onClick}
    >
      <Download className="size-4" />
      Download CSV
    </Button>
  );
};
