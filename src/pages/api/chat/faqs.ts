import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

// Types for the new database structure
type RoomTypePayload = {
  rooms: string[];
  buttonName: string;
};

type OptionDetail = {
  option: string;
  detail: string;
};

type OptionDetailsPayload = OptionDetail[];

type ReplyPayload = null | RoomTypePayload | OptionDetailsPayload;

interface FAQPayload {
  topic: string;
  reply_message: string;
  reply_format: 'message' | 'room_type' | 'option_details';
  reply_payload: ReplyPayload;
  created_by?: string; // UUID as string
  aliases?: string[];
  deleted_aliases?: string[];
  display_order?: number; // Added for drag & drop ordering
}

// Validation functions for different reply formats
const validatePayload = (format: string, payload: ReplyPayload): boolean => {
  switch (format) {
    case 'message':
      return payload === null;
    case 'room_type':
      return payload !== null && 
             'rooms' in payload &&
             Array.isArray(payload.rooms) && 
             payload.rooms.length > 0 && 
             typeof payload.buttonName === 'string';
    case 'option_details':
      return payload !== null && 
             Array.isArray(payload) && 
             payload.every(item => 
               typeof item.option === 'string' && 
               typeof item.detail === 'string'
             );
    default:
      return false;
  }
};

// Helper function to create embedding from topic only
const createTopicEmbedding = async (topic: string) => {
  const { createEmbedding } = await import('@/lib/embedding');
  return await createEmbedding(topic);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // GET /api/chat/faqs?id=xxx (Get specific FAQ)
      // GET /api/chat/faqs (Get all FAQs)

      // Get specific FAQ by ID
      if (id) {
        const { data: faq, error } = await supabase
          .from('chatbot_faqs')
          .select(`
            *,
            chatbot_faq_aliases(alias)
          `)
          .eq('id', id as string)
          .single();

        if (error) {
          console.error('Error fetching FAQ:', error);
          return res.status(404).json({ error: 'FAQ not found' });
        }

        // Transform aliases data
        const transformedFaq = {
          ...faq,
          aliases: faq.chatbot_faq_aliases?.map((a: { alias: string }) => a.alias) || []
        };
        delete transformedFaq.chatbot_faq_aliases;

        return res.status(200).json({ faq: transformedFaq });
      }

      // Get all FAQs ordered by display_order, then by created_at
      const { data: faqs, error } = await supabase
        .from('chatbot_faqs')
        .select(`
          *,
          chatbot_faq_aliases(alias)
        `)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching FAQs:', error);
        throw error;
      }

      // Transform aliases data for all FAQs
      const transformedFaqs = faqs?.map(faq => ({
        ...faq,
        aliases: faq.chatbot_faq_aliases?.map((a: { alias: string }) => a.alias) || []
      })) || [];

      transformedFaqs.forEach(faq => delete faq.chatbot_faq_aliases);

      res.status(200).json({ faqs: transformedFaqs });

    } catch (error) {
      console.error('Error in FAQ GET:', error);
      res.status(500).json({ 
        error: 'Failed to fetch FAQs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'POST') {
    try {
      // Create new FAQ entry
      const { 
        topic, 
        reply_message, 
        reply_format = 'message', 
        reply_payload = null,
        created_by,
        aliases = []
      }: FAQPayload = req.body;

      if (!topic || !reply_message) {
        return res.status(400).json({ error: 'Topic and reply_message are required' });
      }

      if (!validatePayload(reply_format, reply_payload)) {
        return res.status(400).json({ error: 'Invalid reply_format or reply_payload' });
      }

      console.log('Creating FAQ entry:', { topic, reply_message, reply_format, reply_payload, aliases, created_by });
      console.log('🔍 FAQ API Debug: created_by type =', typeof created_by, 'value =', created_by);

      // Check if it's a special message (greeting/fallback) that doesn't need embedding
      const isSpecialMessage = topic === '::greeting::' || topic === '::fallback::';

      if (isSpecialMessage) {
        // Insert without embedding for special messages
        const { data: faqEntry, error } = await supabase
          .from('chatbot_faqs')
          .insert([{ 
            topic, 
            reply_message,
            reply_format,
            reply_payload,
            created_by: created_by || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          console.error('Error creating special FAQ entry:', error);
          throw error;
        }

        console.log('Special FAQ entry created:', faqEntry);
        res.status(201).json({ 
          faq: faqEntry,
          success: true 
        });
      } else {
        // Create embedding from topic only
        const topic_embedding = await createTopicEmbedding(topic);
        
        console.log('Generated embedding length:', topic_embedding.length);

        // Use RPC function to insert FAQ with embedding
        const { data: faqEntry, error } = await supabase.rpc('insert_faq_with_embedding_v2', {
          p_topic: topic,
          p_reply_message: reply_message,
          p_topic_embedding: topic_embedding,
          p_reply_format: reply_format,
          p_reply_payload: reply_payload,
          p_created_by: created_by || null
        });

        if (error) {
          console.error('Error creating FAQ entry:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          throw error;
        }

        console.log('FAQ entry created:', faqEntry);

        // RPC function returns an array, get the first item
        const createdFAQ = Array.isArray(faqEntry) ? faqEntry[0] : faqEntry;
        
        if (!createdFAQ || !createdFAQ.id) {
          console.error('RPC function did not return valid FAQ with ID');
          throw new Error('RPC function did not return valid FAQ with ID');
        }

        // Insert aliases with their own embeddings if provided
        if (aliases.length > 0) {
          for (const alias of aliases) {
            if (alias.trim()) {
              try {
                // Create embedding for each alias
                const alias_embedding = await createTopicEmbedding(alias.trim());
                
                // Insert alias with its own embedding
                const { error: aliasError } = await supabase
                  .from('chatbot_faq_aliases')
                  .insert({
                    faq_id: createdFAQ.id,
                    alias: alias.trim(),
                    embedding: alias_embedding,
                    created_by: created_by || null
                  });

                if (aliasError) {
                  console.error('Error creating alias with embedding:', aliasError);
                }
              } catch (error) {
                console.error('Error creating embedding for alias:', alias, error);
              }
            }
          }
        }

        res.status(201).json({ 
          faq: createdFAQ,
          success: true 
        });
      }

    } catch (error) {
      console.error('Error in FAQ POST:', error);
      res.status(500).json({ 
        error: 'Failed to create FAQ entry',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'PUT') {
    try {
      // Update FAQ entry
      if (!id) {
        return res.status(400).json({ error: 'FAQ ID is required for update' });
      }

      const { 
        topic, 
        reply_message, 
        reply_format = 'message', 
        reply_payload = null,
        updated_by,
        aliases = [],
        deleted_aliases = [],
        display_order
      }: FAQPayload & { updated_by?: string } = req.body;

      if (!topic || !reply_message) {
        return res.status(400).json({ error: 'Topic and reply_message are required' });
      }

      if (!validatePayload(reply_format, reply_payload)) {
        return res.status(400).json({ error: 'Invalid reply_format or reply_payload' });
      }

      console.log('Updating FAQ entry:', { id, topic, reply_message, reply_format, reply_payload, aliases, deleted_aliases, updated_by });

      // Check if it's a special message (greeting/fallback) that doesn't need embedding
      const isSpecialMessage = topic === '::greeting::' || topic === '::fallback::';

      if (isSpecialMessage) {
        // Update without embedding for special messages
        type UpdateData = {
          topic: string;
          reply_message: string;
          reply_format: 'message' | 'room_type' | 'option_details';
          reply_payload: ReplyPayload;
          updated_at: string;
          updated_by?: string;
          display_order?: number;
        };
        const updateData: UpdateData = {
          topic,
          reply_message,
          reply_format,
          reply_payload,
          updated_at: new Date().toISOString(),
        };
        
        // Add updated_by if provided
        if (updated_by) {
          updateData.updated_by = updated_by;
        }
        
        // Only update display_order if provided and not a special message
        if (display_order !== undefined && !isSpecialMessage) {
          updateData.display_order = display_order;
        }
        
        const { data: updatedFaq, error } = await supabase
          .from('chatbot_faqs')
          .update(updateData)
          .eq('id', id as string)
          .select()
          .single();

        if (error) {
          console.error('Error updating special FAQ:', error);
          throw error;
        }

        console.log('Special FAQ entry updated:', updatedFaq);
        res.status(200).json({ 
          faq: updatedFaq,
          success: true 
        });
      } else {
        // Create embedding from topic only
        const topic_embedding = await createTopicEmbedding(topic);
        
        console.log('Generated embedding length for update:', topic_embedding.length);

        // Use RPC function to update FAQ with embedding
        const { data: updatedFaq, error } = await supabase.rpc('update_faq_with_embedding_v4', {
          p_display_order: display_order,
          p_id: id as string,
          p_reply_format: reply_format,
          p_reply_message: reply_message,
          p_reply_payload: reply_payload,
          p_topic: topic,
          p_topic_embedding: topic_embedding,
          p_updated_by: updated_by || null
        });

        if (error) {
          console.error('Error updating FAQ:', error);
          throw error;
        }

        console.log('FAQ entry updated:', updatedFaq);

        // RPC function returns an array, get the first item
        const createdFAQ = Array.isArray(updatedFaq) ? updatedFaq[0] : updatedFaq;
        
        if (!createdFAQ || !createdFAQ.id) {
          console.error('RPC function did not return valid FAQ with ID');
          throw new Error('RPC function did not return valid FAQ with ID');
        }

        // Delete aliases that are marked for deletion
        if (deleted_aliases.length > 0) {
          console.log('Deleting aliases:', deleted_aliases);
          const { error: deleteAliasError } = await supabase
            .from('chatbot_faq_aliases')
            .delete()
            .in('id', deleted_aliases);

          if (deleteAliasError) {
            console.error('Error deleting aliases:', deleteAliasError);
            throw deleteAliasError;
          }
        }

        // Upsert only NEW aliases to avoid recomputing embeddings and avoid losing existing
        // 1) Load existing aliases for this FAQ
        const { data: existingAliasesRows, error: selectAliasesError } = await supabase
          .from('chatbot_faq_aliases')
          .select('alias')
          .eq('faq_id', id as string);

        if (selectAliasesError) {
          console.error('Error selecting existing aliases:', selectAliasesError);
        }

        const existingAliasSet = new Set<string>((existingAliasesRows || []).map((r: { alias: string }) => r.alias.trim()));

        // 2) Insert only aliases that don't already exist
        if (aliases.length > 0) {
          for (const alias of aliases) {
            const trimmed = alias.trim();
            if (!trimmed) continue;
            if (existingAliasSet.has(trimmed)) continue; // skip duplicates
            try {
              const alias_embedding = await createTopicEmbedding(trimmed);
              const { error: aliasError } = await supabase
                .from('chatbot_faq_aliases')
                .insert({
                  faq_id: id as string,
                  alias: trimmed,
                  embedding: alias_embedding,
                  created_by: updated_by || null
                });

              if (aliasError) {
                console.error('Error creating alias with embedding:', aliasError);
              }
            } catch (error) {
              console.error('Error creating embedding for alias:', trimmed, error);
            }
          }
        }

        res.status(200).json({ 
          faq: createdFAQ,
          success: true 
        });
      }

    } catch (error) {
      console.error('Error updating FAQ:', error);
      res.status(500).json({ 
        error: 'Failed to update FAQ entry',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Delete FAQ entry
      if (!id) {
        return res.status(400).json({ error: 'FAQ ID is required for deletion' });
      }

      console.log('Deleting FAQ entry:', id);

      // Delete aliases first (foreign key constraint)
      const { error: aliasDeleteError } = await supabase
        .from('chatbot_faq_aliases')
        .delete()
        .eq('faq_id', id as string);

      if (aliasDeleteError) {
        console.error('Error deleting aliases:', aliasDeleteError);
        throw aliasDeleteError;
      }

      // Delete FAQ
      const { error } = await supabase
        .from('chatbot_faqs')
        .delete()
        .eq('id', id as string);

      if (error) {
        console.error('Error deleting FAQ:', error);
        throw error;
      }

      console.log('FAQ entry deleted:', id);

      res.status(200).json({ 
        message: 'FAQ entry deleted successfully',
        success: true 
      });

    } catch (error) {
      console.error('Error deleting FAQ:', error);
      res.status(500).json({ 
        error: 'Failed to delete FAQ entry',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}