'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'

export default function FAQs() {
    const faqItems = [
        {
            id: 'item-1',
            question: 'How do students access the selection period?',
            answer: 'Teachers share a unique link. Students click the link, enter their student ID, and start ranking topics. No account creation needed.',
        },
        {
            id: 'item-2',
            question: 'How does the assignment algorithm work?',
            answer: 'Our constraint-based optimization considers student rankings, balanced distribution requirements, and any custom rules you set. It finds the best possible assignment for everyone.',
        },
        {
            id: 'item-3',
            question: 'Can I customize the selection criteria?',
            answer: 'Yes! You can add survey questions, set balance criteria for groups, specify prerequisites, and configure ranking weights.',
        },
        {
            id: 'item-4',
            question: 'What happens after the selection period closes?',
            answer: 'Run the assignment algorithm with one click. Students can then view their assigned topic through the same link.',
        },
        {
            id: 'item-5',
            question: 'Is student data secure?',
            answer: 'Absolutely. We follow GDPR guidelines and you control what student information is collected. Names are optional - you can use anonymous IDs.',
        },
    ]

    return (
        <section className="bg-muted py-16 md:py-24">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                <div>
                    <h2 className="text-foreground text-4xl font-semibold">Frequently Asked Questions</h2>
                    <p className="text-muted-foreground mt-4 text-balance text-lg">Discover quick and comprehensive answers to common questions about our platform, services, and features.</p>
                </div>

                <div className="mt-12">
                    <Accordion
                        type="single"
                        collapsible
                        className="bg-card ring-foreground/5 rounded-(--radius) w-full border border-transparent px-8 py-3 shadow ring-1">
                        {faqItems.map((item) => (
                            <AccordionItem
                                key={item.id}
                                value={item.id}
                                className="border-dotted">
                                <AccordionTrigger className="cursor-pointer text-base hover:no-underline">{item.question}</AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-base">{item.answer}</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    <p className="text-muted-foreground mt-6">
                        Still have questions? Contact our{' '}
                        <Link
                            href="#"
                            className="text-primary font-medium hover:underline">
                            support team
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}
