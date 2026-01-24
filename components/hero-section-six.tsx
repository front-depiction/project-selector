'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, CheckCircle2, GripVertical, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LoginButton } from '@/components/auth/LoginButton'

export default function HeroSection() {
    return (
        <section className="py-20">
            <div className="relative z-10 mx-auto w-full max-w-2xl px-6 lg:px-0">
                <div>
                    <TopicMatchLogo />
                </div>
                <div className="relative">
                    <h1 className="mt-16 max-w-xl text-balance text-5xl font-medium">Smart Project Selection for Educators</h1>

                    <p className="text-muted-foreground mb-6 mt-4 text-balance text-xl">Teachers share a link, students rank their preferred topics, and our algorithm optimally assigns everyone to projects they love.</p>

                    <div className="flex flex-col items-center gap-2 *:w-full sm:flex-row sm:*:w-auto">
                        <LoginButton variant="default" />
                        <Button
                            asChild
                            variant="ghost">
                            <Link href="#features">
                                <span className="text-nowrap">Learn More</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="relative mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-100 via-yellow-50 to-amber-100 dark:from-orange-950/30 dark:via-yellow-950/20 dark:to-amber-950/30 md:mt-16">
                    <div className="bg-background rounded-(--radius) relative m-4 overflow-hidden border border-transparent shadow-xl shadow-black/15 ring-1 ring-black/10 sm:m-8 md:m-12">
                        <AppMockup />
                    </div>
                </div>

            </div>
        </section>
    )
}

const TopicMatchLogo = ({ className }: { className?: string }) => (
    <div
        aria-hidden
        className={cn('border-background bg-linear-to-b rounded-(--radius) relative flex size-9 translate-y-0.5 items-center justify-center border from-yellow-300 to-orange-600 shadow-lg shadow-black/20 ring-1 ring-black/10', className)}>
        <BookOpen className="mask-b-from-25% size-6 fill-white stroke-white drop-shadow-sm" />
        <BookOpen className="absolute inset-0 m-auto size-6 fill-white stroke-white opacity-65 drop-shadow-sm" />
        <div className="z-1 h-4.5 absolute inset-2 m-auto w-px translate-y-px rounded-full bg-black/10"></div>
    </div>
)

// App mockup showing the topic selection interface
const AppMockup = () => {
    const topics = [
        { id: 1, title: 'Machine Learning Pipeline', rank: 1, popularity: 85, popularityDisplay: '85%*' },
        { id: 2, title: 'Web Security Analysis', rank: 2, popularity: 72, popularityDisplay: '72%*' },
        { id: 3, title: 'Mobile App Development', rank: 3, popularity: 68, popularityDisplay: '68%*' },
    ]

    const students = [
        { name: 'Alice M.', status: 'complete', assignment: 'Machine Learning Pipeline' },
        { name: 'Bob K.', status: 'complete', assignment: 'Web Security Analysis' },
        { name: 'Carol S.', status: 'pending', assignment: null },
    ]

    return (
        <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex items-center gap-2">
                    <TopicMatchLogo className="size-7" />
                    <span className="font-semibold text-sm">Project Selector</span>
                </div>
                <Badge variant="default" className="bg-green-600 text-white text-xs">
                    Selection Open
                </Badge>
            </div>

            {/* Two column layout on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left: Topic Rankings */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Trophy className="size-4 text-amber-500" />
                        <h3 className="text-sm font-medium">Your Rankings</h3>
                    </div>
                    <div className="space-y-2">
                        {topics.map((topic) => (
                            <div
                                key={topic.id}
                                className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                                <GripVertical className="size-4 text-muted-foreground/50" />
                                <div className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                    {topic.rank}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{topic.title}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Progress value={topic.popularity} className="h-1 w-12" />
                                        <span className="text-[10px] text-muted-foreground">{topic.popularityDisplay} popular</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Student Progress */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="size-4 text-blue-500" />
                        <h3 className="text-sm font-medium">Student Progress</h3>
                    </div>
                    <div className="space-y-2">
                        {students.map((student, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                            >
                                <div className="flex items-center justify-center size-6 rounded-full bg-muted text-xs font-medium">
                                    {student.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium">{student.name}</p>
                                    {student.assignment ? (
                                        <p className="text-[10px] text-muted-foreground truncate">{student.assignment}</p>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground">Ranking in progress...</p>
                                    )}
                                </div>
                                {student.status === 'complete' ? (
                                    <CheckCircle2 className="size-4 text-green-500" />
                                ) : (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        In Progress
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer action */}
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">3* of 3* students submitted</p>
                <Button size="sm" className="h-7 text-xs">
                    Run Assignment
                </Button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 text-center">*Data shown is for demonstration purposes only</p>
        </div>
    )
}
