import { Client } from '@elastic/elasticsearch';

// Create Elasticsearch client compatible with ES 8.x
export const esClient = new Client({
  node: process.env.ELASTIC_URL || 'http://elasticsearch:9200',
  auth: process.env.ELASTIC_USERNAME && process.env.ELASTIC_PASSWORD ? {
    username: process.env.ELASTIC_USERNAME,
    password: process.env.ELASTIC_PASSWORD,
  } : undefined,
  // For development, ignore SSL certificate issues
  tls: {
    rejectUnauthorized: false
  },
  // Simplified configuration for better compatibility
  requestTimeout: 30000,
  sniffOnStart: false,
  sniffOnConnectionFault: false
});

// Index names
export const INDICES = {
  USERS: 'lha_users',
  DONORS: 'lha_donors',
  CAMPAIGNS: 'lha_campaigns',
  DONATIONS: 'lha_donations',
} as const;

// User document interface for Elasticsearch
export interface UserDocument {
  id: string;
  email: string;
  name?: string;
  role: string;                    // Better Auth role (admin/user)
  organizationalRole: string;      // Your organizational role (SUPER_ADMIN/USER/etc)
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Initialize Elasticsearch indices with retry logic
export async function initializeElasticsearch(retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 Attempting to connect to Elasticsearch at ${process.env.ELASTIC_URL} (attempt ${attempt}/${retries})...`);

      // Check if Elasticsearch is reachable with a longer timeout
      await esClient.ping({}, { requestTimeout: 10000 });
      console.log('✅ Elasticsearch connected successfully');

      // Create users index if it doesn't exist
      const userIndexExists = await esClient.indices.exists({
        index: INDICES.USERS
      });

      if (!userIndexExists) {
      await esClient.indices.create({
        index: INDICES.USERS,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            email: {
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            name: {
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            role: { type: 'keyword' },
            organizationalRole: { type: 'keyword' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        },
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0, // For development
          analysis: {
            analyzer: {
              custom_text_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding']
              }
            }
          }
        }
      });
        console.log(`✅ Created index: ${INDICES.USERS}`);
      }

      console.log('🎉 Elasticsearch initialization completed successfully');
      return; // Success, exit retry loop

    } catch (error) {
      console.error(`❌ Elasticsearch initialization failed (attempt ${attempt}/${retries}):`, error instanceof Error ? error.message : String(error));

      if (attempt < retries) {
        console.log(`⏳ Waiting 5 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('❌ All Elasticsearch connection attempts failed. App will continue without ES.');
        // Don't throw error to prevent app from crashing if ES is down
      }
    }
  }
}

// Index a user document
export async function indexUser(user: UserDocument) {
  try {
    await esClient.index({
      index: INDICES.USERS,
      id: user.id,
      document: user,
      refresh: 'wait_for' // Ensure document is immediately searchable
    });
    console.log(`✅ Indexed user: ${user.email}`);
  } catch (error) {
    console.error('❌ Failed to index user:', error);
  }
}

// Update a user document
export async function updateUser(userId: string, updates: Partial<UserDocument>) {
  try {
    await esClient.update({
      index: INDICES.USERS,
      id: userId,
      doc: updates,
      doc_as_upsert: true,
      refresh: 'wait_for'
    });
    console.log(`✅ Updated user in ES: ${userId}`);
  } catch (error) {
    console.error('❌ Failed to update user in ES:', error);
  }
}

// Delete a user document
export async function deleteUser(userId: string) {
  try {
    await esClient.delete({
      index: INDICES.USERS,
      id: userId,
      refresh: 'wait_for'
    });
    console.log(`✅ Deleted user from ES: ${userId}`);
  } catch (error) {
    console.error('❌ Failed to delete user from ES:', error);
  }
}

// Search users
export interface UserSearchQuery {
  query?: string;
  role?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  from?: number;
  size?: number;
}

export async function searchUsers(searchQuery: UserSearchQuery) {
  try {
    const { query, role, isActive, emailVerified, from = 0, size = 10 } = searchQuery;

    // Build Elasticsearch query
    const esQuery = {
      bool: {
        must: [] as Array<Record<string, unknown>>,
        filter: [] as Array<Record<string, unknown>>
      }
    };

    // Text search across name and email
    if (query) {
      esQuery.bool.must.push({
        multi_match: {
          query,
          fields: ['name^2', 'email^1.5'], // Boost name matches
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'and'
        }
      });
    } else {
      esQuery.bool.must.push({ match_all: {} });
    }

    // Filter by role
    if (role) {
      esQuery.bool.filter.push({ term: { role } });
    }

    // Filter by active status
    if (typeof isActive === 'boolean') {
      esQuery.bool.filter.push({ term: { isActive } });
    }

    // Filter by email verification
    if (typeof emailVerified === 'boolean') {
      esQuery.bool.filter.push({ term: { emailVerified } });
    }

    const response = await esClient.search({
      index: INDICES.USERS,
      query: esQuery,
      from,
      size,
      sort: [
        { updatedAt: { order: 'desc' } }
      ],
      highlight: {
        fields: {
          name: {},
          email: {}
        }
      }
    });

    const hits = response.hits;
    const users = hits.hits.map((hit) => ({
      ...(hit._source as UserDocument),
      _score: hit._score,
      _highlight: hit.highlight
    }));

    return {
      users,
      total: typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0,
      took: response.took
    };

  } catch (error) {
    console.error('❌ User search failed:', error);
    throw error;
  }
}