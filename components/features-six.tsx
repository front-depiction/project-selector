import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CalendarCheck, Check, Copy, GripVertical, Link2, Sparkles, Target } from 'lucide-react'

export default function FeaturesSection() {
    return (
        <section>
            <div className="py-24">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div>
                        <h2 className="text-foreground max-w-2xl text-balance text-4xl font-semibold">Streamline project topic selection for your university</h2>
                    </div>
                    <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card
                            className="overflow-hidden p-6 bg-muted/50">
                            <Target className="text-primary size-5" />
                            <h3 className="text-foreground mt-5 text-lg font-semibold">Shareable Selection Links</h3>
                            <p className="text-muted-foreground mt-3 text-balance">Teachers generate a unique link for each selection period. Students join with one click - no codes needed.</p>

                            <ShareableLinkIllustration />
                        </Card>

                        <Card
                            className="group overflow-hidden px-6 pt-6 bg-muted/50">
                            <CalendarCheck className="text-primary size-5" />
                            <h3 className="text-foreground mt-5 text-lg font-semibold">Smart Topic Ranking</h3>
                            <p className="text-muted-foreground mt-3 text-balance">Students rank topics by preference. Real-time analytics show popularity and competition.</p>

                            <TopicRankingIllustration />
                        </Card>
                        <Card
                            className="group overflow-hidden px-6 pt-6 bg-muted/50">
                            <Sparkles className="text-primary size-5" />
                            <h3 className="text-foreground mt-5 text-lg font-semibold">Optimal Assignment Algorithm</h3>
                            <p className="text-muted-foreground mt-3 text-balance">Constraint-based optimization ensures fair distribution. Respects student preferences while balancing groups.</p>

                            <div className="mask-b-from-50 -mx-2 -mt-2 px-2 pt-2">
                                <AssignmentIllustration />
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}

const ShareableLinkIllustration = () => {
    return (
        <Card
            aria-hidden
            className="mt-9 aspect-video p-4">
            <div className="mb-3 flex items-center gap-2">
                <Link2 className="text-primary size-4" />
                <span className="text-sm font-semibold">Selection Period Link</span>
            </div>
            <div className="bg-foreground/5 mb-3 flex items-center gap-2 rounded-lg border p-2">
                <div className="text-muted-foreground flex-1 truncate text-xs font-mono">
                    topicmatch.app/join/abc123
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="size-6 shrink-0">
                    <Copy className="size-3" />
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <div className="bg-green-500/10 text-green-600 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium">
                    <Check className="size-3" />
                    <span>Copied!</span>
                </div>
                <span className="text-muted-foreground text-xs">Share with students</span>
            </div>
        </Card>
    )
}

const TopicRankingIllustration = () => {
    const topics = [
        { rank: 1, name: 'Neural Networks', color: 'bg-amber-500' },
        { rank: 2, name: 'Data Visualization', color: 'bg-zinc-400' },
        { rank: 3, name: 'API Design', color: 'bg-orange-700' },
    ]

    return (
        <div
            aria-hidden
            className="relative mt-6">
            <Card className="translate-y-4 p-3 transition-transform duration-200 ease-in-out group-hover:-translate-y-0">
                <div className="text-muted-foreground mb-2 text-xs font-medium">Your Rankings</div>
                <div className="space-y-2">
                    {topics.map((topic) => (
                        <div
                            key={topic.rank}
                            className="bg-foreground/5 flex items-center gap-2 rounded-lg p-2">
                            <GripVertical className="text-muted-foreground/50 size-3.5 shrink-0" />
                            <div className={`${topic.color} flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white`}>
                                {topic.rank}
                            </div>
                            <span className="truncate text-xs font-medium">{topic.name}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}

const AssignmentIllustration = () => {
    const assignments = [
        { student: 'Alice M.', topic: 'Neural Networks', color: 'bg-blue-500' },
        { student: 'Bob K.', topic: 'Data Visualization', color: 'bg-emerald-500' },
        { student: 'Carol T.', topic: 'API Design', color: 'bg-purple-500' },
    ]

    return (
        <Card
            aria-hidden
            className="mt-6 aspect-video translate-y-4 p-4 pb-6 transition-transform duration-200 group-hover:translate-y-0">
            <div className="mb-3 flex items-center gap-2">
                <Sparkles className="text-primary size-3.5" />
                <span className="text-xs font-semibold">Assignment Results</span>
            </div>
            <div className="space-y-2">
                {assignments.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2 text-xs">
                        <div className="bg-foreground/10 w-16 truncate rounded px-1.5 py-1 font-medium">
                            {item.student}
                        </div>
                        <svg className="text-muted-foreground/50 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <div className={`${item.color} flex-1 truncate rounded px-1.5 py-1 text-white`}>
                            {item.topic}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
