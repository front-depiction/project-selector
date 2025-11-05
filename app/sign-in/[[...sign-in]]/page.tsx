import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Student Portal
          </h1>
          <p className="text-muted-foreground mt-2">
            Sign in to access project topic selection
          </p>
        </div>
        <SignIn 
          forceRedirectUrl="/"
          signUpUrl="/sign-up"
          appearance={{
            elements: {
              formButtonPrimary: 
                "bg-primary hover:bg-primary/90 text-sm normal-case",
            },
          }}
        />
      </div>
    </div>
  )
}

