/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You've been invited 🎉</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>.
          Accept the invite below to create your account.
        </Text>
        <Button style={button} href={confirmationUrl}>Accept invitation</Button>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
          <br /><br />— The SkryveAI Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, Segoe UI, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: 'hsl(217, 91%, 55%)', textDecoration: 'none' }
const button = {
  backgroundColor: 'hsl(217, 91%, 55%)', color: '#ffffff', fontSize: '15px',
  fontWeight: '600' as const, borderRadius: '8px', padding: '12px 24px',
  textDecoration: 'none', display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#64748b', margin: '32px 0 0', lineHeight: '1.5' }
