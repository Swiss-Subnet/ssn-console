import { Container } from '@/components/layout/container';
import { Header } from '@/components/layout/header';
import { ThemeProvider } from '@/components/theme-provider';
import { H1 } from '@/components/typography/h1';

function App() {
  return (
    <ThemeProvider>
      <main className="flex w-full flex-col">
        <Header />

        <Container>
          <H1>Swiss Subnet Console</H1>
        </Container>
      </main>
    </ThemeProvider>
  );
}

export default App;
