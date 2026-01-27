import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    console.log('Received document-processed webhook:', JSON.stringify(body));

    const {
      document_id,
      extracted_data,
      status,
      error_message,
      confidence,
      dolar_rate,
      missing_fields,
      raw_output
    } = body;

    if (!document_id) {
      console.error('Missing document_id');
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the document with the processed data
    const updateData: Record<string, any> = {
      processed_at: new Date().toISOString(),
    };

    // Set status - default to 'ListoParaRevision' if extracted_data is provided
    if (status) {
      updateData.status = status;
    } else if (extracted_data) {
      updateData.status = 'ListoParaRevision';
    } else if (error_message) {
      updateData.status = 'Error';
    }

    // Set extracted data if provided, merging metadata
    if (extracted_data) {
      updateData.extracted_data = {
        ...extracted_data,
        confidence,
        dolar_rate,
        missing_fields
      };
    } else if (raw_output) {
      // If no valid JSON was extracted but we have raw output (e.g. error parsing), save it
      updateData.extracted_data = { raw_output };
    }

    // Set error message if provided
    if (error_message) {
      updateData.error_message = error_message;
    }

    console.log('Updating document:', document_id, 'with:', JSON.stringify(updateData));

    const { data, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', document_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Document updated successfully:', data.id);

    return new Response(
      JSON.stringify({
        success: true,
        document_id: data.id,
        status: data.status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in document-processed function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
