import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
} from '@react-email/components';

export default function PasswordResetEmail({ name, resetLink }) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Reset Your Password</Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>
              Hi {name || 'there'},
            </Text>
            <Text style={paragraph}>
              We received a request to reset your password for your Simnetiq account. Click the button below to create a new password:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetLink}>
                Reset Password
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>
              {resetLink}
            </Text>

            <Text style={paragraph}>
              This link will expire in <strong>1 hour</strong> for security reasons.
            </Text>

            <Text style={warningText}>
              If you didn't request a password reset, please ignore this email.
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

const buttonContainer = {
  textAlign: 'center',
  margin: '32px 0',
};

const button = {
  backgroundColor: '#4975D4',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '12px 32px',
};

const linkText = {
  fontSize: '14px',
  color: '#4975D4',
  wordBreak: 'break-all',
  backgroundColor: '#f4f4f5',
  padding: '12px',
  borderRadius: '4px',
};

const warningText = {
  fontSize: '14px',
  color: '#6b7280',
  marginTop: '24px',
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

