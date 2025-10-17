import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { faq_id } = req.query;
      if (!faq_id || typeof faq_id !== 'string') {
        return res.status(400).json({ error: 'faq_id is required' });
      }
      const { data, error } = await supabase
        .from('chatbot_faq_aliases')
        .select('id, alias, created_at')
        .eq('faq_id', faq_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ aliases: data || [] });
    }

    if (req.method === 'POST') {
      const { faq_id, aliases, created_by } = req.body as { faq_id?: string; aliases?: string[]; created_by?: string };
      console.log('POST /api/chat/aliases - received:', { faq_id, aliases, created_by, body: req.body });
      if (!faq_id || !Array.isArray(aliases)) {
        console.log('POST /api/chat/aliases - validation failed:', { faq_id, aliases, isArray: Array.isArray(aliases) });
        return res.status(400).json({ error: 'faq_id and aliases[] are required' });
      }
      const cleaned = aliases.map(a => (a || '').trim()).filter(Boolean);
      if (cleaned.length === 0) {
        return res.status(200).json({ inserted: [] });
      }

      const inserted: Array<{ id: string; alias: string }> = [];
      for (const alias of cleaned) {
        console.log('Creating alias:', alias, 'for FAQ ID:', faq_id);

        // Create embedding for the alias
        const { createEmbedding } = await import('@/lib/embedding');
        const embedding = await createEmbedding(alias);
        
        console.log('Generated embedding length for alias:', embedding.length);

        // Use RPC function to insert alias with embedding
        console.log('🔍 Debug: Calling RPC with created_by =', created_by);
        const { data: aliasEntry, error } = await supabase.rpc('insert_faq_alias_with_embedding', {
          p_faq_id: faq_id,
          p_alias: alias,
          p_embedding: embedding,
          p_created_by: created_by || null
        });

        if (error) {
          console.error('Error creating alias entry:', alias, error);
          throw error;
        }

        console.log('Alias entry created:', aliasEntry);
        inserted.push({ id: aliasEntry.id, alias: aliasEntry.alias });
      }

      return res.status(201).json({ inserted });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'alias id is required' });
      }
      const { error } = await supabase
        .from('chatbot_faq_aliases')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('aliases API error:', error);
    return res.status(500).json({
      error: 'Failed to process aliases request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


