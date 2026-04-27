/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your SkryveAI account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to SkryveAI 👋</Heading>
        <Text style={text}>
          Hi there, thanks for signing up for{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>!
          You're one click away from finding clients with AI-powered cold outreach.
        </Text>
        <Text style={text}>
          Please confirm your email ({recipient}) to activate your account:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm my account
        </Button>
        <Text style={footer}>
          If you didn't sign up for SkryveAI, you can safely ignore this email.
          <br /><br />
          — The SkryveAI Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, Segoe UI, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: 'hsl(217, 91%, 55%)', textDecoration: 'none' }
const button = {
  backgroundColor: 'hsl(217, 91%, 55%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#64748b', margin: '32px 0 0', lineHeight: '1.5' }
