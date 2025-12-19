import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Globe, Users, BarChart, Code2, Database } from "lucide-react";

export default function Landing() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Navigation */}
            <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        <Globe className="h-6 w-6 text-primary" />
                        <span>ShreeLimited</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/auth">
                            <Button>Login</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative px-6 lg:px-8 py-24 md:py-32 overflow-hidden">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
                            <span className="text-primary">ShreeLimited</span> - Your Career Partner
                        </h1>
                        <p className="mt-4 text-2xl font-semibold text-foreground/80">
                            Trust us. Job in <span className="text-primary underline decoration-wavy underline-offset-4">15 Days</span>.
                        </p>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                            We have the best marketing team working alongside top-tier developers.
                            Our focus is getting you placed.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link to="/auth">
                                <Button size="lg" className="gap-2 text-lg px-8">
                                    Start Your Journey <ArrowRight className="h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Abstract Background Element */}
                <div className="absolute -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 right-0 opacity-20">
                    <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
                </div>
            </section>

            {/* Services Section */}
            <section id="services" className="py-24 bg-muted/50">
                <div className="container px-6">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Expertise</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Specialized Staffing & Consulting Solutions
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Code2 className="h-10 w-10 text-primary" />,
                                title: "Full Stack Developers",
                                description: "Expert developers proficient in modern stacks (MERN, Java Spring, .NET) ready to build scalable applications."
                            },
                            {
                                icon: <Database className="h-10 w-10 text-primary" />,
                                title: "Oracle Consultants",
                                description: "Seasoned Oracle experts to optimize your database, enforce security, and streamline operations."
                            },
                            {
                                icon: <Users className="h-10 w-10 text-primary" />,
                                title: "Best Marketing Team",
                                description: "Our dedicated marketing professionals ensure your profile reaches the right recruiters instantly."
                            }
                        ].map((service, index) => (
                            <div key={index} className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                                <div className="mb-6">{service.icon}</div>
                                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features/Trust Section */}
            <section className="py-24">
                <div className="container px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight mb-6">Why ShreeLimited?</h2>
                            <div className="space-y-6">
                                {[
                                    "Guaranteed placement focus within 15 days",
                                    "Dedicated mentorship for technical interviews",
                                    "Resume polishing by industry experts",
                                    "24/7 Support for on-job assistance"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <CheckCircle2 className="h-6 w-6 text-primary" />
                                        </div>
                                        <span className="text-lg font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative h-96 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center border border-dashed border-primary/30 overflow-hidden">
                            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
                            <div className="text-center p-8">
                                <p className="text-4xl font-bold text-primary mb-2">100%</p>
                                <p className="text-xl text-foreground font-medium">Commitment</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-12 bg-background">
                <div className="container flex flex-col md:flex-row justify-between items-center gap-6 text-muted-foreground text-sm">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                        <Globe className="h-5 w-5" />
                        <span>ShreeLimited</span>
                    </div>
                    <p>&copy; 2024 ShreeLimited. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
