import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // Get specific context by ID
      if (id) {
        const { data: context, error } = await supabase
          .from('chatbot_contexts')
          .select('*')
          .eq('id', id as string)
          .single();

        if (error) {
          console.error('Error fetching context:', error);
          return res.status(404).json({ error: 'Context not found' });
        }

        return res.status(200).json({ context });
      }

      // Get all contexts
      const { data: contexts, error } = await supabase
        .from('chatbot_contexts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contexts:', error);
        throw error;
      }

      res.status(200).json({ contexts: contexts || [] });

    } catch (error) {
      console.error('Error in context GET:', error);
      res.status(500).json({ 
        error: 'Failed to fetch contexts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'POST') {
    try {
      console.log('🔵 Context API: POST request received');
      
      // Create new context entry
      const { content, created_by } = req.body;
      console.log('🔵 Context API: Request body:', { content, created_by });
      console.log('🔍 API Debug: created_by type =', typeof created_by, 'value =', created_by);

      if (!content) {
        console.log('❌ Context API: Content is required');
        return res.status(400).json({ error: 'Content is required' });
      }

      console.log('🔵 Context API: Creating context entry:', { content, created_by });

      // Admin creates context with created_by
      console.log('🔵 Context API: Creating context (admin operation)');

      // Insert context with created_by (admin operation)
        const insertData: { content: string; created_by?: string } = { content };
        console.log('🔍 API Debug: insertData before adding created_by:', insertData);
        if (created_by) {
          insertData.created_by = created_by;
          console.log('🔍 API Debug: Added created_by to insertData:', insertData);
        } else {
          console.log('🔍 API Debug: created_by is falsy, not adding to insertData');
        }

      const { data: contextEntry, error } = await supabase
        .from('chatbot_contexts')
        .insert(insertData)
        .select()
        .single();

      console.log('🔵 Context API: Insert result:', { contextEntry, error });

      if (error) {
        console.error('❌ Context API: Error creating context entry:', error);
        console.error('❌ Context API: Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Context API: Context entry created successfully:', contextEntry);

      if (!contextEntry || !contextEntry.id) {
        console.error('❌ Context API: Failed to create context with ID');
        throw new Error('Failed to create context with ID');
      }

      console.log('✅ Context API: Sending success response');
      res.status(201).json({ 
        context: contextEntry,
        success: true 
      });

    } catch (error) {
      console.error('❌ Context API: Error in context POST:', error);
      res.status(500).json({ 
        error: 'Failed to create context entry',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'PUT') {
    try {
      // Update context entry
      if (!id) {
        return res.status(400).json({ error: 'Context ID is required for update' });
      }

      const { content, updated_by } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      console.log('Updating context entry:', { id, content, updated_by });

      // Admin updates context with updated_by
      console.log('🔵 Context API: Updating context (admin operation)');

      const updateData: { content: string; updated_at: string; updated_by?: string } = {
        content,
        updated_at: new Date().toISOString()
      };
      if (updated_by) {
        updateData.updated_by = updated_by;
      }

      const { data: updatedContext, error } = await supabase
        .from('chatbot_contexts')
        .update(updateData)
        .eq('id', id as string)
        .select()
        .single();

      if (error) {
        console.error('Error updating context:', error);
        throw error;
      }

      res.status(200).json({ 
        context: updatedContext,
        success: true 
      });

    } catch (error) {
      console.error('Error in context PUT:', error);
      res.status(500).json({ 
        error: 'Failed to update context',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      if (!id) {
        return res.status(400).json({ error: 'Context ID is required for deletion' });
      }

      const { error } = await supabase
        .from('chatbot_contexts')
        .delete()
        .eq('id', id as string);

      if (error) {
        console.error('Error deleting context:', error);
        throw error;
      }

      res.status(200).json({ 
        success: true,
        message: 'Context deleted successfully'
      });

    } catch (error) {
      console.error('Error in context DELETE:', error);
      res.status(500).json({ 
        error: 'Failed to delete context',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
