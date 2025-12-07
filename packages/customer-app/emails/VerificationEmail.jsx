import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components';

export default function VerificationEmail({ name, otp, expiresInMinutes = 10 }) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Welcome to Simnetiq!</Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>
              Hi {name || 'there'},
            </Text>
            <Text style={paragraph}>
              Thank you for signing up! Please verify your email address to complete your registration.
            </Text>

            <Section style={otpContainer}>
              <Text style={otpLabel}>Your Verification Code:</Text>
              <Text style={otpCode}>{otp}</Text>
            </Section>

            <Text style={paragraph}>
              This code will expire in <strong>{expiresInMinutes} minutes</strong>.
            </Text>

            <Text style={paragraph}>
              If you didn't create an account with Simnetiq, please ignore this email.
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © 2025 Simnetiq. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#4975D4',
  textAlign: 'center',
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '0 24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#172C2E',
};

const otpContainer = {
  backgroundColor: '#f4f4f5',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center',
};

const otpLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 8px 0',
};

const otpCode = {
  fontSize: '36px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  color: '#4975D4',
  margin: '0',
  fontFamily: 'monospace',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '0 24px',
};

const footerText = {
  fontSize: '12px',
  color: '#8898aa',
  textAlign: 'center',
  margin: '4px 0',
};

