import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
} from '@/components/ui/item';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { AddControllerForm } from '@/routes/canisters/add-controller-form';
import { Fragment, type FC } from 'react';

export type CanisterGridProps = {
  className?: string;
};

export const CanisterGrid: FC<CanisterGridProps> = ({ className }) => {
  const { canisters } = useAppStore();

  return (
    <div className={cn('grid grid-cols-1 gap-4', className)}>
      {canisters?.map(canister => (
        <Card key={canister.id}>
          <CardHeader>
            <CardTitle>Canister</CardTitle>
            <CardDescription>{canister.principal}</CardDescription>
          </CardHeader>

          <CardContent>
            <CardTitle>Controllers</CardTitle>

            <ItemGroup className="mt-3">
              <ItemSeparator />
              {canister.status?.settings.controllers.map(
                (controller, i, controllers) => (
                  <Fragment key={controller}>
                    <Item>
                      <ItemContent>
                        <ItemDescription>{controller}</ItemDescription>
                      </ItemContent>
                    </Item>

                    {i !== controllers.length - 1 && <ItemSeparator />}
                  </Fragment>
                ),
              )}
              <ItemSeparator />
            </ItemGroup>
          </CardContent>

          <CardFooter className="flex justify-center">
            <AddControllerForm canisterId={canister.principal} />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
