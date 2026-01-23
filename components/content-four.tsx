export default function ContentSection() {
    return (
        <section>
            <div className="py-24">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="@container mx-auto max-w-2xl">
                        <div>
                            <h2 className="text-foreground text-4xl font-semibold">From Chaos to Clarity</h2>
                            <p className="text-muted-foreground mb-12 mt-4 text-xl">Streamline your project assignment process. Create selection periods, share links with students, and let our algorithm handle the optimal distribution.</p>
                        </div>

                        <div className="@sm:grid-cols-2 @2xl:grid-cols-3 my-12 grid gap-6">
                            <div className="space-y-2">
                                <span className="mb-4 block text-3xl">📋</span>
                                <h3 className="text-xl font-medium">Create Selection Periods</h3>
                                <p className="text-muted-foreground">Set up topics, dates, and constraints in minutes.</p>
                            </div>
                            <div className="space-y-2">
                                <span className="mb-4 block text-3xl">🔗</span>
                                <h3 className="text-xl font-medium">Share & Collect Rankings</h3>
                                <p className="text-muted-foreground">Students rank preferences via a simple link.</p>
                            </div>
                            <div className="space-y-2">
                                <span className="mb-4 block text-3xl">⚡</span>
                                <h3 className="text-xl font-medium">Auto-Assign Optimally</h3>
                                <p className="text-muted-foreground">Our algorithm handles the hard work.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
