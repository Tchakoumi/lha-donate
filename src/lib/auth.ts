import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { elasticsearchPlugin } from "./auth-elasticsearch-plugin";
import { initializeElasticsearch } from "./elasticsearch";
import { prisma } from "./prisma";

// Initialize Elasticsearch with a delay to ensure service readiness
setTimeout(() => {
  initializeElasticsearch().catch(console.error);
}, 5000);

export const auth = betterAuth({
  baseURL: process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://donate.letshelp.ong'
    : 'http://localhost:3000',
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Enforce email verification
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  cookies: {
    sessionToken: {
      name: "better-auth.session_token",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"]
    }),
    elasticsearchPlugin(),
  ],
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      console.log(`📧 Sending email verification to ${user.email}`);
      console.log(`🔗 Verification URL: ${url}`);

      // Create custom verification URL pointing to your page
      const customUrl = `${process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000'}/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
      console.log(`🔗 Custom Verification URL: ${customUrl}`);

      const { sendEmail } = await import('./email');

      await sendEmail({
        to: user.email,
        subject: 'Verify your email address - LHA Donate',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: #A50000; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">LHA Donate</h1>
              <p style="margin: 5px 0 0 0;">Let's Help Association</p>
            </div>
            <div style="padding: 30px 20px;">
              <h2 style="color: #333;">Verify your email address</h2>
              <p style="color: #666; line-height: 1.6;">
                Welcome to LHA Donate! To complete your account setup and start using our platform,
                please verify your email address by clicking the button below.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${customUrl}"
                   style="background: #A50000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, you can copy and paste this link into your browser:
                <br>
                <a href="${customUrl}" style="color: #A50000;">${customUrl}</a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you didn't create an account with LHA Donate, you can safely ignore this email.
              </p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>© 2025 Let's Help Association. All rights reserved.</p>
            </div>
          </div>
        `,
      });
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    disabled: false,
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.NODE_ENV === 'production' ? '.letshelp.ong' : undefined,
    },
    generateId: () => {
      // Use cryptographically secure ID generation
      return crypto.randomUUID();
    },
  },
  trustedOrigins: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL].filter(Boolean)
    : ["http://localhost:3000"],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;