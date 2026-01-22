'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { LoginButton } from '@/components/auth/LoginButton'

export default function StatsSection() {
    return (
        <section>
            <div className="bg-muted py-12">
                <div className="mx-auto max-w-5xl px-6">
                    <h2 className="text-foreground max-w-lg text-balance text-3xl font-semibold lg:text-4xl">
                        Ready to Transform Your Project Assignment Process?
                    </h2>
                    <p className="mt-4 text-lg">Join educators who've eliminated the chaos of manual topic assignment. Get started in minutes.</p>
                    <div className="mt-8 flex gap-3">
                        <LoginButton className="pr-2" />
                        <Button
                            asChild
                            variant="outline"
                            className="pl-2.5">
                            <Link href="#features">
                                <Calendar
                                    className="!size-3.5 opacity-50"
                                    strokeWidth={2.5}
                                />
                                See How It Works
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
