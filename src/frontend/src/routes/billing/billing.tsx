import { Container } from '@/components/layout/container';
import { H1 } from '@/components/typography/h1';
import { Card, CardContent } from '@/components/ui/card';
import type { FC } from 'react';

const Billing: FC = () => {
  return (
    <Container>
      <H1>Billing</H1>

      <Card className="mt-6">
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Invoices, payment methods, and usage-based charges across all your
            organizations will appear here. Coming soon.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Billing;
