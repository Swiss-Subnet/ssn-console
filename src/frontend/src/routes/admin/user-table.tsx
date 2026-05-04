import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserStatus, type UserProfile } from '@/lib/api-models';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { UserStatusBadge } from '@/routes/admin/user-status-badge';
import { UserStatusToggle } from '@/routes/admin/user-status-toggle';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useMemo, useState, type FC, type ReactNode } from 'react';
import { Link } from 'react-router';

export type UserTableProps = {
  className?: string;
};

type SortKey = 'id' | 'email' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | UserStatus;

const PAGE_SIZE = 20;

export const UserTable: FC<UserTableProps> = ({ className }) => {
  const { users, setUserStatus } = useAppStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!users) return [];
    const needle = search.trim().toLowerCase();
    return users.filter(user => {
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;
      if (!needle) return true;
      const haystack = [user.id, user.email ?? ''].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [users, search, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sortDirection === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  const pageIds = pageRows.map(u => u.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const someOnPageSelected =
    !allOnPageSelected && pageIds.some(id => selectedIds.has(id));

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  function toggleSelected(id: string): void {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function togglePageSelection(): void {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  }

  async function applyBulkStatus(status: UserStatus): Promise<void> {
    if (selectedIds.size === 0) return;
    setIsBulkSaving(true);
    try {
      const ids = [...selectedIds];
      await Promise.all(ids.map(id => setUserStatus(id, status)));
      setSelectedIds(new Set());
    } catch (err) {
      showErrorToast('Failed to update selected users', err);
    } finally {
      setIsBulkSaving(false);
    }
  }

  function resetToFirstPage(): void {
    setPage(0);
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by email or principal..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            resetToFirstPage();
          }}
          className="max-w-xs"
        />

        <div className="flex items-center gap-1">
          <StatusFilterButton
            current={statusFilter}
            value="all"
            onSelect={v => {
              setStatusFilter(v);
              resetToFirstPage();
            }}
          >
            All
          </StatusFilterButton>
          <StatusFilterButton
            current={statusFilter}
            value={UserStatus.Active}
            onSelect={v => {
              setStatusFilter(v);
              resetToFirstPage();
            }}
          >
            Active
          </StatusFilterButton>
          <StatusFilterButton
            current={statusFilter}
            value={UserStatus.Inactive}
            onSelect={v => {
              setStatusFilter(v);
              resetToFirstPage();
            }}
          >
            Inactive
          </StatusFilterButton>
        </div>

        <span className="text-muted-foreground ml-auto text-xs">
          {sorted.length} {sorted.length === 1 ? 'user' : 'users'}
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
          <span className="text-xs font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isBulkSaving}
            onClick={() => applyBulkStatus(UserStatus.Active)}
          >
            Activate
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isBulkSaving}
            onClick={() => applyBulkStatus(UserStatus.Inactive)}
          >
            Deactivate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isBulkSaving}
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                aria-label="Select all on page"
                checked={allOnPageSelected}
                indeterminate={someOnPageSelected}
                onCheckedChange={togglePageSelection}
                disabled={pageIds.length === 0}
              />
            </TableHead>

            <SortableHead
              active={sortKey === 'id'}
              direction={sortDirection}
              onClick={() => toggleSort('id')}
            >
              Principal
            </SortableHead>

            <SortableHead
              active={sortKey === 'email'}
              direction={sortDirection}
              onClick={() => toggleSort('email')}
            >
              Email
            </SortableHead>

            <SortableHead
              active={sortKey === 'status'}
              direction={sortDirection}
              onClick={() => toggleSort('status')}
            >
              Status
            </SortableHead>

            <TableHead></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground text-center"
              >
                No users match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map(user => (
              <TableRow
                key={user.id}
                data-state={selectedIds.has(user.id) ? 'selected' : undefined}
              >
                <TableCell>
                  <Checkbox
                    aria-label={`Select user ${user.id}`}
                    checked={selectedIds.has(user.id)}
                    onCheckedChange={() => toggleSelected(user.id)}
                  />
                </TableCell>

                <TableCell className="font-mono">
                  <Link
                    to={`/admin/users/${user.id}`}
                    className="hover:underline"
                  >
                    {user.id}
                  </Link>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{user.email ?? 'None provided'}</span>
                    {user.email && (
                      <Badge
                        variant={user.emailVerified ? 'success' : 'secondary'}
                      >
                        {user.emailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <UserStatusBadge user={user} />
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/admin/users/${user.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    <UserStatusToggle user={user} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-muted-foreground text-xs">
            Page {safePage + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={safePage === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
};

function sortValue(user: UserProfile, key: SortKey): string {
  switch (key) {
    case 'id':
      return user.id;
    case 'email':
      return user.email?.toLowerCase() ?? '';
    case 'status':
      return user.status;
  }
}

type StatusFilterButtonProps = {
  current: StatusFilter;
  value: StatusFilter;
  onSelect: (v: StatusFilter) => void;
  children: ReactNode;
};

const StatusFilterButton: FC<StatusFilterButtonProps> = ({
  current,
  value,
  onSelect,
  children,
}) => (
  <Button
    variant={current === value ? 'secondary' : 'ghost'}
    size="sm"
    onClick={() => onSelect(value)}
  >
    {children}
  </Button>
);

type SortableHeadProps = {
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  children: ReactNode;
};

const SortableHead: FC<SortableHeadProps> = ({
  active,
  direction,
  onClick,
  children,
}) => (
  <TableHead>
    <button
      type="button"
      onClick={onClick}
      className="hover:text-foreground inline-flex items-center gap-1 font-medium"
    >
      {children}
      {active ? (
        direction === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="text-muted-foreground/60 size-3" />
      )}
    </button>
  </TableHead>
);
