'use client'

export default function FooterSection() {
    return (
        <footer className="bg-muted py-16">
            <div className="mx-auto max-w-5xl px-6">
                <span className="text-muted-foreground block text-center text-sm">© {new Date().getFullYear()} Project Selector. All rights reserved.</span>
            </div>
        </footer>
    )
}
