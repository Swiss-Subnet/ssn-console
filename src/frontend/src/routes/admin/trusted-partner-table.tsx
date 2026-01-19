import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import type { FC } from 'react';

export type TrustedPartnerTableProps = {
  className?: string;
};

export const TrustedPartnerTable: FC<TrustedPartnerTableProps> = ({
  className,
}) => {
  const { trustedPartners } = useAppStore();

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1">#</TableHead>

          <TableHead>Name</TableHead>

          <TableHead>Principal</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {trustedPartners?.map(partner => (
          <TableRow key={partner.id}>
            <TableCell>{partner.id}</TableCell>

            <TableCell>{partner.name}</TableCell>

            <TableCell>{partner.principal}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
