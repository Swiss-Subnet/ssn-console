import { Fragment, useMemo, type FC } from 'react';
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
import { AddControllerForm } from '@/routes/canisters/add-controller-form';
import { BACKEND_CANISTER_ID } from '@/env';
import { AddMissingCanisterControllerCta } from '@/routes/canisters/add-missing-canister-controller-cta';
import { isNotNil } from '@/lib/nil';
import type { Canister } from '@/lib/api-models';

export type CanisterGridEntryProps = {
  canister: Canister;
};

export const CanisterGridEntry: FC<CanisterGridEntryProps> = ({ canister }) => {
  const isMissingController = useMemo(
    () =>
      canister.info?.settings.controllers.includes(BACKEND_CANISTER_ID) !==
      true,
    [canister],
  );

  const hasControllers = useMemo(
    () =>
      isNotNil(canister.info) && canister.info.settings.controllers.length > 0,
    [canister],
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Canister</CardTitle>
          <CardDescription>{canister.principal}</CardDescription>
        </CardHeader>

        <CardContent>
          <CardTitle>Controllers</CardTitle>

          {hasControllers ? (
            <ItemGroup className="mt-3">
              <ItemSeparator />
              {canister.info?.settings.controllers.map(
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
          ) : (
            <CardDescription>
              There are no controllers for this canister!
            </CardDescription>
          )}
        </CardContent>

        {!isMissingController && (
          <CardFooter className="flex justify-center">
            <AddControllerForm canisterId={canister.principal} />
          </CardFooter>
        )}
      </Card>

      {isMissingController && (
        <AddMissingCanisterControllerCta canisterId={canister.principal} />
      )}
    </>
  );
};
