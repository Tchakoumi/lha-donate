import { BetterAuthPlugin, User } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { indexUser, updateUser, UserDocument } from "./elasticsearch";

export const elasticsearchPlugin = (): BetterAuthPlugin => {
  return {
    id: "elasticsearch-indexing",
    hooks: {
      after: [
        {
          matcher: (context) => context.path === "/sign-up/email",
          handler: createAuthMiddleware(async (ctx) => {
            console.log(
              "🔍 Sign-up hook triggered with Better Auth middleware"
            );

            try {
              const newUser = ctx.context.returned as { user: User };
              if (newUser && newUser.user) {
                console.log("✅ New user found:", {
                  userId: newUser.user.id,
                  userEmail: newUser.user.email,
                  userName: newUser.user.name,
                  emailVerified: newUser.user.emailVerified,
                  createdAt: newUser.user.createdAt,
                });

                // Check if this is the first user and assign admin role accordingly
                const { prisma } = await import("./prisma");

                // Count total users to determine if this is the first user
                const userCount = await prisma.user.count();
                const isFirstUser = userCount === 1; // Since user was just created

                // Set roles: Better Auth role (string) and organizational role (enum)
                const betterAuthRole = isFirstUser ? "admin" : "user";
                const orgRole = isFirstUser ? "SUPER_ADMIN" : "USER";

                console.log(
                  `👑 Setting roles for ${isFirstUser ? "first" : "subsequent"} user:`,
                  newUser.user.email
                );
                console.log(`   Better Auth role: ${betterAuthRole}`);
                console.log(`   Organizational role: ${orgRole}`);

                // Update both role types
                const updatedUser = await prisma.user.update({
                  where: { id: newUser.user.id },
                  data: {
                    role: betterAuthRole, // Better Auth role (admin/user)
                    organizationalRole: orgRole, // Your custom organizational role
                  },
                });

                if (isFirstUser) {
                  console.log(
                    "🚀 First user created - admin privileges granted"
                  );
                }

                console.log(
                  "🔍 Indexing new user after signup:",
                  updatedUser.email
                );

                // Create user document for Elasticsearch
                const userDoc: UserDocument = {
                  id: updatedUser.id,
                  email: updatedUser.email,
                  name: updatedUser.name || undefined,
                  role: updatedUser.role,
                  organizationalRole: updatedUser.organizationalRole,
                  isActive: updatedUser.isActive,
                  emailVerified: updatedUser.emailVerified,
                  createdAt: updatedUser.createdAt.toISOString(),
                  updatedAt: updatedUser.updatedAt.toISOString(),
                };

                // Index user in Elasticsearch
                await indexUser(userDoc);
                console.log("✅ User successfully indexed and role updated");
              } else {
                console.log("⚠️ No user found in context");
              }
            } catch (error) {
              console.error("❌ Error in Better Auth hook:", error);
            }
          }),
        },
        {
          // Hook into email verification
          matcher: (context) => context.path === "/verify-email",
          handler: async (context) => {
            // Wrap everything in a setTimeout to run after Better Auth completes
            setTimeout(async () => {
              console.log("🔍 Email verification hook triggered (delayed)");

              try {
                // Try to get user from newSession first
                let userData = context.context?.newSession?.user;
                
                if (!userData) {
                  console.log("⚠️ No user in newSession, trying to extract from token");
                  
                  // If no session, try to extract email from token and find user in DB
                  const { prisma } = await import("./prisma");
                  
                  // Get token from context query (safer than request.url)
                  const token = context.query?.token;
                  
                  console.log("🔍 Token found:", !!token);
                  
                  if (token && typeof token === 'string') {
                    try {
                      // Use Better Auth's built-in token verification instead of manual decoding
                      const { auth } = await import("./auth");
                      const verification = await prisma.verification.findFirst({
                        where: {
                          value: token,
                          expiresAt: {
                            gt: new Date()
                          }
                        }
                      });
                      
                      if (verification) {
                        // Extract email from verification identifier
                        const email = verification.identifier;
                        console.log("🔍 Found valid verification for email:", email);
                        
                        // Find user in database
                        const user = await prisma.user.findUnique({
                          where: { email: email }
                        });
                        
                        if (user) {
                          userData = user;
                          console.log("✅ Found user from verification:", user.email);
                        } else {
                          console.log("⚠️ User not found in database for email:", email);
                        }
                      } else {
                        console.log("⚠️ Invalid or expired verification token");
                      }
                    } catch (tokenError) {
                      console.log("⚠️ Could not verify token:", tokenError);
                    }
                  } else {
                    console.log("⚠️ No valid token found");
                  }
                } else {
                  console.log("✅ Found user in newSession:", userData.email);
                }

                if (userData) {
                  console.log("🔍 Updating user index after email verification:", userData.email);

                  await updateUser(userData.id, {
                    emailVerified: true,
                    updatedAt: new Date().toISOString(),
                  });

                  console.log("✅ User email verification indexed successfully");
                } else {
                  console.log("⚠️ No verified user data found anywhere");
                }
              } catch (error) {
                console.error("❌ Error in email verification hook:", error);
              }
            }, 100); // Small delay to let Better Auth finish

            // Return immediately to not interfere with Better Auth's response
            return;
          },
        },
        // Note: User update hook removed due to Better Auth API compatibility issues
        // Manual indexing can be implemented when user update endpoints are created
      ],
    },
  };
};
