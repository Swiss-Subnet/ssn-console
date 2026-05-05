import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { Fragment, useState, type FC } from 'react';
import { TermsAndConditionsContent } from '@/routes/admin/terms-and-conditions-content';

export type TermsAndConditionsTableProps = {
  className?: string;
};

export const TermsAndConditionsTable: FC<TermsAndConditionsTableProps> = ({
  className,
}) => {
  const { termsAndConditionsHistory } = useAppStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!termsAndConditionsHistory || termsAndConditionsHistory.length === 0) {
    return (
      <p className={`text-muted-foreground ${className ?? ''}`}>
        No terms and conditions have been published yet.
      </p>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Effective from</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead>Created by</TableHead>
          <TableHead className="w-1" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {termsAndConditionsHistory.map(item => {
          const isExpanded = expandedId === item.id;
          return (
            <Fragment key={item.id}>
              <TableRow>
                <TableCell>{item.createdAt.toLocaleDateString()}</TableCell>
                <TableCell>{item.comment}</TableCell>
                <TableCell className="font-mono text-xs">
                  {item.createdBy}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    {isExpanded ? 'Hide' : 'View'}
                  </Button>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <TermsAndConditionsContent value={item.content} />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};
