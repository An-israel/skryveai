/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your SkryveAI verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm it's you</Heading>
        <Text style={text}>Use this code to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request it, you can safely ignore this email.
          <br /><br />— The SkryveAI Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, Segoe UI, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: 'JetBrains Mono, Courier, monospace', fontSize: '28px',
  fontWeight: 'bold' as const, color: 'hsl(217, 91%, 55%)',
  letterSpacing: '4px', margin: '0 0 30px',
}
const footer = { fontSize: '13px', color: '#64748b', margin: '32px 0 0', lineHeight: '1.5' }
