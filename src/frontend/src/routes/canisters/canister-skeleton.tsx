import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemSeparator,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type FC } from 'react';

export type CanisterSkeletonProps = {
  className?: string;
};

export const CanisterSkeleton: FC<CanisterSkeletonProps> = ({ className }) => {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>Canister</CardTitle>
        <Skeleton className="mt-1 h-4 w-1/6" />
      </CardHeader>
      <CardContent>
        <CardTitle>Controllers</CardTitle>

        <ItemGroup className="mt-3">
          <ItemSeparator />
          <Item>
            <ItemContent>
              <Skeleton className="h-4 w-1/3" />
            </ItemContent>
          </Item>

          <ItemSeparator />
          <Item>
            <ItemContent>
              <Skeleton className="h-4 w-1/3" />
            </ItemContent>
          </Item>

          <ItemSeparator />
        </ItemGroup>
      </CardContent>

      <CardFooter>
        <div className="flex w-full flex-col">
          <div className="w-full">Controller Principal</div>
          <div className="mt-1 flex w-full flex-row gap-2">
            <Skeleton className="h-5 w-7/8" />
            <Skeleton className="h-5 w-1/8" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
