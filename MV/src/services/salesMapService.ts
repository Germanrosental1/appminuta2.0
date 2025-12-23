import { supabase } from '@/lib/supabase';
import { SalesMapItem } from '@/types';

const TABLE_NAME = 'vista_buscador_propiedades';

export const salesMapService = {
  async getAll(): Promise<SalesMapItem[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*');

    if (error) {
      console.error('Error fetching sales map data:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string): Promise<SalesMapItem | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching sales map item with id ${id}:`, error);
      throw error;
    }

    return data;
  },

  async update(id: string, item: Partial<SalesMapItem>): Promise<SalesMapItem> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(item)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating sales map item with id ${id}:`, error);
      throw error;
    }

    return data;
  },

  async create(item: Omit<SalesMapItem, 'id'>): Promise<SalesMapItem> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([item])
      .select()
      .single();

    if (error) {
      console.error('Error creating sales map item:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting sales map item with id ${id}:`, error);
      throw error;
    }
  },

  async getByProject(proyecto: string): Promise<SalesMapItem[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('proyecto', proyecto);

    if (error) {
      console.error(`Error fetching sales map items for project ${proyecto}:`, error);
      throw error;
    }

    return data || [];
  }
};
