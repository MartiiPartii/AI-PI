import {
  Activity,
  Brain,
  Clock,
  HeartPulse,
  Languages,
  Mic,
  MessageSquareText,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { CallButton } from "@/components/call-button";
import { Reveal } from "@/components/motion/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { getPhoneLine } from "@/lib/contact";

/** Shared content max-width / horizontal padding for every section. */
function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">{children}</div>;
}

const HERO_CHIPS = ["Безплатно", "Резултат веднага", "Обобщение чрез SMS"] as const;

const HOW_IT_WORKS = [
  {
    icon: Phone,
    title: "Обаждате се",
    body: "Набирате безплатния номер и асистент Ви посреща на български.",
  },
  {
    icon: Mic,
    title: "Казвате „аaa“",
    body: "След сигнала задържате спокоен звук „ааа“ за около пет секунди.",
  },
  {
    icon: Activity,
    title: "Анализ на гласа",
    body: "Изкуствен интелект измерва фини гласови биомаркери.",
  },
  {
    icon: MessageSquareText,
    title: "Получавате резултат",
    body: "Чувате го по време на разговора и в SMS.",
  },
] as const;

const EARLY_SIGNS = [
  "Треперене в покой",
  "По-тих или монотонен глас",
  "Скованост на движенията",
  "Дребен, ситен почерк",
  "Намалена мимика",
  "Промени в походката",
] as const;

const TRUST = [
  {
    icon: Brain,
    title: "Гласови биомаркери",
    body: "Обучен върху Oxford Parkinson's Disease Detection Dataset.",
  },
  {
    icon: ShieldCheck,
    title: "Поверителност",
    body: "Записът се използва само за анализа на гласа Ви.",
  },
  {
    icon: Languages,
    title: "На разбираем език",
    body: "Асистентът говори на български и спокойно обяснява.",
  },
] as const;

const FAQ = [
  {
    q: "Безплатно ли е обаждането?",
    a: "Да. Скринингът по телефона е напълно безплатен. Прилагат се само обичайните такси на Вашия оператор, ако има такива.",
  },
  {
    q: "Това диагноза ли е?",
    a: "Не. Това е предварителен скрининг, който може да подскаже повишен риск. Само лекар може да постави диагноза. При притеснение се консултирайте с невролог.",
  },
  {
    q: "Кой може да се обади?",
    a: "Всеки. Услугата е особено полезна за по-възрастни хора и за всеки, който е забелязал промени в гласа или движенията си.",
  },
  {
    q: "Какво се случва с моя глас и данни?",
    a: "Краткият гласов запис се използва, за да изчисли моделът Вашия риск. Резултатът може да се запази към профил само ако телефонният Ви номер е свързан с регистрация в сайта.",
  },
  {
    q: "Колко време отнема?",
    a: "Обикновено около минута. Нужно е само да задържите спокоен звук „ааа“ за няколко секунди.",
  },
] as const;

export default function LandingPage() {
  const { tel, display } = getPhoneLine();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <a href="#" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <HeartPulse className="size-5" aria-hidden />
              </span>
              <span className="text-lg">AI&#8209;PI</span>
            </a>
            <nav className="hidden items-center gap-9 text-sm font-medium text-muted-foreground md:flex">
              <a className="transition-colors hover:text-foreground" href="#how">
                Как работи
              </a>
              <a className="transition-colors hover:text-foreground" href="#parkinson">
                За Паркинсон
              </a>
              <a className="transition-colors hover:text-foreground" href="#about">
                За услугата
              </a>
              <a className="transition-colors hover:text-foreground" href="#faq">
                Въпроси
              </a>
            </nav>
            <CallButton size="sm" />
          </div>
        </Container>
      </header>

      <main>
        {/* Hero — one idea, centered and airy */}
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
            <div className="mx-auto max-w-3xl py-24 text-center sm:py-32">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground soft">
                  <span className="size-2 rounded-full bg-primary" aria-hidden />
                  Безплатно · На български · За една минута
                </span>
                <h1 className="mt-8 text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                  Чуйте какво Ви{" "}
                  <span className="text-primary">казва гласът Ви</span>
                </h1>
                <p className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  Безплатна телефонна проверка за ранен риск от Паркинсон. Обаждате
                  се, казвате „ааа“ и за минута получавате резултат.
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

                <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
                  {HERO_CHIPS.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground/80 soft"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <p className="mt-8 text-sm text-muted-foreground">
                  Предварителен скрининг, а не медицинска диагноза.
                </p>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section id="how" className="py-24 sm:py-28">
          <Container>
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Как работи
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Четири стъпки — от обаждането до резултата.
                </p>
              </div>
            </Reveal>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, i) => (
                <Reveal key={step.title} delayMs={i * 90}>
                  <Card className="h-full rounded-3xl border-0 bg-card soft">
                    <CardContent className="p-7">
                      <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                        <step.icon className="size-6" aria-hidden />
                      </span>
                      <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Parkinson awareness — one idea, signs as soft chips */}
        <section id="parkinson" className="py-24 sm:py-28">
          <Container>
            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  Информираност
                </span>
                <h2 className="mt-7 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Гласът се променя пръв
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
                  Паркинсон се развива постепенно и ранните признаци лесно остават
                  незабелязани. Често гласът е сред първите засегнати — става по-тих,
                  по-монотонен или леко трепери.
                </p>
              </div>
            </Reveal>

            <Reveal delayMs={100}>
              <div className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-3">
                {EARLY_SIGNS.map((sign) => (
                  <span
                    key={sign}
                    className="rounded-full bg-card px-5 py-2.5 text-sm font-medium text-foreground/80 soft"
                  >
                    {sign}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delayMs={160}>
              <div className="mx-auto mt-12 flex max-w-2xl items-start gap-4 rounded-3xl bg-primary/[0.06] p-7 text-left">
                <Clock className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
                <p className="text-base leading-relaxed text-foreground/90">
                  <span className="font-semibold">Ранното разпознаване има значение.</span>{" "}
                  Колкото по-рано се обърне внимание на симптомите, толкова по-навреме
                  лекар може да предложи проследяване и грижа.
                </p>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* About / trust */}
        <section id="about" className="py-24 sm:py-28">
          <Container>
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Защо да се доверите
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Точност, разбираемост и поверителност.
                </p>
              </div>
            </Reveal>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {TRUST.map((item, i) => (
                <Reveal key={item.title} delayMs={i * 90}>
                  <Card className="h-full rounded-3xl border-0 bg-card soft">
                    <CardContent className="p-8 text-center">
                      <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                        <item.icon className="size-6" aria-hidden />
                      </span>
                      <h3 className="mt-6 text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 sm:py-28">
          <Container>
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Често задавани въпроси
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Не намирате отговор? Просто се обадете — асистентът ще Ви обясни.
                </p>
              </div>
            </Reveal>
            <Reveal delayMs={100}>
              <div className="mx-auto mt-12 max-w-2xl rounded-3xl bg-card p-3 soft sm:p-5">
                <Accordion type="single" collapsible className="w-full">
                  {FAQ.map((item) => (
                    <AccordionItem
                      key={item.q}
                      value={item.q}
                      className="border-border/60 px-3 last:border-b-0"
                    >
                      <AccordionTrigger className="text-left text-base font-semibold">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* Final CTA — light, soft, rounded */}
        <section className="px-5 pb-24 sm:px-8 sm:pb-28">
          <Container>
            <Reveal>
              <div className="relative overflow-hidden rounded-[2.5rem] bg-primary/[0.08] px-6 py-20 text-center sm:py-24">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-full"
                  aria-hidden
                  style={{
                    background:
                      "radial-gradient(50% 70% at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%)",
                  }}
                />
                <div className="relative">
                  <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                    Една минута може да има значение
                  </h2>
                  <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                    Обадете се безплатно и проверете гласа си днес.
                  </p>
                  <div className="mt-10 flex flex-col items-center gap-5">
                    <a
                      href={`tel:${tel}`}
                      className="inline-flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground transition-colors hover:text-primary sm:text-4xl"
                    >
                      <Phone className="size-7 text-primary" aria-hidden />
                      {display}
                    </a>
                    <CallButton size="lg" className="h-14 px-8 text-lg soft" />
                  </div>
                </div>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-14">
        <Container>
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <HeartPulse className="size-5" aria-hidden />
              </span>
              <span className="text-lg">AI&#8209;PI</span>
            </div>
            <a
              href={`tel:${tel}`}
              className="text-base font-semibold text-foreground transition-colors hover:text-primary"
            >
              {display}
            </a>
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              Важно: AI&#8209;PI предоставя предварителен скрининг и не поставя
              медицинска диагноза. Резултатът не замества консултация с лекар. При
              съмнение за заболяване потърсете специалист (невролог).
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
