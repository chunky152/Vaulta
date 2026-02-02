import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Search,
  Calendar,
  CreditCard,
  Key,
  Shield,
  Clock,
  Smartphone,
  MapPin,
  CheckCircle,
} from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Find Your Space',
    description:
      'Search for storage units near you using our GPS-powered search. Filter by size, price, amenities, and availability to find the perfect fit.',
    color: 'bg-blue-500',
  },
  {
    number: '02',
    icon: Calendar,
    title: 'Book Instantly',
    description:
      'Choose your dates and book online in seconds. No phone calls, no paperwork. Flexible booking by the hour, day, or month.',
    color: 'bg-green-500',
  },
  {
    number: '03',
    icon: CreditCard,
    title: 'Pay Securely',
    description:
      'Complete your payment through our secure checkout. We accept all major credit cards and mobile payment options.',
    color: 'bg-purple-500',
  },
  {
    number: '04',
    icon: Key,
    title: 'Access Your Unit',
    description:
      'Receive your unique access code instantly. Use it to enter the facility and your storage unit anytime, 24/7.',
    color: 'bg-orange-500',
  },
];

const features = [
  {
    icon: Shield,
    title: '24/7 Security',
    description: 'All facilities feature round-the-clock surveillance and secure access controls.',
  },
  {
    icon: Clock,
    title: 'Flexible Terms',
    description: 'No long-term commitments. Extend or cancel your booking anytime.',
  },
  {
    icon: Smartphone,
    title: 'Digital Access',
    description: 'Access your unit with a QR code on your phone. No physical keys needed.',
  },
  {
    icon: MapPin,
    title: 'Prime Locations',
    description: 'Storage facilities conveniently located throughout the city.',
  },
];

const faqs = [
  {
    question: 'How do I access my storage unit?',
    answer:
      'After booking, you\'ll receive a unique access code via email and in your dashboard. Use this code at the facility entrance and your unit door.',
  },
  {
    question: 'Can I change my booking dates?',
    answer:
      'Yes! You can extend your booking anytime through your dashboard. For early checkout, contact our support team for a prorated refund.',
  },
  {
    question: 'What sizes are available?',
    answer:
      'We offer units ranging from small lockers (perfect for documents) to large units that can fit furniture and vehicles. Use our size guide to find your perfect fit.',
  },
  {
    question: 'Is my stuff insured?',
    answer:
      'Basic coverage is included with every booking. For valuable items, we recommend adding our premium protection plan during checkout.',
  },
  {
    question: 'What can I store?',
    answer:
      'Most household and business items are welcome. Prohibited items include hazardous materials, perishables, and illegal goods. See our full policy for details.',
  },
];

export function HowItWorksPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 lg:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              How Unbur Works
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Renting storage has never been easier. Find, book, and access your
              storage unit in just a few simple steps.
            </p>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-muted" />
                )}
                <Card className="relative h-full">
                  <CardContent className="pt-6">
                    {/* Step number badge */}
                    <div
                      className={`${step.color} text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mb-4`}
                    >
                      {step.number}
                    </div>
                    {/* Icon */}
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <step.icon className="h-6 w-6 text-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Unbur?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We've reimagined storage to be simple, secure, and accessible.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Got questions? We've got answers.
              </p>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-2">{faq.question}</h3>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Find the perfect storage space near you in minutes.
          </p>
          <div className="flex justify-center">
            <Link to="/search">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                <MapPin className="mr-2 h-5 w-5" />
                Find Storage Near Me
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
