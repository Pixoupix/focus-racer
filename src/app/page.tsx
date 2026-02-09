import Link from "next/link";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16">
          <div className="absolute inset-0 gradient-bg opacity-95" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
          <div className="relative container mx-auto px-4 py-24 md:py-32 lg:py-40">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in">
                Vos photos de course,{" "}
                <span className="text-orange-light">en un clic</span>
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 animate-fade-in animation-delay-100">
                Retrouvez instantanement vos photos grace a la reconnaissance
                automatique des numeros de dossard. Marathon, trail, triathlon
                et plus encore.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-200">
                <Link href="/runner">
                  <Button
                    size="lg"
                    className="bg-white text-navy hover:bg-white/90 shadow-glass-lg text-base px-8 py-6 transition-all duration-200"
                  >
                    Trouver mes photos
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 text-base px-8 py-6 transition-all duration-200"
                  >
                    Espace photographe
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          {/* Wave separator */}
          <div className="relative -mb-1">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path
                d="M0 40L48 35C96 30 192 20 288 22C384 24 480 38 576 44C672 50 768 48 864 42C960 36 1056 26 1152 24C1248 22 1344 28 1392 31L1440 34V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0V40Z"
                className="fill-[#fff7f3]"
              />
            </svg>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 md:py-28 gradient-bg-subtle">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
                Comment ca marche ?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Trois etapes simples pour retrouver toutes vos photos de course
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Upload",
                  desc: "Le photographe televerse ses photos de la course sur la plateforme",
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  ),
                },
                {
                  step: "2",
                  title: "Analyse IA",
                  desc: "Notre systeme detecte automatiquement les numeros de dossard et les visages",
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                  ),
                },
                {
                  step: "3",
                  title: "Recherche",
                  desc: "Les coureurs retrouvent et achetent leurs photos instantanement",
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  ),
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className={`glass-card rounded-2xl p-8 text-center hover:shadow-glass-lg transition-all duration-300 animate-slide-up animation-delay-${(i + 1) * 100}`}
                >
                  <div className="w-16 h-16 rounded-2xl gradient-orange flex items-center justify-center mx-auto mb-6 text-white shadow-orange">
                    {item.icon}
                  </div>
                  <div className="text-xs font-bold text-orange uppercase tracking-widest mb-2">
                    Etape {item.step}
                  </div>
                  <h3 className="font-bold text-xl text-navy mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Une plateforme complete pour les coureurs, photographes et organisateurs
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                {
                  title: "Recherche par dossard",
                  desc: "Trouvez vos photos en entrant simplement votre numero de dossard",
                  icon: "#",
                },
                {
                  title: "Reconnaissance faciale",
                  desc: "Retrouvez vos photos grace a un selfie, meme sans dossard visible",
                  icon: "AI",
                },
                {
                  title: "Galeries personnalisees",
                  desc: "Chaque evenement dispose de sa galerie avec le branding de l'organisateur",
                  icon: "G",
                },
                {
                  title: "Paiement securise",
                  desc: "Achetez vos photos en toute securite via Stripe",
                  icon: "S",
                },
                {
                  title: "Mode Live",
                  desc: "Upload en temps reel pendant la course avec detection instantanee",
                  icon: "L",
                },
                {
                  title: "Marketplace",
                  desc: "Connectez photographes et organisateurs pour vos evenements",
                  icon: "M",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="glass-card rounded-2xl p-6 hover:shadow-glass-lg transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-orange group-hover:text-white transition-all duration-300">
                    <span className="font-bold text-orange group-hover:text-white transition-colors duration-300">
                      {feature.icon}
                    </span>
                  </div>
                  <h3 className="font-semibold text-navy text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who is it for */}
        <section className="py-20 md:py-28 gradient-bg-subtle">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
                Pour qui ?
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  title: "Coureurs",
                  desc: "Retrouvez toutes vos photos de course en quelques secondes. Recherchez par dossard, par nom ou meme par selfie.",
                  cta: "Trouver mes photos",
                  href: "/runner",
                  accent: true,
                },
                {
                  title: "Photographes",
                  desc: "Uploadez vos photos, laissez l'IA les trier et vendez-les automatiquement. Gerez votre activite simplement.",
                  cta: "Espace photographe",
                  href: "/login",
                  accent: false,
                },
                {
                  title: "Organisateurs",
                  desc: "Offrez une experience photo complete a vos coureurs. Trouvez des photographes via la marketplace.",
                  cta: "Creer un compte Pro",
                  href: "/register",
                  accent: false,
                },
              ].map((persona) => (
                <div
                  key={persona.title}
                  className={`rounded-2xl p-8 transition-all duration-300 hover:shadow-glass-lg ${
                    persona.accent
                      ? "gradient-orange text-white shadow-orange-lg"
                      : "glass-card"
                  }`}
                >
                  <h3 className={`text-2xl font-bold mb-4 ${persona.accent ? "text-white" : "text-navy"}`}>
                    {persona.title}
                  </h3>
                  <p className={`mb-8 leading-relaxed ${persona.accent ? "text-white/85" : "text-muted-foreground"}`}>
                    {persona.desc}
                  </p>
                  <Link href={persona.href}>
                    <Button
                      className={
                        persona.accent
                          ? "bg-white text-orange hover:bg-white/90 w-full"
                          : "bg-orange hover:bg-orange-dark text-white shadow-orange w-full"
                      }
                      size="lg"
                    >
                      {persona.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
                Ils nous font confiance
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  quote: "J'ai retrouve toutes mes photos du marathon en moins de 30 secondes. Incroyable !",
                  name: "Sophie M.",
                  role: "Coureuse",
                },
                {
                  quote: "Le tri automatique par dossard me fait gagner des heures de travail apres chaque course.",
                  name: "Thomas L.",
                  role: "Photographe sportif",
                },
                {
                  quote: "La marketplace nous a permis de trouver facilement des photographes pour notre evenement.",
                  name: "Claire D.",
                  role: "Organisatrice",
                },
              ].map((testimonial) => (
                <div key={testimonial.name} className="glass-card rounded-2xl p-8">
                  <div className="flex gap-1 text-orange mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-navy/80 mb-6 leading-relaxed italic">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-navy">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto rounded-3xl gradient-bg overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
              <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Pret a retrouver vos photos ?
                </h2>
                <p className="text-white/75 text-lg max-w-xl mx-auto mb-10">
                  Rejoignez des milliers de coureurs et photographes qui utilisent Focus Racer
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/runner">
                    <Button
                      size="lg"
                      className="bg-white text-navy hover:bg-white/90 shadow-glass-lg text-base px-8 py-6"
                    >
                      Rechercher mes photos
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 text-base px-8 py-6"
                    >
                      Creer un compte
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
