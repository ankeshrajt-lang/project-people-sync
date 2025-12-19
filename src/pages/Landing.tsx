import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Globe, Users, Code2, Database, Briefcase } from "lucide-react";

export default function Landing() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            {/* Ambient Background Gradients */}
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-500/10 via-background to-background"></div>

            {/* Navigation */}
            <nav className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="bg-gradient-to-tr from-primary to-blue-600 p-2 rounded-lg">
                            <Globe className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                            ShreeLimited
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/auth">
                            <Button variant="default" className="font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                Login / Sign Up
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="container px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8 animate-fade-in relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                Now Hiring for 2025
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                                Your Dream Career <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-purple-600 animate-gradient-x">
                                    Starts Here.
                                </span>
                            </h1>
                            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                                Join elite development teams and land your target role in <span className="text-foreground font-semibold underline decoration-primary decoration-4 underline-offset-4 decoration-wavy">15 Days</span>.
                                We guarantee placement with mentorship.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Link to="/auth">
                                    <Button size="lg" className="h-14 px-8 text-lg gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-transform duration-200">
                                        Start Your Journey <ArrowRight className="h-5 w-5" />
                                    </Button>
                                </Link>

                            </div>


                        </div>

                        {/* Hero Image */}
                        <div className="relative lg:h-[600px] animate-fade-in [animation-delay:200ms]">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-purple-500/30 rounded-[2rem] blur-3xl -z-10"></div>
                            <div className="relative h-full w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black/5">
                                <img
                                    src="/images/hero-team.png"
                                    alt="Modern Development Team"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                />
                                {/* Floating Card */}
                                <div className="absolute bottom-6 left-6 right-6 bg-background/80 backdrop-blur-xl p-4 rounded-xl border border-white/20 shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-green-500/20 text-green-500 rounded-lg">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">100% Placement Rate</p>
                                            <p className="text-sm text-muted-foreground">For our premium cohort graduates</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Enterprise Partnership Section */}
            <section className="py-24 bg-muted/30 relative border-y border-border/50">
                <div className="container px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
                                Enterprise Implementation Partner
                            </h2>
                            <p className="text-xl text-muted-foreground leading-relaxed">
                                We don't just find talent; we deliver results. As a trusted implementation partner for <span className="text-foreground font-semibold">Fortune 500</span> companies, we manage end-to-end delivery of large-scale digital transformations.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="p-4 bg-background rounded-xl border shadow-sm">
                                    <h3 className="text-3xl font-bold text-primary mb-1">50+</h3>
                                    <p className="text-sm font-medium text-muted-foreground">Projects Delivered</p>
                                </div>
                                <div className="p-4 bg-background rounded-xl border shadow-sm">
                                    <h3 className="text-3xl font-bold text-blue-500 mb-1">Top 50</h3>
                                    <p className="text-sm font-medium text-muted-foreground">Tech Clients</p>
                                </div>
                                <div className="p-4 bg-background rounded-xl border shadow-sm">
                                    <h3 className="text-3xl font-bold text-purple-500 mb-1">$5M+</h3>
                                    <p className="text-sm font-medium text-muted-foreground">Value Created</p>
                                </div>
                                <div className="p-4 bg-background rounded-xl border shadow-sm">
                                    <h3 className="text-3xl font-bold text-green-500 mb-1">24/7</h3>
                                    <p className="text-sm font-medium text-muted-foreground">Global Support</p>
                                </div>
                            </div>

                            <ul className="space-y-3 pt-4">
                                {["Strategic Consulting", "Cloud Migration", "AI/ML Integration", "Cybersecurity Audits"].map((item) => (
                                    <li key={item} className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-2xl blur-2xl -z-10 group-hover:bg-gradient-to-tr group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all duration-500"></div>
                            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-black/50 backdrop-blur-sm">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                                <img
                                    src="/images/projects-dashboard.png"
                                    alt="Global Project Dashboard"
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-green-500 font-mono text-sm">SYSTEM ACTIVE</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Global Operations Center</h3>
                                    <p className="text-white/70 text-sm">Monitoring deployment across 12 countries in real-time.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="py-24">
                <div className="container px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Code2 className="h-8 w-8 text-blue-500" />,
                                title: "Full Stack Development",
                                desc: "End-to-end application development using modern frameworks."
                            },
                            {
                                icon: <Database className="h-8 w-8 text-purple-500" />,
                                title: "Oracle Consulting",
                                desc: "Enterprise database solutions and optimization strategies."
                            },
                            {
                                icon: <Briefcase className="h-8 w-8 text-green-500" />,
                                title: "Strategic Placement",
                                desc: "Connecting talent with top-tier opportunities worldwide."
                            }
                        ].map((item, i) => (
                            <div key={i} className="p-8 rounded-2xl bg-gradient-to-b from-muted/50 to-background border hover:border-primary/50 transition-colors">
                                <div className="mb-6 p-4 bg-background rounded-xl inline-block shadow-sm border">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                <p className="text-muted-foreground">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 -z-10"></div>
                <div className="container px-6 text-center">
                    <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Career?</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                        Join thousands of developers who found their dream job through ShreeLimited.
                    </p>
                    <Link to="/auth">
                        <Button size="lg" className="h-16 px-10 text-xl shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
                            Get Hired Now
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-12 bg-background/50 backdrop-blur-sm">
                <div className="container flex flex-col md:flex-row justify-between items-center gap-6 text-muted-foreground text-sm px-6">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                        <Globe className="h-5 w-5" />
                        <span>ShreeLimited</span>
                    </div>
                    <p>&copy; 2024 ShreeLimited. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
