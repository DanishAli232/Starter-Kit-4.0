import { executeGraphQLBackend } from "@/lib/graphql-server";
import {
  INSERT_AI_MESSAGE,
  GET_CONVERSATION_MESSAGES,
} from "./ai-messages-graphql";

export interface CreateAIMessageInput {
  conversationId: string;
  userId?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  providerResponseId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const aiMessagesService = {
  async createMessage(input: CreateAIMessageInput) {
    const {
      conversationId,
      userId,
      role,
      content,
      providerResponseId,
      metadata,
    } = input;

    // Prefer GraphQL; fall back to Supabase admin if GraphQL is unavailable
    try {
      await executeGraphQLBackend(INSERT_AI_MESSAGE, {
        objects: [
          {
            conversation_id: conversationId,
            user_id: userId ?? null,
            role,
            content,
            provider_response_id: providerResponseId ?? null,
            metadata: metadata ?? null,
          },
        ],
      });
    } catch (error) {
      console.error(
        "Error inserting ai_messages via GraphQL, falling back to Supabase:",
        error
      );
    
     
    }
  },

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(conversationId: string) {
    // Prefer GraphQL; fall back to Supabase admin if GraphQL is unavailable
    try {
      const response = await executeGraphQLBackend(GET_CONVERSATION_MESSAGES, {
        filter: { conversation_id: { eq: conversationId } },
        limit: 1000,
        offset: 0,
      });

      const edges = response?.ai_messagesCollection?.edges ?? [];

      return edges.map(
        (edge: {
          node: {
            id: string;
            role: "user" | "assistant" | "system";
            content: string;
            created_at: string;
            provider_response_id: string | null;
            metadata: Record<string, unknown> | null;
          };
        }) => ({
          id: edge.node.id,
          role: edge.node.role as "user" | "assistant" | "system",
          created_at: edge.node.created_at,
          parts: [
            {
              type: "text",
              text: edge.node.content,
            },
          ],
          metadata: edge.node.provider_response_id ? { responseId: edge.node.provider_response_id } : undefined,
        })
      );
    } catch (error) {
      console.error(
        "Error fetching ai_messages via GraphQL, falling back to Supabase:",
        error
      );


    }
  },
};
