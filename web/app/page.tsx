import { Activity, HeartPulse, Mic, Phone } from "lucide-react";
import { CallButton } from "@/components/call-button";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { getPhoneLine } from "@/lib/contact";

/** Shared content max-width / horizontal padding for every section. */
function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">{children}</div>;
}

const STEPS = [
  { icon: Phone, title: "Обаждате се", body: "На безплатния номер." },
  { icon: Mic, title: "Казвате „аaa“", body: "Спокойно, за пет секунди." },
  { icon: Activity, title: "Получавате резултат", body: "За минута, и в SMS." },
] as const;

export default function LandingPage() {
  const { tel, display } = getPhoneLine();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <a href="#" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <HeartPulse className="size-5" aria-hidden />
              </span>
              <span className="text-lg">AI&#8209;PI</span>
            </a>
            <div className="flex items-center gap-4">
              <a
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Вход
              </a>
              <CallButton size="sm" />
            </div>
          </div>
        </Container>
      </header>

      <main>
        {/* Hero — the one essential idea: call this number */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
            aria-hidden
            style={{
              background:
                "radial-gradient(50% 60% at 50% -5%, hsl(var(--primary) / 0.14), transparent 70%)",
            }}
          />
          <Container>
            <div className="mx-auto max-w-2xl py-28 text-center sm:py-36">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground soft">
                  <span className="size-2 rounded-full bg-primary" aria-hidden />
                  Безплатно · За една минута
                </span>
                <h1 className="mt-8 text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                  Чуйте какво Ви{" "}
                  <span className="text-primary">казва гласът Ви</span>
                </h1>
                <p className="mx-auto mt-7 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  Безплатна телефонна проверка за ранен риск от Паркинсон.
                </p>

                <div className="mt-10 flex flex-col items-center gap-5">
                  <CallButton size="lg" className="h-14 px-8 text-lg soft" />
                  <a
                    href={`tel:${tel}`}
                    className="text-2xl font-bold tracking-tight text-foreground transition-colors hover:text-primary"
                  >
                    {display}
                  </a>
                </div>

                <p className="mt-8 text-sm text-muted-foreground">
                  Предварителен скрининг, а не медицинска диагноза.
                </p>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* Three steps */}
        <section className="pb-28">
          <Container>
            <div className="grid gap-5 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delayMs={i * 90}>
                  <Card className="h-full rounded-3xl border-0 bg-card soft">
                    <CardContent className="p-7 text-center">
                      <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                        <step.icon className="size-6" aria-hidden />
                      </span>
                      <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      </main>

      {/* Footer — minimal, with the required safety note */}
      <footer className="py-16">
        <Container>
          <div className="flex flex-col items-center gap-5 text-center">
            <a
              href={`tel:${tel}`}
              className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
            >
              {display}
            </a>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              AI&#8209;PI предоставя предварителен скрининг и не поставя медицинска
              диагноза. При съмнение се консултирайте с лекар.
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
